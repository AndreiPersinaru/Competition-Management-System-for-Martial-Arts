from rest_framework import serializers
from .models import User, Competitie
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class CompetitieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competitie
        fields = '__all__'

