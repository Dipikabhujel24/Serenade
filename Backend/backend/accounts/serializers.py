from rest_framework import serializers
from django.contrib.auth.models import User
from . import models


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
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
        fields = ['id', 'user', 'name', 'phone', 'email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Device
        fields = ['id', 'user', 'device_id', 'device_name', 'device_token', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SMSQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SMSQueue
        fields = ['id', 'phone', 'body', 'alert', 'status', 'next_attempt', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
