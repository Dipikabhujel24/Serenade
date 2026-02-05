import logging
from typing import Dict
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .models import EmergencyContact, SMSQueue, Device

logger = logging.getLogger(__name__)


def _build_alert_body(alert) -> str:
    base = alert.message or f"Emergency ({alert.alert_type}) from {getattr(alert.user, 'username', 'Unknown')}"
    if alert.latitude is not None and alert.longitude is not None:
        base += f"\nLocation: https://maps.google.com/?q={alert.latitude},{alert.longitude}"
    return base


def queue_sms_for_alert(alert) -> None:
    contacts = EmergencyContact.objects.filter(user=alert.user)
    body = _build_alert_body(alert)
    for c in contacts:
        SMSQueue.objects.create(phone=c.phone, body=body, alert=alert)


def send_push_to_devices(user, alert) -> None:
    devices = Device.objects.filter(user=user)
    payload: Dict = {
        "title": "Emergency Alert",
        "body": alert.message or f"{alert.alert_type} alert",
        "data": {"alert_id": alert.id, "type": alert.alert_type},
    }
    for d in devices:
        if not d.device_token:
            continue
        # Placeholder: integrate FCM/APNs here
        logger.info("Push placeholder -> token=%s payload=%s", d.device_token, payload)


def _send_sms_via_twilio(phone: str, body: str) -> bool:
    try:
        from twilio.rest import Client as TwilioClient
    except Exception:
        logger.warning("Twilio client not available")
        return False

    sid = getattr(settings, "TWILIO_ACCOUNT_SID", None)
    token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
    from_num = getattr(settings, "TWILIO_FROM_NUMBER", None)
    if not all([sid, token, from_num]):
        logger.warning("Twilio not configured, skipping SMS send to %s", phone)
        return False
    try:
        client = TwilioClient(sid, token)
        client.messages.create(to=phone, from_=from_num, body=body)
        return True
    except Exception:
        logger.exception("Twilio send failed")
        return False


def send_sms(phone: str, body: str) -> bool:
    return _send_sms_via_twilio(phone, body)


def process_pending_sms(limit: int = 50) -> int:
    now = timezone.now()
    pending = SMSQueue.objects.filter(status="pending").order_by("created_at")[:limit]
    processed = 0
    for item in pending:
        ok = False
        try:
            ok = send_sms(item.phone, item.body)
        except Exception:
            ok = False
        item.status = "sent" if ok else "failed"
        item.updated_at = timezone.now()
        if not ok:
            item.next_attempt = now + timedelta(minutes=5)
        item.save()
        processed += 1
    return processed