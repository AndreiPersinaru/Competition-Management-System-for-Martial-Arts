from rest_framework import serializers
from .models import Club, User, Sportiv, Proba, Categorie, Competitie, Inscriere, Saltea, Meci, ClasamentClub, ClasamentProba
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class ProbaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proba
        fields = ["id", "nume"]

class CompetitieSerializer(serializers.ModelSerializer):
    probe = ProbaSerializer(many=True, read_only=True)
    probe_input = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = Competitie
        fields = '__all__'

    def create(self, validated_data):
        probe_nume = validated_data.pop("probe_input", [])
        competitie = Competitie.objects.create(**validated_data)
        for nume in probe_nume:
            proba, _ = Proba.objects.get_or_create(nume=nume)
            competitie.probe.add(proba)
        return competitie



