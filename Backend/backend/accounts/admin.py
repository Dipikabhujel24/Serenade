from django.contrib import admin
from .models import Alert, Location, EmergencyContact, Device, SMSQueue

admin.site.register(Alert)
admin.site.register(Location)
admin.site.register(EmergencyContact)
admin.site.register(Device)
admin.site.register(SMSQueue)