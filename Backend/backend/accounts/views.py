from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import EmergencyContact
from .serializers import SignupSerializer, EmergencyContactSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

logger = logging.getLogger(__name__)
from .serializers import (
    AlertSerializer, LocationSerializer,
    EmergencyContactSerializer, DeviceSerializer, SMSQueueSerializer,
    SafetyCompanionSerializer
)
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
@permission_classes([])  # Allow both authenticated and unauthenticated (SOS is critical)
def sos_alert(request):
    """Handle SOS alert: save to DB, notify via WebSocket, SMS, and log"""
    user = request.user if hasattr(request, "user") and not isinstance(request.user, AnonymousUser) else None

    payload = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
    if user and getattr(user, "is_authenticated", False):
        payload["user"] = user.id

    serializer = AlertSerializer(data=payload)
    if serializer.is_valid():
        alert = serializer.save()
        logger.info("Saved alert id=%s type=%s user=%s", alert.id, alert.alert_type, alert.user)
        
        # 1. Send real-time WebSocket notification to all clients
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

            # also send to the specific user's group (if user)
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
            logger.info("Sent WebSocket alert notification")
        except Exception as e:
            logger.exception("Failed to send WebSocket notification: %s", e)

        # 2. Notify emergency contacts via SMS and/or API
        if alert.user:
            notify_emergency_contacts(alert)

        return Response(
            {"status": "success", "message": "SOS alert received", "alert_id": alert.id},
            status=status.HTTP_201_CREATED,
        )

    logger.warning("Failed to save alert: %s", serializer.errors)
    return Response(
        {"status": "error", "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


def notify_emergency_contacts(alert):
    """Notify emergency contacts via SMS and console logs"""
    try:
        contacts = account_models.EmergencyContact.objects.filter(user=alert.user)
        if not contacts.exists():
            logger.info("No emergency contacts found for user %s", alert.user.id)
            return

        # Prepare alert message
        sms_body = f"ALERT: {alert.alert_type.upper()} from {alert.user.username}"
        if alert.message:
            sms_body += f" - {alert.message}"
        if alert.latitude and alert.longitude:
            sms_body += f"\nLocation: https://maps.google.com/?q={alert.latitude},{alert.longitude}"

        # Log alert to console (for development)
        logger.warning(
            "EMERGENCY ALERT - User: %s, Type: %s, Contacts: %d",
            alert.user.username,
            alert.alert_type,
            contacts.count(),
        )
        for contact in contacts:
            logger.warning("  → Contact: %s (%s) %s", contact.name, contact.phone, contact.email or "")

        # Try to send via Twilio SMS
        send_sms_alerts(alert, contacts, sms_body)

    except Exception as e:
        logger.exception("Failed to notify emergency contacts: %s", e)


def send_sms_alerts(alert, contacts, sms_body):
    """Send SMS alerts to emergency contacts via Twilio"""
    import os

    tw_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    tw_token = os.environ.get("TWILIO_AUTH_TOKEN")
    tw_from = os.environ.get("TWILIO_FROM_NUMBER")

    if not (tw_sid and tw_token and tw_from):
        logger.info("Twilio not configured. Queueing SMS for manual processing.")
        for contact in contacts:
            account_models.SMSQueue.objects.create(
                phone=contact.phone,
                body=sms_body,
                alert=alert,
                status="pending",
            )
        return

    try:
        from twilio.rest import Client

        client = Client(tw_sid, tw_token)
        for contact in contacts:
            try:
                client.messages.create(
                    body=sms_body,
                    from_=tw_from,
                    to=contact.phone,
                )
                logger.info("Sent SMS to %s for alert %s", contact.phone, alert.id)
            except Exception as se:
                logger.exception("Failed to send SMS to %s: %s", contact.phone, se)
                # Enqueue for retry
                account_models.SMSQueue.objects.create(
                    phone=contact.phone,
                    body=sms_body,
                    alert=alert,
                    status="failed",
                )
    except ImportError:
        logger.warning("Twilio SDK not installed. Queueing SMS messages.")
        for contact in contacts:
            account_models.SMSQueue.objects.create(
                phone=contact.phone,
                body=sms_body,
                alert=alert,
                status="pending",
            )
    except Exception as e:
        logger.exception("Twilio client error: %s", e)
        for contact in contacts:
            account_models.SMSQueue.objects.create(
                phone=contact.phone,
                body=sms_body,
                alert=alert,
                status="failed",
            )


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

class EmergencyContactListCreateView(generics.ListCreateAPIView):
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        logger.info("[EmergencyContact GET] User: %s", self.request.user)
        return EmergencyContact.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        logger.info("[EmergencyContact POST] User: %s, Data: %s", self.request.user, serializer.validated_data)
        serializer.save(user=self.request.user)
        logger.info("[EmergencyContact] Saved successfully")

class EmergencyContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = EmergencyContactSerializer

    def get_queryset(self):
        return EmergencyContact.objects.filter(user=self.request.user)

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
@permission_classes([])  # Allow both authenticated and unauthenticated (location tracking is critical for safety)
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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def alert_history(request):
    """Return user's alert history"""
    limit = int(request.query_params.get("limit", 50))
    qs = account_models.Alert.objects.filter(user=request.user).order_by("-created_at")[:limit]
    serializer = AlertSerializer(qs, many=True)
    return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(["POST"])
@permission_classes([])
def broadcast_community_alert(request):
    """Broadcast a community alert to nearby users"""
    from django.utils import timezone
    from datetime import timedelta
    
    user = request.user if hasattr(request, "user") and not isinstance(request.user, AnonymousUser) else None
    payload = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
    if user and getattr(user, "is_authenticated", False):
        payload["user"] = user.id

    from .serializers import CommunityAlertSerializer
    serializer = CommunityAlertSerializer(data=payload)
    if serializer.is_valid():
        alert = serializer.save()
        if not alert.expires_at:
            alert.expires_at = timezone.now() + timedelta(hours=1)
            alert.save()
        
        logger.info("Community alert id=%s type=%s", alert.id, alert.alert_type)
        
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)("community_alerts", {
                "type": "community.alert",
                "data": {
                    "id": alert.id, "type": alert.alert_type, "message": alert.message,
                    "latitude": alert.latitude, "longitude": alert.longitude,
                    "radius_km": alert.radius_km,
                    "username": alert.user.username if alert.user else "Anonymous",
                    "created_at": alert.created_at.isoformat(),
                },
            })
        except Exception as e:
            logger.exception("Failed to broadcast: %s", e)

        return Response({"status": "success", "alert_id": alert.id}, status=status.HTTP_201_CREATED)

    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def nearby_community_alerts(request):
    """Get community alerts near user's location"""
    from math import radians, sin, cos, sqrt, atan2
    from django.utils import timezone

    lat = float(request.query_params.get("latitude", 0))
    lon = float(request.query_params.get("longitude", 0))
    radius = float(request.query_params.get("radius", 5))

    alerts = account_models.CommunityAlert.objects.filter(is_active=True, expires_at__gt=timezone.now())

    def distance_km(lat1, lon1, lat2, lon2):
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        a = sin((lat2-lat1)/2)**2 + cos(lat1)*cos(lat2)*sin((lon2-lon1)/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1-a))

    nearby = [a for a in alerts if distance_km(lat, lon, a.latitude, a.longitude) <= max(radius, a.radius_km)]
    from .serializers import CommunityAlertSerializer
    serializer = CommunityAlertSerializer(nearby, many=True)
    return Response({"status": "success", "data": serializer.data})


@api_view(["POST"])
def report_community_alert(request, alert_id):
    """Report a community alert"""
    try:
        alert = account_models.CommunityAlert.objects.get(id=alert_id)
        alert.reports_count = (alert.reports_count or 0) + 1
        if alert.reports_count >= 5:
            alert.is_active = False
        alert.save()
        return Response({"status": "success"})
    except account_models.CommunityAlert.DoesNotExist:
        return Response({"status": "error"}, status=status.HTTP_404_NOT_FOUND)


# ====================== SAFETY COMPANION ======================

@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def safety_companion_manage(request):
    """
    GET: Retrieve user's safety companion status
    POST: Assign a new companion
    PUT: Update companion settings (check_in interval, deviation threshold, etc.)
    """
    try:
        companion_obj, created = account_models.SafetyCompanion.objects.get_or_create(user=request.user)
        
        if request.method == 'GET':
            serializer = SafetyCompanionSerializer(companion_obj)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Assign a new companion
            companion_username = request.data.get('companion_username')
            if not companion_username:
                return Response({"error": "companion_username required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                from django.contrib.auth.models import User
                companion_user = User.objects.get(username=companion_username)
                companion_obj.companion = companion_user
                companion_obj.is_active = True
                companion_obj.companion_acknowledged = False
                companion_obj.save()
                
                serializer = SafetyCompanionSerializer(companion_obj)
                return Response({"status": "success", "data": serializer.data})
            except User.DoesNotExist:
                return Response({"error": "Companion user not found"}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'PUT':
            # Update settings
            if 'check_in_interval_minutes' in request.data:
                companion_obj.check_in_interval_minutes = request.data['check_in_interval_minutes']
            if 'deviation_threshold_km' in request.data:
                companion_obj.deviation_threshold_km = request.data['deviation_threshold_km']
            if 'notification_enabled' in request.data:
                companion_obj.notification_enabled = request.data['notification_enabled']
            if 'is_active' in request.data:
                companion_obj.is_active = request.data['is_active']
            
            companion_obj.save()
            serializer = SafetyCompanionSerializer(companion_obj)
            return Response({"status": "success", "data": serializer.data})
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def safety_companion_unassign(request):
    """Unassign current safety companion"""
    try:
        companion_obj = account_models.SafetyCompanion.objects.get(user=request.user)
        companion_obj.companion = None
        companion_obj.is_active = False
        companion_obj.save()
        return Response({"status": "success", "message": "Companion unassigned"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"error": "No safety companion assigned"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def safety_companion_checkin(request):
    """User check-in with companion (resets overdue status)"""
    try:
        companion_obj = account_models.SafetyCompanion.objects.get(user=request.user)
        
        # Update check-in time and location if provided
        from django.utils import timezone
        companion_obj.last_check_in = timezone.now()
        
        if 'latitude' in request.data and 'longitude' in request.data:
            companion_obj.last_location_latitude = request.data['latitude']
            companion_obj.last_location_longitude = request.data['longitude']
            companion_obj.last_location_update = timezone.now()
            companion_obj.deviation_alert_sent = False  # Reset deviation alert
        
        companion_obj.inactivity_alert_sent = False  # Reset inactivity alert
        companion_obj.save()
        
        return Response({"status": "success", "message": "Check-in received"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"error": "No safety companion assigned"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def safety_companion_location_update(request):
    """Update user location for deviation checking"""
    try:
        companion_obj = account_models.SafetyCompanion.objects.get(user=request.user)
        
        if not companion_obj.is_active or not companion_obj.companion:
            return Response({"status": "success", "message": "Safety companion not active"})
        
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not latitude or not longitude:
            return Response({"error": "latitude and longitude required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for deviation
        from django.utils import timezone
        if companion_obj.has_deviated(latitude, longitude):
            companion_obj.deviation_alert_sent = True
            companion_obj.save()
            
            # Notify companion via WebSocket
            from channels.layers import get_channel_layer
            import asyncio
            
            channel_layer = get_channel_layer()
            asyncio.create_task(channel_layer.group_send(
                f"safety_companion_{companion_obj.companion.id}",
                {
                    "type": "companion_deviation",
                    "message": f"{request.user.username} has deviated from expected route",
                    "latitude": latitude,
                    "longitude": longitude,
                    "user_id": request.user.id,
                }
            ))
            
            return Response({"status": "success", "message": "Deviation detected, companion notified"})
        
        # Update location
        companion_obj.last_location_latitude = latitude
        companion_obj.last_location_longitude = longitude
        companion_obj.last_location_update = timezone.now()
        companion_obj.save()
        
        return Response({"status": "success", "message": "Location updated"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"error": "No safety companion assigned"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def safety_companion_acknowledge(request):
    """Companion acknowledges they've received the alert"""
    try:
        # Get the SafetyCompanion record where current user is the companion
        companion_obj = account_models.SafetyCompanion.objects.get(companion=request.user)
        companion_obj.companion_acknowledged = True
        companion_obj.save()
        
        return Response({"status": "success", "message": "Alert acknowledged"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"error": "You are not assigned as a companion"}, status=status.HTTP_404_NOT_FOUND)
