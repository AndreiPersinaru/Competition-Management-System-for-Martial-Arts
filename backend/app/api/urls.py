from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.auth_views import RegisterView, LogoutView
from .views.competitie_views import CompetitieViewSet, CompetitionExcelTemplateView, UploadParticipantsView, ExportParticipantsView
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView

router = DefaultRouter()
router.register(r'competitions', CompetitieViewSet, basename='competition')

urlpatterns = [
    # User auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Competitii
    path('', include(router.urls)),
    path("competitii/<int:competition_id>/template/", CompetitionExcelTemplateView.as_view(), name="download_excel_template"),
    path("competitii/<int:competition_id>/export-participants/", ExportParticipantsView.as_view(), name="export_participants"),
    path("competitii/<int:competition_id>/upload-participants/", UploadParticipantsView.as_view()),
]
