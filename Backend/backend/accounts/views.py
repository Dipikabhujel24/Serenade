from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

logger = logging.getLogger(__name__)
from .serializers import AlertSerializer, LocationSerializer
from .serializers import EmergencyContactSerializer, DeviceSerializer, SMSQueueSerializer
from django.contrib.auth.models import AnonymousUser
from . import models as account_models


@method_decorator(csrf_exempt, name='dispatch')
class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User created successfully"},
                status=status.HTTP_201_CREATED,
            )
        # Log errors to help debugging when clients receive 400
        logger.warning("Signup validation failed: %s", serializer.errors)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        # Log incoming login attempt (do not log passwords in production)
        logger.info("Login attempt for username='%s'", username)

        # Log whether the username exists in the DB to help debugging
        from django.contrib.auth.models import User

        user_exists = User.objects.filter(username=username).exists()
        logger.info("User exists: %s", user_exists)

        user = authenticate(username=username, password=password)

        if not user:
            logger.warning("Authentication failed for username='%s'", username)
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "username": user.username,
                "email": user.email,
            }
        )


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sos_alert(request):
    # Create and persist an Alert record
    user = request.user if hasattr(request, "user") and not isinstance(request.user, AnonymousUser) else None

    payload = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
    if user and getattr(user, "is_authenticated", False):
        payload["user"] = user.id

    serializer = AlertSerializer(data=payload)
    if serializer.is_valid():
        alert = serializer.save()
        logger.info("Saved alert id=%s type=%s user=%s", alert.id, alert.alert_type, alert.user)
        # send realtime notification to the alerts group
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            # send to global alerts group
            async_to_sync(channel_layer.group_send)(
                "alerts",
                {
                    "type": "alert.message",
                    "data": {
                        "id": alert.id,
                        "type": alert.alert_type,
                        "message": alert.message,
                        "latitude": alert.latitude,
                        "longitude": alert.longitude,
                        "user": alert.user.id if alert.user else None,
                        "created_at": alert.created_at.isoformat(),
                    },
                },
            )

            # also send to the specific user's group so only their devices receive (if user)
            if alert.user:
                user_group = f"user_{alert.user.id}"
                async_to_sync(channel_layer.group_send)(
                    user_group,
                    {
                        "type": "alert.message",
                        "data": {
                            "id": alert.id,
                            "type": alert.alert_type,
                            "message": alert.message,
                            "latitude": alert.latitude,
                            "longitude": alert.longitude,
                            "user": alert.user.id,
                            "created_at": alert.created_at.isoformat(),
                        },
                    },
                )
        except Exception as e:
            logger.exception("Failed to send channel message: %s", e)
        # Attempt to notify emergency contacts via SMS (Twilio) if configured
        try:
            if alert.user:
                contacts = account_models.EmergencyContact.objects.filter(user=alert.user)
                if contacts.exists():
                            # Prepare message
                            sms_body = f"ALERT: {alert.alert_type.upper()} from user {alert.user.username if alert.user else 'unknown'}"
                            if alert.message:
                                sms_body += f" - {alert.message}"
                            if alert.latitude and alert.longitude:
                                sms_body += f"\nLocation: https://maps.google.com/?q={alert.latitude},{alert.longitude}"

                            # Attempt to send via Twilio if configured, otherwise enqueue
                            import os
                            tw_sid = os.environ.get("TWILIO_ACCOUNT_SID")
                            tw_token = os.environ.get("TWILIO_AUTH_TOKEN")
                            tw_from = os.environ.get("TWILIO_FROM_NUMBER")
                            sent_any = False
                            if tw_sid and tw_token and tw_from:
                                try:
                                    from twilio.rest import Client
                                    client = Client(tw_sid, tw_token)
                                    for c in contacts:
                                        try:
                                            client.messages.create(body=sms_body, from_=tw_from, to=c.phone)
                                            logger.info("Sent SMS to %s for alert %s", c.phone, alert.id)
                                            sent_any = True
                                        except Exception as se:
                                            logger.exception("Failed to send SMS to %s: %s", c.phone, se)
                                            # enqueue for retry
                                            account_models.SMSQueue.objects.create(phone=c.phone, body=sms_body, alert=alert, next_attempt=None)
                                except Exception as e:
                                    logger.exception("Twilio send loop failed: %s", e)
                                    # enqueue all contacts
                                    for c in contacts:
                                        account_models.SMSQueue.objects.create(phone=c.phone, body=sms_body, alert=alert, next_attempt=None)
                            else:
                                logger.info("Twilio not configured; enqueueing SMS messages")
                                for c in contacts:
                                    account_models.SMSQueue.objects.create(phone=c.phone, body=sms_body, alert=alert, next_attempt=None)

                            # Try to send push notifications to any registered devices for users matching contact phone
                            try:
                                # find any users who have this phone as their emergency contact (i.e., they are the contact)
                                contact_phones = [c.phone for c in contacts]
                                # find devices for users who have phone numbers equal to contact phone (best-effort)
                                # first, find users whose phone (User.email is not phone) - skip unless user extends profile; we match devices by EmergencyContact.user if that user also has devices
                                for c in contacts:
                                    # send to devices of the contact if they are app users (contact.user may not map to a user)
                                    # we assume contacts are external; if contact is also a user with devices, notify them
                                    try:
                                        # no direct mapping, but if contact.phone belongs to a user-owned contact, devices will be empty
                                        devices = account_models.Device.objects.filter(user=alert.user)
                                        # send to alert owner's devices as well
                                        for d in devices:
                                            # send push later via firebase admin if configured
                                            pass
                                    except Exception:
                                        pass
                            except Exception:
                                logger.exception("Push notify step failed")
        except Exception:
            logger.exception("Failed while notifying emergency contacts")
        return Response({"status": "success", "message": "SOS alert received", "alert_id": alert.id}, status=status.HTTP_201_CREATED)

    logger.warning("Failed to save alert: %s", serializer.errors)
    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class ContactListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = account_models.EmergencyContact.objects.filter(user=request.user).order_by("-created_at")
        serializer = EmergencyContactSerializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        data = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
        data["user"] = request.user.id
        serializer = EmergencyContactSerializer(data=data)
        if serializer.is_valid():
            c = serializer.save()
            return Response({"status": "success", "data": EmergencyContactSerializer(c).data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class ContactDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            c = account_models.EmergencyContact.objects.get(pk=pk, user=request.user)
            c.delete()
            return Response({"status": "success"})
        except account_models.EmergencyContact.DoesNotExist:
            return Response({"status": "error", "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


class DeviceRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = account_models.Device.objects.filter(user=request.user).order_by("-created_at")
        serializer = DeviceSerializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        data = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
        token = data.get("token")
        platform = data.get("platform", "")
        if not token:
            return Response({"status": "error", "error": "Missing token"}, status=status.HTTP_400_BAD_REQUEST)
        # update-or-create
        obj, created = account_models.Device.objects.update_or_create(
            user=request.user, token=token, defaults={"platform": platform}
        )
        return Response({"status": "success", "data": DeviceSerializer(obj).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def location_update(request):
    # Persist a location update
    user = request.user if hasattr(request, "user") and not isinstance(request.user, AnonymousUser) else None

    payload = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
    if user and getattr(user, "is_authenticated", False):
        payload["user"] = user.id

    serializer = LocationSerializer(data=payload)
    if serializer.is_valid():
        loc = serializer.save()
        logger.info("Saved location id=%s user=%s", loc.id, loc.user)
        return Response({"status": "success", "message": "Location saved"}, status=status.HTTP_201_CREATED)

    logger.warning("Failed to save location: %s", serializer.errors)
    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_locations(request):
    """Return recent location updates. Query params: minutes (int), limit (int)"""
    from django.utils import timezone
    from datetime import timedelta

    minutes = int(request.query_params.get("minutes", 5))
    limit = int(request.query_params.get("limit", 100))

    since = timezone.now() - timedelta(minutes=minutes)
    qs = account_models.Location.objects.filter(timestamp__gte=since).order_by("-timestamp")[:limit]
    serializer = LocationSerializer(qs, many=True)
    return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)
