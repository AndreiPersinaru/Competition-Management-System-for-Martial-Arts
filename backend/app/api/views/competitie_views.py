from datetime import datetime
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.http import quote
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
import openpyxl

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..serializers import CompetitieSerializer
from ..models import Competitie, Sportiv, Club, Proba, Categorie, Inscriere
from ..utils.categorii import populate_categorii_standard


class CompetitieViewSet(viewsets.ModelViewSet):
    queryset = Competitie.objects.all()
    serializer_class = CompetitieSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_authenticators(self):
        if self.request.method == 'GET':
            return []
        return [JWTAuthentication()]

    def perform_create(self, serializer):
        competitie = serializer.save()
        probe_nume = self.request.data.get("probe", [])
        for nume in probe_nume:
            proba, _ = Proba.objects.get_or_create(nume=nume)
            competitie.probe.add(proba)


# ========== DOWNLOAD EXCEL TEMPLATE ==========

class CompetitionExcelTemplateView(APIView):
    permission_classes = []

    def get(self, request, competition_id):
        wb = Workbook()
        ws = wb.active
        ws.title = "Sportivi"

        competitie = get_object_or_404(Competitie, id=competition_id)
        probe = list(competitie.probe.values_list('nume', flat=True))

        headers = ["Nume", "Prenume", "CNP", "Vârstă", "Greutate", "Data Nastere", "Club", "Sex"] + list(probe)
        ws.append(headers)

        for col in ws.columns:
            column = col[0].column_letter
            ws.column_dimensions[column].width = 15

        # img = XLImage(r"C:\Facultate\Licenta\Aplicatie\Licenta\frontend\src\assets\pictures\home-background.jpg")
        # ws.add_image(img, "M1")

        # Validare Sex
        dv_sex = DataValidation(type="list", formula1='"M,F"', allow_blank=False)
        ws.add_data_validation(dv_sex)
        dv_sex.add("H2:H1000")

        # Validare Proba (X sau -) pentru fiecare coloană cu probă
        for idx, _ in enumerate(probe, start=1):
            col_letter = get_column_letter(8 + idx)
            dv = DataValidation(type="list", formula1='"x,-"', allow_blank=True)
            ws.add_data_validation(dv)
            dv.add(f"{col_letter}2:{col_letter}1000")

        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        filename = f"Inscriere {competitie.nume}.xlsx"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(filename)}"
        wb.save(response)
        return response
    

# ========== EXPORT PARTICIPANTS ==========
class ExportParticipantsView(APIView):
    permission_classes = []

    def get(self, request, competition_id):
        competitie = get_object_or_404(Competitie, id=competition_id)
        inscrieri = Inscriere.objects.filter(competitie=competitie).select_related("sportiv", "categorie__proba", "sportiv__club")

        wb = Workbook()
        ws = wb.active
        ws.append(["Nume", "Prenume", "CNP", "Categorie vârstă", "Categorie greutate", "Data nașterii", "Proba", "Club", "Sex"])
        for col in ws.columns:
            column = col[0].column_letter
            ws.column_dimensions[column].width = 15

        for inscriere in inscrieri:
            sportiv = inscriere.sportiv
            categorie = inscriere.categorie
            ws.append([
                sportiv.nume,
                sportiv.prenume,
                sportiv.cnp,
                f"{categorie.varsta_min}-{categorie.varsta_max}",
                f"{categorie.greutate_min}-{categorie.greutate_max}",
                sportiv.data_nastere.strftime("%d.%m.%Y"),
                categorie.proba.nume,
                sportiv.club.nume,
                sportiv.sex
            ])

        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        filename = f"Lista Sportivi {competitie.nume}.xlsx"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(filename)}"
        wb.save(response)
        return response
    

# ========== UPLOAD PARTICIPANTS ==========
    
class UploadParticipantsView(APIView):
    permission_classes = []

    def post(self, request, competition_id):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"detail": "Fisierul nu a fost trimis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file_obj)
            ws = wb.active
        except Exception as e:
            return Response({"detail": f"Fisier Excel invalid: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        competitie = get_object_or_404(Competitie, id=competition_id)
        errors = []
        added_count = 0

        header = [cell.value for cell in ws[1]]
        probe_nume = [nume for nume in header if nume in competitie.probe.values_list('nume', flat=True)]

        for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row or all(cell is None for cell in row):
                    errors.append(f"Rândul {idx}: rând gol")
                    continue

                nume = row[0]
                prenume = row[1]
                cnp = row[2]
                cat_varsta = row[3]
                cat_greutate = row[4]
                data_nastere = row[5]
                club_nume = row[6]
                sex = row[7]

                if not all([nume, prenume, cnp, cat_greutate, data_nastere, club_nume, sex]):
                    raise ValueError("Date lipsă în rând")

                data_nastere = datetime.strptime(str(data_nastere), "%d.%m.%Y").date()
                club, _ = Club.objects.get_or_create(nume=club_nume)

                if not cnp or len(str(cnp)) != 13:
                    raise ValueError("CNP invalid")

                sportiv, _ = Sportiv.objects.get_or_create(cnp=cnp, defaults={
                    "nume": nume,
                    "prenume": prenume,
                    "sex": sex,
                    "club": club,
                    "data_nastere": data_nastere,
                })

                if Inscriere.objects.filter(sportiv=sportiv, competitie=competitie).exists():
                    continue

                varsta = competitie.data_incepere.year - data_nastere.year
                greutate = float(cat_greutate)

                for i, proba in enumerate(probe_nume):
                    col_idx = header.index(proba)
                    if str(row[col_idx]).strip().lower() == 'x':
                        proba_obj, _ = Proba.objects.get_or_create(nume=proba)

                        if not Categorie.objects.filter(proba=proba_obj).exists():
                            populate_categorii_standard(proba_obj)

                        categorie = Categorie.objects.filter(
                            proba=proba_obj,
                            sex=sex,
                            varsta_min__lte=varsta,
                            varsta_max__gte=varsta,
                            greutate_min__lte=greutate,
                            greutate_max__gte=greutate,
                        ).first()

                        if not categorie:
                            raise ValueError(f"Nu există categorie pentru proba {proba}, varsta {varsta} și greutate {greutate}")

                        Inscriere.objects.create(
                            sportiv=sportiv,
                            categorie=categorie,
                            competitie=competitie,
                            varsta=varsta,
                            greutate=greutate
                        )
                        added_count += 1

            except Exception as e:
                errors.append(f"Rândul {idx}: {str(e)}")

        return Response({
            "detail": f"{added_count} înscrieri adăugate, {len(errors)} erori",
            "errors": errors
        }, status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED)

