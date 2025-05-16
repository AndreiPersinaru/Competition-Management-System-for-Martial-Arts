from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..models import Meci
from ..serializers import MeciSerializer

class MeciViewSet(viewsets.ModelViewSet):
    queryset = Meci.objects.all()
    serializer_class = MeciSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['competitie', 'categorie']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_authenticators(self):
        if self.request.method == 'GET':
            return []
        return [JWTAuthentication()]
