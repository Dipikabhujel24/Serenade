import re
from rest_framework import serializers
from django.contrib.auth.models import User
from . import models
from .models import Alert, Location, EmergencyContact, Device, SMSQueue, SafetyCompanion
import phonenumbers
from rest_framework import serializers


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(max_length=150)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_username(self, value):
        # Django User model only allows letters, numbers, and @/./+/-/_
        # Remove spaces and special characters
        cleaned_username = re.sub(r'[^\w@.+-]', '', value.strip())
        
        if not cleaned_username:
            raise serializers.ValidationError("Username must contain at least one valid character (letters, numbers, @, ., +, -, _)")
        
        if User.objects.filter(username=cleaned_username).exists():
            raise serializers.ValidationError("Username already exists")
        
        return cleaned_username

    def validate_email(self, value):
        # Must be gmail
        if not value.lower().endswith("@gmail.com"):
            raise serializers.ValidationError("Only Gmail accounts are allowed for safety verification.")

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")

        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Alert
        fields = ['id', 'user', 'alert_type', 'message', 'latitude', 'longitude', 'created_at']
        read_only_fields = ['id', 'created_at']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Location
        fields = ['id', 'user', 'latitude', 'longitude', 'accuracy', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.EmergencyContact
        fields = ['id', 'name', 'phone', 'email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_phone(self, value):
        """Normalize phone to E.164 using phonenumbers. Default region: NP (Nepal)."""
        raw = (value or "").strip()
        if not raw:
            raise serializers.ValidationError("Phone number is required")
        try:
            # Use NP (Nepal) as default region; change if your users are in other region
            pn = phonenumbers.parse(raw, "NP")
            if not phonenumbers.is_valid_number(pn):
                raise serializers.ValidationError("Invalid phone number")
            return phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("Invalid phone number format")


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Device
        fields = ['id', 'user', 'device_id', 'device_name', 'device_token', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SMSQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SMSQueue
        fields = ['id', 'phone', 'body', 'alert', 'status', 'attempt_count', 'max_attempts', 'last_error', 'next_attempt', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class CommunityAlertSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    message = serializers.CharField(required=True)

    class Meta:
        model = models.CommunityAlert
        fields = ['id','user','username','alert_type','message','latitude','longitude',
                  'radius_km','is_active','created_at','expires_at','views_count','reports_count']
        read_only_fields = ['id','created_at','views_count','reports_count','user']


class SafetyCompanionSerializer(serializers.ModelSerializer):
    companion_name = serializers.CharField(source='companion.username', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = SafetyCompanion
        fields = ['id', 'user', 'user_name', 'companion', 'companion_name', 'is_active', 
                  'check_in_interval_minutes', 'deviation_threshold_km', 'notification_enabled',
                  'last_location_latitude', 'last_location_longitude', 'last_location_update',
                  'last_check_in', 'companion_acknowledged', 'deviation_alert_sent',
                  'inactivity_alert_sent', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'last_location_latitude',
                           'last_location_longitude', 'last_location_update', 'companion_acknowledged',
                           'deviation_alert_sent', 'inactivity_alert_sent']
