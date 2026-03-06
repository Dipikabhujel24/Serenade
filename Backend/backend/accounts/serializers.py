import re
from rest_framework import serializers
from django.contrib.auth.models import User
from . import models
from .models import Alert, Location, EmergencyContact, Device, SMSQueue, SafetyCompanion, UserProfile
import phonenumbers
from rest_framework import serializers


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "phone"]

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

        return value.lower()

    def validate_phone(self, value):
        """Validate phone number during signup"""
        if not value or value.strip() == "":
            return ""  # Phone is optional during signup
        
        raw = value.strip()
        try:
            # Use NP (Nepal) as default region
            pn = phonenumbers.parse(raw, "NP")
            if not phonenumbers.is_valid_number(pn):
                raise serializers.ValidationError("Invalid phone number")
            # Return normalized E.164 format
            return phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("Invalid phone number format. Use format like +977-9841234567 or 9841234567")

    def create(self, validated_data):
        phone = validated_data.pop("phone", "")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        if validated_data.get("first_name"):
            user.first_name = validated_data["first_name"]
        if validated_data.get("last_name"):
            user.last_name = validated_data["last_name"]
        user.save()
        UserProfile.objects.get_or_create(user=user, defaults={"phone": phone})
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "phone", "avatar"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile = getattr(instance, "profile", None)
        data["phone"] = profile.phone if profile else ""
        data["avatar"] = profile.avatar.url if profile and getattr(profile, 'avatar') else None
        return data

    def validate_username(self, value):
        """Validate username uniqueness when updating"""
        user = self.instance
        if user and User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This username is already taken")
        return value

    def validate_email(self, value):
        """Validate email format and uniqueness"""
        if not value:
            raise serializers.ValidationError("Email is required")
        
        # Basic email format validation
        if '@' not in value or '.' not in value.split('@')[-1]:
            raise serializers.ValidationError("Invalid email format")
        
        # Check uniqueness when updating
        user = self.instance
        if user and User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use")
        
        return value.lower()

    def validate_phone(self, value):
        """Validate phone number using phonenumbers library"""
        if not value or value.strip() == "":
            return ""  # Allow empty phone
        
        raw = value.strip()
        try:
            # Use NP (Nepal) as default region; adjust if needed
            pn = phonenumbers.parse(raw, "NP")
            if not phonenumbers.is_valid_number(pn):
                raise serializers.ValidationError("Invalid phone number")
            # Return normalized E.164 format
            return phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("Invalid phone number format. Use format like +977-9841234567 or 9841234567")

    def update(self, instance, validated_data):
        phone = validated_data.pop("phone", None)
        for field in ["username", "email", "first_name", "last_name"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        if phone is not None:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            profile.phone = phone
            profile.save()
        return instance


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
    companion_email = serializers.CharField(source='companion.email', read_only=True)
    companion_first_name = serializers.CharField(source='companion.first_name', read_only=True)
    companion_last_name = serializers.CharField(source='companion.last_name', read_only=True)
    companion_phone = serializers.SerializerMethodField()
    user_name = serializers.CharField(source='user.username', read_only=True)

    def get_companion_phone(self, obj):
        try:
            companion = getattr(obj, 'companion', None)
            if not companion:
                return ""
            profile = getattr(companion, 'profile', None)
            return getattr(profile, 'phone', '') if profile else ''
        except Exception:
            return ""
    
    class Meta:
        model = SafetyCompanion
        fields = ['id', 'user', 'user_name', 'companion', 'companion_name', 'is_active', 
                  'companion_email', 'companion_first_name', 'companion_last_name', 'companion_phone',
                  'check_in_interval_minutes', 'deviation_threshold_km', 'notification_enabled',
                  'last_location_latitude', 'last_location_longitude', 'last_location_update',
                  'last_check_in', 'companion_acknowledged', 'deviation_alert_sent',
                  'inactivity_alert_sent', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'last_location_latitude',
                           'last_location_longitude', 'last_location_update', 'companion_acknowledged',
                           'deviation_alert_sent', 'inactivity_alert_sent']
