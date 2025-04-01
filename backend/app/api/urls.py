from django.urls import path
from rest_framework_simplejwt.views import ( TokenRefreshView, TokenObtainPairView ) 
from .views import RegisterView, LogoutView

urlpatterns = [
    # User auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]