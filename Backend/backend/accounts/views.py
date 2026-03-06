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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return Response(
            {"status": "error", "error": "current_password and new_password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(str(new_password)) < 8:
        return Response(
            {"status": "error", "error": "new_password must be at least 8 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        return Response(
            {"status": "error", "error": "Current password is incorrect"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()

    return Response({"status": "success", "message": "Password updated successfully"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_my_data(request):
    user = request.user
    profile = account_models.UserProfile.objects.filter(user=user).first()

    contacts = account_models.EmergencyContact.objects.filter(user=user).order_by("-created_at")
    alerts = account_models.Alert.objects.filter(user=user).order_by("-created_at")[:100]
    locations = account_models.Location.objects.filter(user=user).order_by("-timestamp")[:100]

    payload = {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
        "profile": {
            "phone": profile.phone if profile else "",
            "avatar": profile.avatar.url if profile and getattr(profile, "avatar") else None,
        },
        "contacts": EmergencyContactSerializer(contacts, many=True).data,
        "alerts": AlertSerializer(alerts, many=True).data,
        "locations": LocationSerializer(locations, many=True).data,
    }

    return Response({"status": "success", "data": payload})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    user = request.user
    password = request.data.get("password")
    confirm = request.data.get("confirm")

    if confirm != "DELETE":
        return Response(
            {"status": "error", "error": "Confirmation token invalid"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not password:
        return Response(
            {"status": "error", "error": "Password is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(password):
        return Response(
            {"status": "error", "error": "Invalid password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.delete()
    return Response({"status": "success", "message": "Account deleted"})


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
    from django.core.mail import send_mail

    try:
        contacts = account_models.EmergencyContact.objects.filter(user=alert.user)

        if not contacts.exists():
            logger.info("No emergency contacts found")
            return

        message = f"""
EMERGENCY SOS ALERT

User: {alert.user.username}
Message: {alert.message}

Location:
https://maps.google.com/?q={alert.latitude},{alert.longitude}
"""

        for contact in contacts:
            if contact.email:
                send_mail(
                    subject="🚨 EMERGENCY SOS ALERT",
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[contact.email],
                    fail_silently=False,
                )

                logger.warning("Email sent to %s", contact.email)

    except Exception as e:
        logger.exception("Failed to send email alerts: %s", e)
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

            # Notify only nearby users (based on recent location samples and selected radius).
            recipients = []
            try:
                from django.utils import timezone
                from datetime import timedelta
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer

                radius_km = float(ca.radius_km or 5.0)
                deg = radius_km / 111.0
                since = timezone.now() - timedelta(minutes=30)

                nearby_user_ids = (
                    account_models.Location.objects.filter(
                        user__isnull=False,
                        timestamp__gte=since,
                        latitude__gte=ca.latitude - deg,
                        latitude__lte=ca.latitude + deg,
                        longitude__gte=ca.longitude - deg,
                        longitude__lte=ca.longitude + deg,
                    )
                    .exclude(user=ca.user)
                    .values_list("user_id", flat=True)
                    .distinct()
                )

                channel_layer = get_channel_layer()
                payload = {
                    "type": "community_alert",
                    "id": ca.id,
                    "alert_type": ca.alert_type,
                    "message": ca.message,
                    "latitude": ca.latitude,
                    "longitude": ca.longitude,
                    "radius_km": ca.radius_km,
                    "username": ca.user.username,
                    "created_at": ca.created_at.isoformat(),
                }

                for uid in nearby_user_ids:
                    group = f"user_{uid}"
                    async_to_sync(channel_layer.group_send)(
                        group,
                        {
                            "type": "community.alert",
                            "data": payload,
                        },
                    )
                    recipients.append(uid)
            except Exception as e:
                logger.exception("Failed to send nearby community alert notifications: %s", e)

            return Response(
                {
                    "status": "success",
                    "data": CommunityAlertSerializer(ca).data,
                    "notified_users": len(recipients),
                },
                status=status.HTTP_201_CREATED,
            )
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
    """Proxy to OpenStreetMap Overpass API.
    Query params: lat, lon, type (hospital|police|pharmacy|fire_station), radius (meters)
    Returns normalized place results compatible with the mobile app.
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

    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json][timeout:25];
    (
      node[\"amenity\"=\"{place_type}\"](around:{radius},{lat},{lon});
      way[\"amenity\"=\"{place_type}\"](around:{radius},{lat},{lon});
      relation[\"amenity\"=\"{place_type}\"](around:{radius},{lat},{lon});
    );
    out center;
    """

    try:
        r = requests.post(overpass_url, data={"data": query}, timeout=15)
        r.raise_for_status()
        data = r.json()
        elements = data.get("elements", []) if isinstance(data, dict) else []

        normalized = []
        for el in elements:
            tags = el.get("tags", {}) or {}
            center = el.get("center", {}) or {}
            p_lat = el.get("lat", center.get("lat"))
            p_lon = el.get("lon", center.get("lon"))
            if p_lat is None or p_lon is None:
                continue

            normalized.append({
                "place_id": f"osm-{el.get('type', 'node')}-{el.get('id')}",
                "name": tags.get("name") or f"{place_type.title()} service",
                "vicinity": tags.get("addr:street") or tags.get("addr:suburb") or tags.get("addr:city") or "Nearby area",
                "formatted_address": tags.get("addr:full") or "",
                "geometry": {
                    "location": {
                        "lat": p_lat,
                        "lng": p_lon,
                    }
                },
            })

        return Response({"status": "success", "data": {"results": normalized}})
    except Exception as e:
        logger.exception("Failed to fetch Overpass places: %s", e)
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
    existing = account_models.SafetyCompanion.objects.filter(user=request.user).first()
    serializer = SafetyCompanionSerializer(existing, data=data, partial=bool(existing))
    if serializer.is_valid():
        sc = serializer.save(user=request.user)
        return Response(
            {"status": "success", "data": SafetyCompanionSerializer(sc).data},
            status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
        )
    return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def safety_companion_lookup_user(request):
    username = (request.query_params.get("username") or "").strip()
    if not username:
        return Response({"status": "error", "error": "username is required"}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth.models import User

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"status": "error", "error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if user.id == request.user.id:
        return Response({"status": "error", "error": "You cannot select yourself as companion"}, status=status.HTTP_400_BAD_REQUEST)

    profile = account_models.UserProfile.objects.filter(user=user).first()
    return Response({
        "status": "success",
        "data": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": profile.phone if profile else "",
        },
    })


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

def send_email_async(subject, text_body, html_body, from_email, recipients):
    """Send email asynchronously using Django's send_mail in a background thread."""
    import threading

    def _send():
        try:
            send_mail(subject=subject, message=text_body, from_email=from_email, recipient_list=recipients, html_message=html_body)
        except Exception as e:
            logger.exception("Failed to send email: %s", e)

    threading.Thread(target=_send).start()