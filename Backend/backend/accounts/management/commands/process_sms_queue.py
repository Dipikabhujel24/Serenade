from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from ...models import SMSQueue
import os
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Process queued SMS messages with retry/backoff"

    def handle(self, *args, **options):
        now = timezone.now()
        # Import query helpers
        from django.db.models import F, Q

        tw_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        tw_token = os.environ.get("TWILIO_AUTH_TOKEN")
        tw_from = os.environ.get("TWILIO_FROM_NUMBER")

        if not tw_sid or not tw_token or not tw_from:
            logger.warning("Twilio not configured; cannot process SMS queue")
            return

        try:
            from twilio.rest import Client
        except Exception as e:
            logger.exception("Twilio client not available: %s", e)
            return

        client = Client(tw_sid, tw_token)

        # Get items ready
        items = SMSQueue.objects.filter(attempt_count__lt=F('max_attempts')).filter(
            Q(next_attempt__isnull=True) | Q(next_attempt__lte=now)
        ).order_by('created_at')[:100]

        for item in items:
            try:
                client.messages.create(body=item.body, from_=tw_from, to=item.phone)
                logger.info("Sent queued SMS to %s", item.phone)
                item.delete()
            except Exception as e:
                item.attempt_count += 1
                # exponential backoff in minutes
                backoff_minutes = 2 ** item.attempt_count
                item.next_attempt = now + timedelta(minutes=backoff_minutes)
                item.last_error = str(e)
                item.save()
                logger.exception("Failed to send queued SMS to %s; will retry", item.phone)
