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
from ..utils.bracket_generation import genereaza_bracket_si_meciuri


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
        competitie = get_object_or_404(Competitie, id=competition_id)
        probe = list(competitie.probe.values_list('nume', flat=True))

        ws = wb.active
        ws.title = "Sportivi"

        headers = ["NR LEG", "NUME SI PRENUME", "CLUB", "GEN", "CNP", "DATA NASTERII", "CATEGORIE VARSTA", "KG", "CATEGORIE KG", "PROBA", "MECI", "TAXA"]
        ws.append(headers)

        for i, header in enumerate(headers, start=1):
            col_letter = get_column_letter(i)
            ws.column_dimensions[col_letter].width = len(header) + 7
            for row in range(1, 1001):
                ws[f"{col_letter}{row}"].font = openpyxl.styles.Font(bold=True, name="Calibri1")
                ws.row_dimensions[row].height = 25
                ws[f"{col_letter}{row}"].border = openpyxl.styles.Border(
                    left=openpyxl.styles.Side(style='thin'),
                    right=openpyxl.styles.Side(style='thin'),
                    top=openpyxl.styles.Side(style='thin'),
                    bottom=openpyxl.styles.Side(style='thin')
                )
                

        # Validare Gen
        dv_gen = DataValidation(type="list", formula1='"Masculin,Feminin"', allow_blank=False)
        ws.add_data_validation(dv_gen)
        dv_gen.add("D2:D1000")

        # Validare Proba
        if probe:
            print(f"Probe: {probe}")
            probe_list_str = ','.join([f'{p}' for p in probe])
            dv_probe = DataValidation(type="list", formula1='"' + probe_list_str + '"', allow_blank=False)
            ws.add_data_validation(dv_probe)
            dv_probe.add("J2:J1000")
    
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
        ws.title = "Sportivi"

        headers = ["NR LEG", "NUME SI PRENUME", "CLUB", "GEN", "CNP", "DATA NASTERII", "CATEGORIE VARSTA", "CATEGORIE KG", "PROBA", "MECI", "TAXA"]
        ws.append(headers)

        for i, header in enumerate(headers, start=1):
            col_letter = get_column_letter(i)
            ws.column_dimensions[col_letter].width = len(header) + 7
            for row in range(1, 1001):
                ws[f"{col_letter}{row}"].font = openpyxl.styles.Font(bold=True, name="Calibri1")
                ws.row_dimensions[row].height = 25
                ws[f"{col_letter}{row}"].border = openpyxl.styles.Border(
                    left=openpyxl.styles.Side(style='thin'),
                    right=openpyxl.styles.Side(style='thin'),
                    top=openpyxl.styles.Side(style='thin'),
                    bottom=openpyxl.styles.Side(style='thin')
                )

        row_num = 2
        for inscriere in inscrieri:
            sportiv = inscriere.sportiv
            categorie = inscriere.categorie
            if any(p.lower() in categorie.proba.nume.lower() for p in ["Polydamas", "Palaismata"]):
                taxa = 75
            else:
                taxa = 100
            values = [
                sportiv.nr_legitimatie,
                f"{sportiv.nume} {sportiv.prenume}",
                sportiv.club.nume if sportiv.club else "",
                sportiv.sex,
                sportiv.cnp,
                sportiv.data_nastere.strftime("%d.%m.%Y"),
                f"{categorie.varsta_min}-{categorie.varsta_max}",
                f"{categorie.categorie_greutate} KG" if categorie.categorie_greutate else "",
                categorie.proba.nume,
                inscriere.meci_demonstrativ,
                taxa,
            ]
            for col_num, value in enumerate(values, start=1):
                ws.cell(row=row_num, column=col_num).value = value
            row_num += 1

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
        try:
            col_nr_leg = header.index("NR LEG")
            col_nume_si_prenume = header.index("NUME SI PRENUME")
            col_club = header.index("CLUB")
            col_gen = header.index("GEN")
            col_cnp = header.index("CNP")
            col_data_nasterii = header.index("DATA NASTERII")
            col_cat_kg = header.index("CATEGORIE KG")
            col_proba = header.index("PROBA")
            col_meci_demonstrativ = header.index("MECI")
        except ValueError as e:
            return Response({"detail": f"Header lipsa: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row or all(cell is None for cell in row):
                    continue

                try:
                    nume_prenume = str(row[col_nume_si_prenume]).strip()
                    nume, prenume = nume_prenume.split(" ", 1)
                except Exception:
                    continue

                nr_leg = row[col_nr_leg]
                club_nume = row[col_club]
                sex = row[col_gen]
                if sex == "Masculin":
                    sex = "M"
                elif sex == "Feminin":
                    sex = "F"
                cnp = row[col_cnp]
                data_nastere = row[col_data_nasterii]
                cat_greutate = row[col_cat_kg]
                proba_nume = row[col_proba]
                meci_demonstrativ = row[col_meci_demonstrativ]

                if not all([nr_leg, nume, prenume, club_nume, sex, cnp, data_nastere, proba_nume]):
                    continue

                try:
                    data_nastere = datetime.strptime(str(data_nastere), "%d.%m.%Y").date()
                except Exception:
                    continue

                if len(str(cnp)) != 13:
                    continue

                club, _ = Club.objects.get_or_create(nume=club_nume)

                sportiv, _ = Sportiv.objects.get_or_create(cnp=cnp, defaults={
                    "nume": nume,
                    "prenume": prenume,
                    "sex": sex,
                    "club": club,
                    "data_nastere": data_nastere,
                    "nr_legitimatie": nr_leg,
                })

                varsta = competitie.data_incepere.year - data_nastere.year

                proba_obj, _ = Proba.objects.get_or_create(nume=proba_nume)

                if not Categorie.objects.filter(proba=proba_obj).exists():
                    populate_categorii_standard(proba_obj)

                # Tratament special pentru Polydamas / Palaismata
                if any(p.lower() in proba_obj.nume.lower() for p in ["Polydamas", "Palaismata"]):
                    categorie = Categorie.objects.filter(
                        proba=proba_obj,
                        varsta_min__lte=varsta,
                        varsta_max__gte=varsta
                    ).first()
                else:
                    def parse_categorie_greutate(raw_kg):
                        try:
                            raw_kg = str(raw_kg).strip().replace(" ", "").replace("KG", "").replace("kg", "")
                            return raw_kg
                        except Exception:
                            return None

                    cat_greutate = parse_categorie_greutate(cat_greutate)
                    if cat_greutate is None:
                        continue

                    categorie = Categorie.objects.filter(
                        proba=proba_obj,
                        sex=sex,
                        varsta_min__lte=varsta,
                        varsta_max__gte=varsta,
                        categorie_greutate=cat_greutate
                    ).first()

                if not categorie:
                    continue

                if not Inscriere.objects.filter(
                    sportiv=sportiv,
                    categorie=categorie,
                    competitie=competitie
                ).exists():
                    Inscriere.objects.create(
                        sportiv=sportiv,
                        categorie=categorie,
                        competitie=competitie,
                        varsta=varsta,
                        meci_demonstrativ=meci_demonstrativ,
                    )
                added_count += 1

            except Exception as e:
                print(f"Randul {idx}: {str(e)}")

        # Get a list of all inscrieri for the competition
        inscrieri = Inscriere.objects.filter(competitie=competitie).select_related("sportiv", "categorie__proba", "sportiv__club")
        genereaza_bracket_si_meciuri(inscrieri, competitie) 

        return Response({
            "detail": f"{added_count} inscrieri adaugate",
        }, status=status.HTTP_201_CREATED)



