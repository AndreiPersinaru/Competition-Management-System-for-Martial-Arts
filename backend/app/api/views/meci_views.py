from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import transaction
from django.shortcuts import get_object_or_404
from ..models import Meci, Sportiv, ClasamentProba
from ..serializers import MeciSerializer
import logging

logger = logging.getLogger(__name__)

class MeciViewSet(viewsets.ModelViewSet):
    queryset = Meci.objects.all()
    serializer_class = MeciSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['competitie', 'categorie']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [AllowAny()]

    def get_authenticators(self):
        if self.request.method == 'GET':
            return []
        return []

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def finalizare(self, request, pk=None):
        """
        Finalizează un meci și creează următorul meci în bracket dacă este cazul.
        """
        meci = self.get_object()
        
        # Validăm că meciul nu este deja finalizat
        if meci.castigator is not None:
            return Response({
                'error': 'Meciul este deja finalizat',
                'message': f'Meciul a fost câștigat de {meci.castigator}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validăm că ambii sportivi sunt prezenți
        if not meci.sportiv1 or not meci.sportiv2:
            return Response({
                'error': 'Meciul nu poate fi finalizat',
                'message': 'Lipsesc sportivii pentru acest meci'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Extragem datele din request
        scor1 = request.data.get('scor1', 0)
        scor2 = request.data.get('scor2', 0)
        castigator_id = request.data.get('castigator')
        diferenta_activata = request.data.get('diferenta_activata', False)
        
        try:
            with transaction.atomic():
                castigator = None
                if castigator_id:
                    if castigator_id == meci.sportiv1.id:
                        castigator = meci.sportiv1
                    elif castigator_id == meci.sportiv2.id:
                        castigator = meci.sportiv2
                    else:
                        return Response({
                            'error': 'Câștigător invalid',
                            'message': 'Câștigătorul specificat nu participă la acest meci'
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                # Actualizăm meciul
                meci.scor1 = scor1
                meci.scor2 = scor2
                meci.castigator = castigator
                meci.diferenta_activata = diferenta_activata
                meci.save()
                
                logger.info(f"Meci finalizat: {meci} - Scor: {scor1}-{scor2} - Câștigător: {castigator}")
                
                # Actualizăm clasamentul pe probă
                self._actualizeaza_clasament_proba(meci, castigator)
                
                # Verificăm și creăm următorul meci
                next_meci = self._creeaza_urmatorul_meci(meci, castigator)
                
                # Pregătim răspunsul
                response_data = {
                    'message': 'Meci finalizat cu succes',
                    'meci': {
                        'id': meci.id,
                        'scor1': meci.scor1,
                        'scor2': meci.scor2,
                        'castigator': meci.castigator.id if meci.castigator else None,
                        'castigator_nume': str(meci.castigator) if meci.castigator else None
                    }
                }
                
                if next_meci:
                    response_data['nextMatch'] = {
                        'id': next_meci.id,
                        'runda': next_meci.runda,
                        'sportiv1': str(next_meci.sportiv1) if next_meci.sportiv1 else None,
                        'sportiv2': str(next_meci.sportiv2) if next_meci.sportiv2 else None
                    }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Eroare la finalizarea meciului {meci.id}: {str(e)}")
            return Response({
                'error': 'Eroare la finalizarea meciului',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _actualizeaza_clasament_proba(self, meci, castigator):
        """
        Actualizează clasamentul pe probă folosind calculatorul de clasament.
        """
        from ..utils.clasament_proba import actualizeaza_clasament_dupa_meci
        
        try:
            # Actualizăm clasamentul folosind noul sistem
            actualizeaza_clasament_dupa_meci(meci)
            logger.info(f"Clasament actualizat pentru {meci.categorie} după meciul {meci.id}")
        except Exception as e:
            logger.error(f"Eroare la actualizarea clasamentului pentru meciul {meci.id}: {e}")
            # Nu ridicăm excepția pentru a nu bloca finalizarea meciului
    
    def _get_puncte_pentru_runda(self, runda, este_castigator):
        """
        Returnează punctele acordate pentru o anumită rundă.
        """
        # Punctajul poate fi customizat în funcție de regulile competiției
        puncte_map = {
            'Finala': {'castigator': 50, 'infrant': 30},
            'Semifinala': {'castigator': 30, 'infrant': 20},
            'Sferturi': {'castigator': 20, 'infrant': 10},
            'Optimi': {'castigator': 10, 'infrant': 5},
            'Best of 3': {'castigator': 25, 'infrant': 15},
            'Round Robin': {'castigator': 15, 'infrant': 5}
        }
        
        # Extragem tipul rundei din șirul de caractere
        for tip_runda in puncte_map.keys():
            if tip_runda.lower() in runda.lower():
                return puncte_map[tip_runda]['castigator' if este_castigator else 'infrant']
        
        # Puncte default
        return 10 if este_castigator else 5
    
    def _creeaza_urmatorul_meci(self, meci_curent, castigator):
        """
        Creează următorul meci în bracket dacă este cazul.
        """
        if not castigator:
            return None
        
        # Căutăm meciul următor în bracket
        next_meci = meci_curent.next_meci
        if not next_meci:
            # Încearcăm să găsim meciul următor pe baza poziției în bracket
            next_meci = self._gaseste_next_meci_automat(meci_curent)
        
        if next_meci:
            # Determinăm în ce poziție trebuie să intre câștigătorul
            if next_meci.sportiv1 is None:
                next_meci.sportiv1 = castigator
            elif next_meci.sportiv2 is None:
                next_meci.sportiv2 = castigator
            else:
                logger.warning(f"Meciul următor {next_meci.id} are deja ambii sportivi")
                return None
            
            next_meci.save()
            logger.info(f"Câștigător {castigator} avansat la meciul {next_meci.id}")
            return next_meci
        else:
            # Verificăm dacă trebuie să creăm un meci următor
            return self._creeaza_meci_urmator_automat(meci_curent, castigator)
    
    def _gaseste_next_meci_automat(self, meci_curent):
        """
        Găsește automat următorul meci pe baza poziției în bracket.
        """
        try:
            # Pentru bracket-urile standard, următorul meci are pozitia_in_bracket / 2
            next_pozitie = (meci_curent.pozitie_in_bracket + 1) // 2
            
            # Determinăm următoarea rundă
            runda_map = {
                'Optimi': 'Sferturi',
                'Sferturi': 'Semifinala',
                'Semifinala': 'Finala'
            }
            
            next_runda = None
            for runda_curenta, runda_urmatoare in runda_map.items():
                if runda_curenta.lower() in meci_curent.runda.lower():
                    next_runda = runda_urmatoare
                    break
            
            if next_runda:
                # Căutăm meciul următor existent
                return Meci.objects.filter(
                    competitie=meci_curent.competitie,
                    categorie=meci_curent.categorie,
                    runda=next_runda,
                    pozitie_in_bracket=next_pozitie
                ).first()
            
        except Exception as e:
            logger.error(f"Eroare la găsirea meciului următor: {e}")
        
        return None
    
    def _creeaza_meci_urmator_automat(self, meci_curent, castigator):
        """
        Creează automat următorul meci dacă nu există.
        """
        try:
            # Pentru Best of 3, nu creăm meciuri noi
            if 'best of 3' in meci_curent.runda.lower():
                return None
            
            # Pentru Round Robin, nu creăm meciuri noi
            if 'round robin' in meci_curent.runda.lower():
                return None
            
            # Verificăm dacă există alte meciuri din aceeași rundă neeterminate
            meciuri_neeterminate = Meci.objects.filter(
                competitie=meci_curent.competitie,
                categorie=meci_curent.categorie,
                runda=meci_curent.runda,
                castigator__isnull=True
            )
            
            # Dacă mai sunt meciuri neterminate în aceeași rundă, nu creăm meciul următor
            if meciuri_neeterminate.exists():
                return None
            
            # Verificăm rundele pentru a determina următoarea
            if 'semifinala' in meci_curent.runda.lower():
                # După semifinale vine finala
                semifinalele = Meci.objects.filter(
                    competitie=meci_curent.competitie,
                    categorie=meci_curent.categorie,
                    runda__icontains='Semifinala',
                    castigator__isnull=False
                )
                
                if semifinalele.count() == 2:
                    # Ambele semifinale sunt terminate, creăm finala
                    castigatori = [s.castigator for s in semifinalele]
                    
                    finala = Meci.objects.create(
                        competitie=meci_curent.competitie,
                        categorie=meci_curent.categorie,
                        sportiv1=castigatori[0],
                        sportiv2=castigatori[1],
                        runda='Finala',
                        pozitie_in_bracket=1,
                        pozitie_in_runda=1
                    )
                    
                    logger.info(f"Finala creată automat: {finala}")
                    return finala
            
            elif 'sferturi' in meci_curent.runda.lower():
                # După sferturi vin semifinalele
                sferturile = Meci.objects.filter(
                    competitie=meci_curent.competitie,
                    categorie=meci_curent.categorie,
                    runda__icontains='Sferturi',
                    castigator__isnull=False
                )
                
                if sferturile.count() == 4:
                    # Toate sferturile sunt terminate, creăm semifinalele
                    castigatori = [s.castigator for s in sferturile.order_by('pozitie_in_bracket')]
                    
                    # Creăm prima semifinală
                    semi1 = Meci.objects.create(
                        competitie=meci_curent.competitie,
                        categorie=meci_curent.categorie,
                        sportiv1=castigatori[0],
                        sportiv2=castigatori[1],
                        runda='Semifinala',
                        pozitie_in_bracket=1,
                        pozitie_in_runda=1
                    )
                    
                    # Creăm a doua semifinală
                    semi2 = Meci.objects.create(
                        competitie=meci_curent.competitie,
                        categorie=meci_curent.categorie,
                        sportiv1=castigatori[2],
                        sportiv2=castigatori[3],
                        runda='Semifinala',
                        pozitie_in_bracket=2,
                        pozitie_in_runda=2
                    )
                    
                    logger.info(f"Semifinale create automat: {semi1}, {semi2}")
                    
                    # Returnăm prima semifinală dacă câștigătorul curent participă
                    if castigator in [semi1.sportiv1, semi1.sportiv2]:
                        return semi1
                    elif castigator in [semi2.sportiv1, semi2.sportiv2]:
                        return semi2
            
        except Exception as e:
            logger.error(f"Eroare la crearea meciului următor: {e}")
        
        return None