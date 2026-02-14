from django.core.management.base import BaseCommand
import re
import logging

logger = logging.getLogger(__name__)


def normalize_candidate(digits: str):
    """Attempt heuristic normalization for Nepal numbers.

    Returns E.164 string (e.g., +9779842313180) or None if cannot fix.
    """
    # strip any non-digit
    d = re.sub(r"\D", "", digits or "")
    if not d:
        return None

    # If already has country code 977 and then 10 digits -> length 13
    if d.startswith("977") and len(d) == 13:
        return "+" + d

    # If 10 digits (national) -> add +977
    if len(d) == 10:
        return "+977" + d

    # If 11 digits and leading zero -> drop leading zero
    if len(d) == 11 and d.startswith("0"):
        cand = d[1:]
        if len(cand) == 10:
            return "+977" + cand

    # If 11 digits and trailing zero -> drop trailing zero
    if len(d) == 11 and d.endswith("0"):
        cand = d[:-1]
        if len(cand) == 10:
            return "+977" + cand

    # If 12 digits and startswith 977 and extra digit -> try last 10
    if len(d) >= 12 and d.startswith("977"):
        cand = d[-10:]
        if len(cand) == 10:
            return "+977" + cand

    # last resort: if length==9 maybe missing one digit; cannot fix safely
    return None


class Command(BaseCommand):
    help = "Repair phone numbers heuristically for EmergencyContact and SMSQueue entries."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Apply changes to the database")
        parser.add_argument("--region", default="NP", help="Default region (unused for heuristics)")

    def handle(self, *args, **options):
        apply_changes = options.get("apply", False)

        from ...models import EmergencyContact, SMSQueue

        self.stdout.write("Scanning EmergencyContact.phone...")
        updated = 0
        cannot_fix = []
        for c in EmergencyContact.objects.all():
            raw = c.phone or ""
            cand = normalize_candidate(raw)
            if cand and cand != raw:
                self.stdout.write(f"Would update contact {c.id}: {raw} -> {cand}")
                if apply_changes:
                    c.phone = cand
                    c.save()
                    updated += 1
            elif not cand:
                cannot_fix.append(("contact", c.id, raw))

        self.stdout.write(f"Contacts fixed: {updated}")
        if cannot_fix:
            self.stdout.write("Contacts needing manual review:")
            for t, pk, raw in cannot_fix:
                self.stdout.write(f" - {t} {pk}: {raw}")

        self.stdout.write("Scanning SMSQueue.phone (pending/failed)...")
        updated_q = 0
        cannot_fix_q = []
        for q in SMSQueue.objects.filter(status__in=["pending", "failed"]):
            raw = q.phone or ""
            cand = normalize_candidate(raw)
            if cand and cand != raw:
                self.stdout.write(f"Would update queue {q.id}: {raw} -> {cand}")
                if apply_changes:
                    q.phone = cand
                    q.save()
                    updated_q += 1
            elif not cand:
                cannot_fix_q.append(("queue", q.id, raw))

        self.stdout.write(f"Queue items fixed: {updated_q}")
        if cannot_fix_q:
            self.stdout.write("Queue items needing manual review:")
            for t, pk, raw in cannot_fix_q:
                self.stdout.write(f" - {t} {pk}: {raw}")

        if not apply_changes:
            self.stdout.write("Note: no changes applied. Re-run with --apply to persist fixes.")
