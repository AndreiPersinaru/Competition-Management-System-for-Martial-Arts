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
                pierzator = None
                
                if castigator_id:
                    if castigator_id == meci.sportiv1.id:
                        castigator = meci.sportiv1
                        pierzator = meci.sportiv2
                    elif castigator_id == meci.sportiv2.id:
                        castigator = meci.sportiv2
                        pierzator = meci.sportiv1
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
                
                # Gestionăm avansarea în bracket
                created_matches = self._gestioneaza_avansare_bracket(meci, castigator, pierzator)
                
                # Actualizăm clasamentul în funcție de tipul de turneu
                self._actualizeaza_clasament_universal(meci)
                
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
                
                if created_matches:
                    response_data['createdMatches'] = [
                        {
                            'id': match.id,
                            'runda': match.runda,
                            'sportiv1': str(match.sportiv1) if match.sportiv1 else None,
                            'sportiv2': str(match.sportiv2) if match.sportiv2 else None
                        } for match in created_matches
                    ]
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Eroare la finalizarea meciului {meci.id}: {str(e)}")
            return Response({
                'error': 'Eroare la finalizarea meciului',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _gestioneaza_avansare_bracket(self, meci_curent, castigator, pierzator):
        """
        Gestionează avansarea sportivilor în bracket după finalizarea unui meci.
        """
        created_matches = []
        
        # Verificăm tipul de rundă
        runda = meci_curent.runda.lower()
        
        if 'semifinala' in runda:
            # După semifinale: câștigătorul merge în finală, pierzătorul în loser bracket
            
            # 1. Găsim sau creăm finala
            finala = self._gaseste_sau_creeaza_finala(meci_curent, castigator)
            if finala:
                created_matches.append(finala)
            
            # 2. Găsim sau creăm meciul pentru locul 3 (loser bracket)
            meci_loc3 = self._gaseste_sau_creeaza_meci_loc3(meci_curent, pierzator)
            if meci_loc3:
                created_matches.append(meci_loc3)
                
        elif 'sferturi' in runda or 'optimi' in runda:
            # Pentru alte runde, folosim logica existentă
            next_meci = self._creeaza_urmatorul_meci(meci_curent, castigator)
            if next_meci:
                created_matches.append(next_meci)
        
        return created_matches
    
    def _gaseste_sau_creeaza_finala(self, meci_curent, castigator):
        """
        Găsește finala existentă sau o creează dacă nu există.
        """
        # Căutăm finala existentă
        finala = Meci.objects.filter(
            competitie=meci_curent.competitie,
            categorie=meci_curent.categorie,
            runda='Finala'
        ).first()
        
        if finala:
            # Adăugăm câștigătorul în prima poziție liberă
            if finala.sportiv1 is None:
                finala.sportiv1 = castigator
                finala.save()
                logger.info(f"Câștigător {castigator} adăugat în finala existentă ca sportiv1")
            elif finala.sportiv2 is None:
                finala.sportiv2 = castigator
                finala.save()
                logger.info(f"Câștigător {castigator} adăugat în finala existentă ca sportiv2")
            return finala
        else:
            # Creăm finala nouă
            finala = Meci.objects.create(
                competitie=meci_curent.competitie,
                categorie=meci_curent.categorie,
                sportiv1=castigator,
                runda='Finala',
                pozitie_in_bracket=1,
                pozitie_in_runda=1
            )
            logger.info(f"Finala creată cu {castigator}")
            return finala
    
    def _gaseste_sau_creeaza_meci_loc3(self, meci_curent, pierzator):
        """
        Găsește meciul pentru locul 3 sau îl creează dacă nu există.
        """
        # Căutăm meciul pentru locul 3
        meci_loc3 = Meci.objects.filter(
            competitie=meci_curent.competitie,
            categorie=meci_curent.categorie,
            runda='Locul 3'
        ).first()
        
        if meci_loc3:
            # Adăugăm pierzătorul în prima poziție liberă
            if meci_loc3.sportiv1 is None:
                meci_loc3.sportiv1 = pierzator
                meci_loc3.save()
                logger.info(f"Pierzător {pierzator} adăugat în meciul pentru locul 3 ca sportiv1")
            elif meci_loc3.sportiv2 is None:
                meci_loc3.sportiv2 = pierzator
                meci_loc3.save()
                logger.info(f"Pierzător {pierzator} adăugat în meciul pentru locul 3 ca sportiv2")
            return meci_loc3
        else:
            # Creăm meciul pentru locul 3
            meci_loc3 = Meci.objects.create(
                competitie=meci_curent.competitie,
                categorie=meci_curent.categorie,
                sportiv1=pierzator,
                runda='Locul 3',
                pozitie_in_bracket=1,
                pozitie_in_runda=1
            )
            logger.info(f"Meci pentru locul 3 creat cu {pierzator}")
            return meci_loc3
    
    def _actualizeaza_clasament_universal(self, meci):
        """
        Actualizează clasamentul în funcție de tipul de turneu:
        - Turnee de 2 persoane (best of 3): după finalizarea tuturor meciurilor
        - Turnee de 3 persoane (round robin): după finalizarea tuturor meciurilor
        - Turnee de 4+ persoane (knockout): după finală și locul 3
        """
        try:
            # Identificăm tipul de turneu pe baza meciurilor existente
            toate_meciurile = Meci.objects.filter(
                competitie=meci.competitie,
                categorie=meci.categorie
            )
            
            # Verificăm dacă există runde specifice pentru turnee mari
            are_finala = toate_meciurile.filter(runda='Finala').exists()
            are_semifinale = toate_meciurile.filter(runda__icontains='Semifinala').exists()
            
            # Numărăm meciurile cu structură specifică
            meciuri_numerotate = toate_meciurile.filter(
                runda__icontains='Meci 1'
            ) | toate_meciurile.filter(
                runda__icontains='Meci 2'
            ) | toate_meciurile.filter(
                runda__icontains='Meci 3'
            )
            
            print(f"Număr meciuri numerotate: {meciuri_numerotate.count()}")
            if meciuri_numerotate.count() == 3:
                # Turneu de 2-3 persoane
                self._actualizeaza_clasament_mic_turneu(meci)
            elif are_finala or are_semifinale:
                # Turneu de 4+ persoane - folosim logica existentă doar pentru finale
                if any(keyword in meci.runda.lower() for keyword in ['finala', 'locul 3']):
                    self._actualizeaza_clasament_proba(meci)
            
        except Exception as e:
            logger.error(f"Eroare la actualizarea clasamentului universal: {e}")
    
    def _actualizeaza_clasament_mic_turneu(self, meci):
        """
        Actualizează clasamentul pentru turneele cu 2-3 persoane.
        """
        try:
            print(f"Actualizare clasament mic turneu pentru {meci}")
            # Obținem toate meciurile din această categorie
            toate_meciurile = Meci.objects.filter(
                competitie=meci.competitie,
                categorie=meci.categorie,
            )
            print(f"Număr meciuri: {toate_meciurile.count()}")
            
            # Verificăm dacă toate meciurile sunt finalizate
            meciuri_finalizate = toate_meciurile.filter(castigator__isnull=False)
            if meciuri_finalizate.count() != toate_meciurile.count():
                logger.info(f"Nu toate meciurile sunt finalizate în categoria {meci.categorie}")
                return
            
            # Identificăm toți sportivii participanți
            sportivi = set()
            for m in toate_meciurile:
                if m.sportiv1:
                    sportivi.add(m.sportiv1) 
                if m.sportiv2:
                    sportivi.add(m.sportiv2)
            
            sportivi = list(sportivi)
            
            # Ștergem clasamentul existent
            ClasamentProba.objects.filter(
                competitie=meci.competitie,
                categorie=meci.categorie
            ).delete()
            
            if len(sportivi) == 2:
                # Turneu de 2 persoane - best of 3
                self._clasament_2_persoane(meci, sportivi, meciuri_finalizate)
            elif len(sportivi) == 3:
                # Turneu de 3 persoane - round robin
                self._clasament_3_persoane(meci, sportivi, meciuri_finalizate)
            
            logger.info(f"Clasament actualizat pentru turneu mic în categoria {meci.categorie}")
            
        except Exception as e:
            logger.error(f"Eroare la actualizarea clasamentului mic turneu: {e}")
    
    def _clasament_2_persoane(self, meci, sportivi, meciuri_finalizate):
        """
        Calculează clasamentul pentru turneu de 2 persoane (best of 3).
        """
        # Numărăm câștigurile pentru fiecare sportiv
        castiguri = {}
        for sportiv in sportivi:
            castiguri[sportiv] = meciuri_finalizate.filter(castigator=sportiv).count()
        
        # Sortăm după numărul de câștiguri
        clasament = sorted(sportivi, key=lambda s: castiguri[s], reverse=True)
        
        # Creăm clasamentul
        for pozitie, sportiv in enumerate(clasament, 1):
            ClasamentProba.objects.create(
                competitie=meci.competitie,
                categorie=meci.categorie,
                sportiv=sportiv,
                puncte=pozitie
            )
        
        logger.info(f"Clasament 2 persoane: {[(str(s), castiguri[s]) for s in clasament]}")
    
    def _clasament_3_persoane(self, meci, sportivi, meciuri_finalizate):
        """
        Calculează clasamentul pentru turneu de 3 persoane (round robin).
        """
        # Calculăm statisticile pentru fiecare sportiv
        stats = {}
        for sportiv in sportivi:
            stats[sportiv] = {
                'victorii': 0,
                'puncte_marcate': 0,
                'puncte_primite': 0,
                'diferenta': 0
            }
        
        # Parcurgem toate meciurile pentru a calcula statisticile
        for m in meciuri_finalizate:
            if m.sportiv1 and m.sportiv2 and m.castigator:
                # Actualizăm statisticile pentru câștigător
                stats[m.castigator]['victorii'] += 1
                
                # Actualizăm punctele
                stats[m.sportiv1]['puncte_marcate'] += m.scor1 or 0
                stats[m.sportiv1]['puncte_primite'] += m.scor2 or 0
                stats[m.sportiv2]['puncte_marcate'] += m.scor2 or 0
                stats[m.sportiv2]['puncte_primite'] += m.scor1 or 0
        
        # Calculăm diferența de puncte
        for sportiv in sportivi:
            stats[sportiv]['diferenta'] = (
                stats[sportiv]['puncte_marcate'] - stats[sportiv]['puncte_primite']
            )
        
        # Sortăm sportivii:
        # 1. După numărul de victorii (descrescător)
        # 2. După diferența de puncte (descrescător)  
        # 3. După punctele marcate (descrescător)
        clasament = sorted(
            sportivi,
            key=lambda s: (
                stats[s]['victorii'],
                stats[s]['diferenta'], 
                stats[s]['puncte_marcate']
            ),
            reverse=True
        )
        
        # Creăm clasamentul
        for pozitie, sportiv in enumerate(clasament, 1):
            ClasamentProba.objects.create(
                competitie=meci.competitie,
                categorie=meci.categorie,
                sportiv=sportiv,
                puncte=pozitie
            )
        
        logger.info(f"Clasament 3 persoane: {[(str(s), stats[s]) for s in clasament]}")
    
    def _actualizeaza_clasament_proba(self, meci):
        """
        Actualizează clasamentul pe probă după finalizarea finalei sau meciului pentru locul 3.
        (Funcția originală pentru turnee de 4+ persoane)
        """
        try:
            # Găsim toate meciurile relevante pentru clasament
            finala = Meci.objects.filter(
                competitie=meci.competitie,
                categorie=meci.categorie,
                runda='Finala',
                castigator__isnull=False
            ).first()
            
            meci_loc3 = Meci.objects.filter(
                competitie=meci.competitie,
                categorie=meci.categorie,
                runda='Locul 3',
                castigator__isnull=False
            ).first()
            
            # Ștergem clasamentul existent pentru această categorie
            ClasamentProba.objects.filter(
                competitie=meci.competitie,
                categorie=meci.categorie
            ).delete()
            
            # Clasificări pe baza rezultatelor
            if finala:
                # Locul 1: câștigătorul finalei
                ClasamentProba.objects.create(
                    competitie=meci.competitie,
                    categorie=meci.categorie,
                    sportiv=finala.castigator,
                    puncte=1  # Puncte pentru locul 1
                )
                
                # Locul 2: pierzătorul finalei
                pierzator_finala = finala.sportiv2 if finala.castigator == finala.sportiv1 else finala.sportiv1
                ClasamentProba.objects.create(
                    competitie=meci.competitie,
                    categorie=meci.categorie,
                    sportiv=pierzator_finala,
                    puncte=2  # Puncte pentru locul 2
                )
            
            if meci_loc3:
                # Locul 3: câștigătorul meciului pentru locul 3
                ClasamentProba.objects.create(
                    competitie=meci.competitie,
                    categorie=meci.categorie,
                    sportiv=meci_loc3.castigator,
                    puncte=3  # Puncte pentru locul 3
                )
                
                # Locul 4: pierzătorul meciului pentru locul 3
                pierzator_loc3 = meci_loc3.sportiv2 if meci_loc3.castigator == meci_loc3.sportiv1 else meci_loc3.sportiv1
                ClasamentProba.objects.create(
                    competitie=meci.competitie,
                    categorie=meci.categorie,
                    sportiv=pierzator_loc3,
                    puncte=4  # Puncte pentru locul 4
                )
            
            logger.info(f"Clasament actualizat pentru categoria {meci.categorie}")
            
        except Exception as e:
            logger.error(f"Eroare la actualizarea clasamentului: {e}")
    
    def _creeaza_urmatorul_meci(self, meci_curent, castigator):
        """
        Creează următorul meci în bracket pentru rundele non-finale.
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
                'Sferturi': 'Semifinala'
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
            if 'sferturi' in meci_curent.runda.lower():
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