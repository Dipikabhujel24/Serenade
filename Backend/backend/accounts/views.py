from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import EmergencyContact
from .serializers import SignupSerializer, EmergencyContactSerializer, UserProfileSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
import os
import requests
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

logger = logging.getLogger(__name__)
from .serializers import (
    AlertSerializer, LocationSerializer,
    EmergencyContactSerializer, DeviceSerializer, SMSQueueSerializer,
    SafetyCompanionSerializer, CommunityAlertSerializer
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
        logger.warning("Signup validation failed: %s", serializer.errors)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        logger.info("Login attempt for username='%s'", username)

        from django.contrib.auth.models import User

        user_exists = User.objects.filter(username=username).exists()
        logger.info("User exists: %s", user_exists)

        user = authenticate(username=username, password=password)

        if not user:
            logger.warning("Authentication failed for username='%s'", username)
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        profile = account_models.UserProfile.objects.filter(user=user).first()
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": profile.phone if profile else "",
        })


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    account_models.UserProfile.objects.get_or_create(user=user)

    if request.method == "GET":
        serializer = UserProfileSerializer(user)
        return Response({"status": "success", "data": serializer.data})

    serializer = UserProfileSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"status": "success", "data": serializer.data})
    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(["POST"])
@permission_classes([])
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

        # WebSocket notification
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)("alerts", {
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
            })

            if alert.user:
                user_group = f"user_{alert.user.id}"
                async_to_sync(channel_layer.group_send)(user_group, {
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
                })
            logger.info("Sent WebSocket alert notification")
        except Exception as e:
            logger.exception("Failed to send WebSocket notification: %s", e)

        if alert.user:
            notify_emergency_contacts(alert)

        return Response({"status": "success", "message": "SOS alert received", "alert_id": alert.id}, status=status.HTTP_201_CREATED)

    logger.warning("Failed to save alert: %s", serializer.errors)
    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


def notify_emergency_contacts(alert):
    """Notify emergency contacts via SMS and email"""
    try:
        contacts = account_models.EmergencyContact.objects.filter(user=alert.user)
        if not contacts.exists():
            logger.info("No emergency contacts found for user %s", alert.user.id)
            return

        sms_body = f"ALERT: {alert.alert_type.upper()} from {alert.user.username}"
        if alert.message:
            sms_body += f" - {alert.message}"
        if alert.latitude and alert.longitude:
            sms_body += f"\nLocation: https://maps.google.com/?q={alert.latitude},{alert.longitude}"

        logger.warning("EMERGENCY ALERT - User: %s, Type: %s, Contacts: %d", alert.user.username, alert.alert_type, contacts.count())
        for contact in contacts:
            logger.warning("  → Contact: %s (%s) %s", contact.name, contact.phone, contact.email or "")

        send_sms_alerts(alert, contacts, sms_body)

        try:
            latitude = alert.latitude
            longitude = alert.longitude
            maps_link = f"https://www.google.com/maps?q={latitude},{longitude}" if latitude and longitude else ""
            subject = "🚨 EMERGENCY SOS ALERT - Serenade Safety App"
            email_body = f"""
              EMERGENCY ALERT!

           {alert.user.username} has triggered an SOS alert.

           Alert Type: {alert.alert_type}
           Message: {alert.message}

            Location:
            {maps_link}

            Time: {alert.created_at}

            Please contact them immediately.

            This message was sent automatically by Serenade Safety Application.
            """

            recipients = []
            if alert.user.email:
                recipients.append(alert.user.email)
            for contact in contacts:
                if contact.email:
                    recipients.append(contact.email)

            if recipients:
                try:
                    from .tasks import send_email_async

                    text_body = email_body
                    html_body = (
                        f"<p><strong>EMERGENCY ALERT!</strong></p>"
                        f"<p>{alert.user.username} has triggered an SOS alert.</p>"
                        f"<p><strong>Alert Type:</strong> {alert.alert_type}</p>"
                        f"<p><strong>Message:</strong> {alert.message}</p>"
                        f"<p><strong>Location:</strong> <a href=\"{maps_link}\">Open in Google Maps</a></p>"
                        f"<p><em>Please contact them immediately.</em></p>"
                    )

                    send_email_async(subject=subject, text_body=text_body, html_body=html_body, from_email=settings.DEFAULT_FROM_EMAIL, recipients=recipients)
                    logger.warning("Enqueued background email to: %s", recipients)
                except Exception as e:
                    logger.exception("Failed to enqueue background email: %s", e)
            else:
                logger.warning("No email recipients found for SOS alert")
        except Exception as e:
            logger.exception("Failed to send email alerts: %s", e)

    except Exception as e:
        logger.exception("Failed to notify emergency contacts: %s", e)


def send_sms_alerts(alert, contacts, sms_body):
    """Send SMS alerts to emergency contacts via Twilio with rate limiting and normalization."""
    import os
    import phonenumbers
    from twilio.base.exceptions import TwilioRestException

    tw_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    tw_token = os.environ.get("TWILIO_AUTH_TOKEN")
    tw_from = os.environ.get("TWILIO_FROM_NUMBER")

    if not (tw_sid and tw_token and tw_from):
        logger.info("Twilio not configured. Queueing SMS for manual processing.")
        for contact in contacts:
            phone_val = contact.phone
            try:
                pn = phonenumbers.parse(phone_val, "NP")
                if phonenumbers.is_valid_number(pn):
                    phone_val = phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
            except Exception:
                logger.debug("Contact phone normalization failed for %s", phone_val)

            account_models.SMSQueue.objects.create(phone=phone_val, body=sms_body, alert=alert, status="pending")
        return

    # Rate limiting setup
    try:
        from django.utils import timezone as dj_timezone
        from .models import SMSRateLimit
        from django.conf import settings as dj_settings
    except Exception:
        SMSRateLimit = None
        dj_timezone = None
        dj_settings = None

    GLOBAL_DAILY_LIMIT = getattr(dj_settings, "SMS_GLOBAL_DAILY_LIMIT", 500)
    USER_DAILY_LIMIT = getattr(dj_settings, "SMS_PER_USER_DAILY_LIMIT", 20)

    def _get_rate_record(key):
        if not SMSRateLimit or not dj_timezone:
            return None
        today = dj_timezone.now().date()
        obj, _ = SMSRateLimit.objects.get_or_create(key=key, date=today)
        return obj

    user_key = f"user_{alert.user.id}" if getattr(alert, 'user', None) else "anonymous"
    global_rec = _get_rate_record("global")
    user_rec = _get_rate_record(user_key)

    if global_rec and global_rec.count >= GLOBAL_DAILY_LIMIT:
        for contact in contacts:
            account_models.SMSQueue.objects.create(phone=contact.phone, body=sms_body, alert=alert, status="pending", last_error="global_rate_exceeded")
        logger.warning("Global SMS daily limit reached; queued %d messages", len(contacts))
        return

    if user_rec and user_rec.count >= USER_DAILY_LIMIT:
        for contact in contacts:
            account_models.SMSQueue.objects.create(phone=contact.phone, body=sms_body, alert=alert, status="pending", last_error="user_rate_exceeded")
        logger.warning("User %s SMS daily limit reached; queued %d messages", user_key, len(contacts))
        return

    try:
        from twilio.rest import Client

        client = Client(tw_sid, tw_token)

        for idx, contact in enumerate(contacts):
            phone_val = contact.phone
            try:
                pn = phonenumbers.parse(phone_val, "NP")
                if phonenumbers.is_valid_number(pn):
                    phone_val = phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
                else:
                    raise ValueError("Invalid phone number")
            except Exception as se:
                logger.exception("Phone normalization failed for %s: %s", contact.phone, se)
                account_models.SMSQueue.objects.create(phone=contact.phone, body=sms_body, alert=alert, status="failed", last_error="invalid_phone_format")
                continue

            # Re-check limits
            global_rec = _get_rate_record("global")
            user_rec = _get_rate_record(user_key)
            if global_rec and global_rec.count >= GLOBAL_DAILY_LIMIT:
                remaining = list(contacts)[idx:]
                for rc in remaining:
                    account_models.SMSQueue.objects.create(phone=rc.phone, body=sms_body, alert=alert, status="pending", last_error="global_rate_exceeded")
                logger.warning("Global SMS daily limit reached mid-loop; queued %d messages", len(remaining))
                return
            if user_rec and user_rec.count >= USER_DAILY_LIMIT:
                remaining = list(contacts)[idx:]
                for rc in remaining:
                    account_models.SMSQueue.objects.create(phone=rc.phone, body=sms_body, alert=alert, status="pending", last_error="user_rate_exceeded")
                logger.warning("User SMS daily limit reached mid-loop; queued %d messages", len(remaining))
                return

            try:
                # Reserve counters
                if global_rec:
                    global_rec.count += 1
                    global_rec.save()
                if user_rec:
                    user_rec.count += 1
                    user_rec.save()

                client.messages.create(body=sms_body, from_=tw_from, to=phone_val)
                logger.info("Sent SMS to %s for alert %s", phone_val, alert.id)
            except TwilioRestException as tre:
                logger.exception("Twilio error sending SMS to %s: %s", phone_val, tre)
                err_code = getattr(tre, 'code', None)
                if err_code == 63038 or ('63038' in str(tre)):
                    if global_rec:
                        global_rec.count = max(0, global_rec.count - 1)
                        global_rec.save()
                    if user_rec:
                        user_rec.count = max(0, user_rec.count - 1)
                        user_rec.save()
                    remaining = list(contacts)[idx:]
                    for rc in remaining:
                        account_models.SMSQueue.objects.create(phone=rc.phone, body=sms_body, alert=alert, status="pending", last_error="daily_limit_exceeded")
                    logger.warning("Twilio daily limit reached; queued remaining %d messages", len(remaining))
                    return
                account_models.SMSQueue.objects.create(phone=phone_val, body=sms_body, alert=alert, status="failed", last_error=str(tre))
                if global_rec:
                    global_rec.count = max(0, global_rec.count - 1)
                    global_rec.save()
                if user_rec:
                    user_rec.count = max(0, user_rec.count - 1)
                    user_rec.save()
            except Exception as se:
                logger.exception("Failed to send SMS to %s: %s", phone_val, se)
                account_models.SMSQueue.objects.create(phone=phone_val, body=sms_body, alert=alert, status="failed", last_error=str(se))
                if global_rec:
                    global_rec.count = max(0, global_rec.count - 1)
                    global_rec.save()
                if user_rec:
                    user_rec.count = max(0, user_rec.count - 1)
                    user_rec.save()
    except ImportError:
        logger.warning("Twilio SDK not installed. Queueing SMS messages.")
        for contact in contacts:
            account_models.SMSQueue.objects.create(phone=contact.phone, body=sms_body, alert=alert, status="pending")
    except Exception as e:
        logger.exception("Twilio client error: %s", e)
        for contact in contacts:
            account_models.SMSQueue.objects.create(phone=contact.phone, body=sms_body, alert=alert, status="failed")


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
        token = data.get("device_token") or data.get("token")
        device_id = data.get("device_id")
        device_name = data.get("device_name") or data.get("platform", "")

        if not token and not device_id:
            return Response(
                {"status": "error", "error": "Missing device_token or device_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lookup = {"user": request.user}
        if token:
            lookup["device_token"] = token
        else:
            lookup["device_id"] = device_id

        defaults = {"device_name": device_name}
        if token:
            defaults["device_token"] = token
        if device_id:
            defaults["device_id"] = device_id

        obj, created = account_models.Device.objects.update_or_create(defaults=defaults, **lookup)
        return Response({"status": "success", "data": DeviceSerializer(obj).data})


@api_view(["POST"])
@permission_classes([])
def location_update(request):
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
    from django.utils import timezone
    from datetime import timedelta

    minutes = int(request.query_params.get("minutes", 5))
    limit = int(request.query_params.get("limit", 100))
    since = timezone.now() - timedelta(minutes=minutes)
    qs = account_models.Location.objects.filter(timestamp__gte=since).order_by("-timestamp")[:limit]
    serializer = LocationSerializer(qs, many=True)
    return Response({"status": "success", "data": serializer.data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def alert_history(request):
    """Return recent alerts for the authenticated user"""
    user = request.user
    qs = account_models.Alert.objects.filter(user=user).order_by("-created_at")[:100]
    serializer = AlertSerializer(qs, many=True)
    return Response({"status": "success", "data": serializer.data})


class BroadcastCommunityAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CommunityAlertSerializer(data=request.data)
        if serializer.is_valid():
            ca = serializer.save(user=request.user)
            return Response({"status": "success", "data": CommunityAlertSerializer(ca).data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nearby_community_alerts(request):
    try:
        lat = float(request.query_params.get("latitude"))
        lon = float(request.query_params.get("longitude"))
    except Exception:
        return Response({"status": "error", "error": "latitude and longitude required"}, status=status.HTTP_400_BAD_REQUEST)

    radius_km = float(request.query_params.get("radius_km", 5.0))
    # simple bounding box approximation (~111 km per degree)
    deg = radius_km / 111.0
    qs = account_models.CommunityAlert.objects.filter(latitude__gte=lat - deg, latitude__lte=lat + deg, longitude__gte=lon - deg, longitude__lte=lon + deg, is_active=True)
    serializer = CommunityAlertSerializer(qs, many=True)
    return Response({"status": "success", "data": serializer.data})


@api_view(["GET"])
@permission_classes([AllowAny])
def nearby_places_proxy(request):
    """Proxy to Google Places Nearby Search to avoid exposing API key on client
    Query params: lat, lon, type (hospital|police), radius (meters)
    """
    try:
        lat = float(request.query_params.get("lat"))
        lon = float(request.query_params.get("lon"))
    except Exception:
        return Response({"status": "error", "error": "lat and lon required"}, status=status.HTTP_400_BAD_REQUEST)

    place_type = request.query_params.get("type", "hospital")
    try:
        radius = int(request.query_params.get("radius", 5000))
    except Exception:
        radius = 5000

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return Response({"status": "error", "error": "Google Places API key not configured on server"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    url = (
        f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lon}"
        f"&radius={radius}&type={place_type}&key={api_key}"
    )

    try:
        r = requests.get(url, timeout=10)
        data = r.json()
        return Response({"status": "success", "data": data})
    except Exception as e:
        logger.exception("Failed to fetch places: %s", e)
        return Response({"status": "error", "error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    user = request.user
    if not user or not getattr(user, 'is_authenticated', False):
        return Response({"status": "error", "error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    file = request.FILES.get('avatar')
    if not file:
        return Response({"status": "error", "error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

    profile, _ = account_models.UserProfile.objects.get_or_create(user=user)
    try:
        profile.avatar.save(file.name, file, save=True)
        return Response({"status": "success", "avatar": profile.avatar.url})
    except Exception as e:
        logger.exception("Failed to save avatar: %s", e)
        return Response({"status": "error", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_community_alert(request, alert_id):
    try:
        ca = account_models.CommunityAlert.objects.get(pk=alert_id)
    except account_models.CommunityAlert.DoesNotExist:
        return Response({"status": "error", "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    ca.reports_count = (ca.reports_count or 0) + 1
    ca.save()
    return Response({"status": "success", "reports_count": ca.reports_count})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def safety_companion_manage(request):
    # GET: Retrieve current safety companion status
    if request.method == "GET":
        try:
            sc = account_models.SafetyCompanion.objects.get(user=request.user)
            return Response({"status": "success", "data": SafetyCompanionSerializer(sc).data})
        except account_models.SafetyCompanion.DoesNotExist:
            return Response({"status": "success", "data": None})
    
    # POST: Create or update safety companion
    data = request.data.copy() if isinstance(request.data, dict) else dict(request.data)
    data["user"] = request.user.id
    serializer = SafetyCompanionSerializer(data=data)
    if serializer.is_valid():
        sc = serializer.save(user=request.user)
        return Response({"status": "success", "data": SafetyCompanionSerializer(sc).data}, status=status.HTTP_201_CREATED)
    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def safety_companion_unassign(request):
    try:
        sc = account_models.SafetyCompanion.objects.get(user=request.user)
        sc.companion = None
        sc.is_active = False
        sc.save()
        return Response({"status": "success"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"status": "error", "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def safety_companion_checkin(request):
    try:
        sc = account_models.SafetyCompanion.objects.get(user=request.user)
        sc.last_check_in = account_models.timezone.now() if hasattr(account_models, 'timezone') else None
        sc.save()
        return Response({"status": "success"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"status": "error", "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def safety_companion_location_update(request):
    try:
        sc = account_models.SafetyCompanion.objects.get(user=request.user)
        lat = request.data.get("latitude")
        lon = request.data.get("longitude")
        if lat is not None and lon is not None:
            sc.last_location_latitude = float(lat)
            sc.last_location_longitude = float(lon)
            sc.last_location_update = account_models.timezone.now() if hasattr(account_models, 'timezone') else None
            sc.save()
            return Response({"status": "success"})
        return Response({"status": "error", "error": "latitude and longitude required"}, status=status.HTTP_400_BAD_REQUEST)
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"status": "error", "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def safety_companion_acknowledge(request):
    try:
        sc = account_models.SafetyCompanion.objects.get(user=request.user)
        sc.companion_acknowledged = True
        sc.save()
        return Response({"status": "success"})
    except account_models.SafetyCompanion.DoesNotExist:
        return Response({"status": "error", "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
