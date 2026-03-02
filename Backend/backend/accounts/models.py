from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"



class Alert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('sos', 'SOS'),
        ('panic', 'Panic'),
        ('medical', 'Medical'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = models.TextField(blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert {self.alert_type} by {self.user} at {self.created_at}"


class Location(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Location of {self.user} at {self.timestamp}"


class EmergencyContact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.phone}"


class Device(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    device_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    device_name = models.CharField(max_length=255, null=True, blank=True)
    device_token = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.device_name} - {self.device_id}"


class SMSQueue(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    phone = models.CharField(max_length=20)
    body = models.TextField()
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    last_error = models.TextField(null=True, blank=True)
    next_attempt = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SMS to {self.phone} - {self.status}"


class SMSRateLimit(models.Model):
    """Simple per-day rate limit counter for SMS sends.

    `key` can be 'global' or 'user_<id>' to track global and per-user counts.
    """
    key = models.CharField(max_length=100, db_index=True)
    date = models.DateField()
    count = models.IntegerField(default=0)

    class Meta:
        unique_together = (('key', 'date'),)

    def __str__(self):
        return f"RateLimit {self.key} @ {self.date}: {self.count}"

class CommunityAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('danger', 'Danger Zone'),
        ('harassment', 'Harassment'),
        ('theft', 'Theft/Crime'),
        ('accident', 'Accident'),
        ('fire', 'Fire'),
        ('medical', 'Medical Emergency'),
        ('suspicious', 'Suspicious Activity'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius_km = models.FloatField(default=1.0)  # Alert broadcast radius in km
    
    # Status tracking
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # Auto-deactivate after this time
    
    # Engagement
    views_count = models.IntegerField(default=0)
    reports_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['latitude', 'longitude', 'is_active']),
        ]

    def __str__(self):
        return f"Community Alert {self.alert_type} by {self.user} at {self.created_at}"

    def is_expired(self):
        """Check if alert has expired"""
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False


class SafetyCompanion(models.Model):
    """
    Tracks a user's safety companion relationship
    Companion monitors user location and is notified of deviations
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='safety_companion_user')
    companion = models.ForeignKey(User, on_delete=models.CASCADE, related_name='safety_companion_for', null=True, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=False)
    check_in_interval_minutes = models.IntegerField(default=5)  # Expected check-in frequency
    deviation_threshold_km = models.FloatField(default=0.5)  # How far user can deviate before alert
    notification_enabled = models.BooleanField(default=True)
    
    # Tracking
    last_location_latitude = models.FloatField(null=True, blank=True)
    last_location_longitude = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    last_check_in = models.DateTimeField(null=True, blank=True)
    
    # Status
    companion_acknowledged = models.BooleanField(default=False)
    deviation_alert_sent = models.BooleanField(default=False)
    inactivity_alert_sent = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Safety Companion: {self.user} -> {self.companion}"
    
    def is_overdue(self) -> bool:
        """Check if user is overdue for check-in"""
        if not self.last_check_in:
            return False
        time_since = timezone.now() - self.last_check_in
        overdue_threshold = timezone.timedelta(minutes=self.check_in_interval_minutes + 2)
        return time_since > overdue_threshold
    
    def has_deviated(self, new_lat: float, new_lon: float) -> bool:
        """Check if user location has deviated significantly"""
        if not self.last_location_latitude or not self.last_location_longitude:
            return False
        
        # Haversine distance calculation
        from math import radians, cos, sin, asin, sqrt
        
        lon1, lat1, lon2, lat2 = map(radians, [
            self.last_location_longitude, self.last_location_latitude,
            new_lon, new_lat
        ])
        
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        km = 6371 * c
        
        return km > self.deviation_threshold_km
