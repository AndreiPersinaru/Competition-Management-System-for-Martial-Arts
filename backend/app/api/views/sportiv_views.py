from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..models import Sportiv
from ..serializers import SportivSerializer

class SportivViewSet(viewsets.ModelViewSet):
    queryset = Sportiv.objects.all()
    serializer_class = SportivSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['club']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_authenticators(self):
        if self.request.method == 'GET':
            return []
        return [JWTAuthentication()]