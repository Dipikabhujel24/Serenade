from django.core.management.base import BaseCommand
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Normalize phone numbers for EmergencyContact and SMSQueue to E.164 (NP default)"

    def add_arguments(self, parser):
        parser.add_argument("--region", default="NP", help="Default region for parsing (eg: NP)")

    def handle(self, *args, **options):
        region = options.get("region", "NP")
        try:
            import phonenumbers
            from ...models import EmergencyContact, SMSQueue
        except Exception as e:
            logger.exception("Required modules not available: %s", e)
            return

        self.stdout.write("Normalizing EmergencyContact.phone...")
        updated = 0
        for c in EmergencyContact.objects.all():
            raw = (c.phone or "").strip()
            try:
                pn = phonenumbers.parse(raw, region)
                if phonenumbers.is_valid_number(pn):
                    e164 = phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
                    if e164 != raw:
                        c.phone = e164
                        c.save()
                        updated += 1
                        self.stdout.write(f"Updated contact {c.id}: {raw} -> {e164}")
                else:
                    self.stdout.write(f"Invalid number for contact {c.id}: {raw}")
            except Exception as e:
                self.stdout.write(f"Parse error for contact {c.id}: {raw} ({e})")

        self.stdout.write(f"Done. Contacts updated: {updated}")

        self.stdout.write("Normalizing SMSQueue.phone (pending/failed)...")
        updated_q = 0
        for q in SMSQueue.objects.filter(status__in=["pending", "failed"]):
            raw = (q.phone or "").strip()
            try:
                pn = phonenumbers.parse(raw, region)
                if phonenumbers.is_valid_number(pn):
                    e164 = phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
                    if e164 != raw:
                        q.phone = e164
                        q.save()
                        updated_q += 1
                        self.stdout.write(f"Updated queue {q.id}: {raw} -> {e164}")
                else:
                    self.stdout.write(f"Invalid number in queue {q.id}: {raw}")
            except Exception as e:
                self.stdout.write(f"Parse error for queue {q.id}: {raw} ({e})")

        self.stdout.write(f"Done. Queue items updated: {updated_q}")
