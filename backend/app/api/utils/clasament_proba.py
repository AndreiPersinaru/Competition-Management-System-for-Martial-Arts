from collections import defaultdict
from django.db import transaction
from ..models import Meci, Sportiv, ClasamentProba
import logging

logger = logging.getLogger(__name__)

class ClasamentProbaCalculator:
    """
    Calculează clasamentul pentru o probă pe baza rezultatelor efective ale meciurilor.
    """
    
    def __init__(self, competitie, categorie):
        self.competitie = competitie
        self.categorie = categorie
        self.meciuri = Meci.objects.filter(
            competitie=competitie,
            categorie=categorie,
            castigator__isnull=False  # Doar meciurile finalizate
        )
    
    def calculeaza_clasament(self):
        """
        Calculează clasamentul complet pentru categoria dată.
        """
        tipul_competitie = self._determina_tipul_competitie()
        
        if tipul_competitie == 'turneu':
            return self._calculeaza_clasament_turneu()
        elif tipul_competitie == 'best_of_3':
            return self._calculeaza_clasament_best_of_3()
        elif tipul_competitie == 'round_robin':
            return self._calculeaza_clasament_round_robin()
        else:
            logger.warning(f"Tip de competiție necunoscut pentru {self.categorie}")
            return []
    
    def _determina_tipul_competitie(self):
        """
        Determină tipul de competiție pe baza rundelor existente.
        """
        runde = set(meci.runda for meci in self.meciuri)
        
        if any('Finala' in runda for runda in runde):
            return 'turneu'
        elif any('Best of 3' in runda for runda in runde):
            return 'best_of_3'
        elif any('Round Robin' in runda for runda in runde):
            return 'round_robin'
        else:
            # Default la turneu dacă nu știm sigur
            return 'turneu'
    
    def _calculeaza_clasament_turneu(self):
        """
        Pentru turnee: câștigătorul finalei este locul 1, 
        finalistul învins este locul 2, etc.
        """
        clasament = []
        
        # Găsim finala
        finala = self.meciuri.filter(runda__icontains='Finala').first()
        if finala:
            # Locul 1: Câștigătorul finalei
            clasament.append({
                'pozitie': 1,
                'sportiv': finala.castigator,
                'detalii': 'Câștigător finală'
            })
            
            # Locul 2: Finalistul învins
            finalist_invins = finala.sportiv2 if finala.castigator == finala.sportiv1 else finala.sportiv1
            clasament.append({
                'pozitie': 2,
                'sportiv': finalist_invins,
                'detalii': 'Finalist'
            })
        
        # Semifinalištii (locurile 3-4)
        semifinale = self.meciuri.filter(runda__icontains='Semifinala')
        semifinalisti_invins = []
        for semi in semifinale:
            invins = semi.sportiv2 if semi.castigator == semi.sportiv1 else semi.sportiv1
            if invins not in [item['sportiv'] for item in clasament]:
                semifinalisti_invins.append(invins)
        
        for i, sportiv in enumerate(semifinalisti_invins):
            clasament.append({
                'pozitie': 3 + i,
                'sportiv': sportiv,
                'detalii': 'Semifinalist'
            })
        
        # Sfertfinaliștii (locurile 5-8)
        sferturi = self.meciuri.filter(runda__icontains='Sferturi')
        sfertfinalisti_invins = []
        for sferturi_meci in sferturi:
            invins = sferturi_meci.sportiv2 if sferturi_meci.castigator == sferturi_meci.sportiv1 else sferturi_meci.sportiv1
            if invins not in [item['sportiv'] for item in clasament]:
                sfertfinalisti_invins.append(invins)
        
        for i, sportiv in enumerate(sfertfinalisti_invins):
            clasament.append({
                'pozitie': 5 + i,
                'sportiv': sportiv,
                'detalii': 'Sfertfinalist'
            })
        
        # Optimi (locurile 9-16)
        optimi = self.meciuri.filter(runda__icontains='Optimi')
        optimisti_invins = []
        for optimi_meci in optimi:
            invins = optimi_meci.sportiv2 if optimi_meci.castigator == optimi_meci.sportiv1 else optimi_meci.sportiv1
            if invins not in [item['sportiv'] for item in clasament]:
                optimisti_invins.append(invins)
        
        for i, sportiv in enumerate(optimisti_invins):
            clasament.append({
                'pozitie': 9 + i,
                'sportiv': sportiv,
                'detalii': 'Optimi'
            })
        
        return clasament
    
    def _calculeaza_clasament_best_of_3(self):
        """
        Pentru Best of 3: se numără victoriile pentru fiecare sportiv.
        """
        victorii_per_sportiv = defaultdict(int)
        sportivi_participanti = set()
        
        for meci in self.meciuri:
            sportivi_participanti.add(meci.sportiv1)
            sportivi_participanti.add(meci.sportiv2)
            victorii_per_sportiv[meci.castigator] += 1
        
        # Sortăm după numărul de victorii (descrescător)
        sportivi_sortati = sorted(
            sportivi_participanti,
            key=lambda s: victorii_per_sportiv[s],
            reverse=True
        )
        
        clasament = []
        for i, sportiv in enumerate(sportivi_sortati):
            clasament.append({
                'pozitie': i + 1,
                'sportiv': sportiv,
                'detalii': f'{victorii_per_sportiv[sportiv]} victorii'
            })
        
        return clasament
    
    def _calculeaza_clasament_round_robin(self):
        """
        Pentru Round Robin: se numără victoriile, în caz de egalitate
        se folosește diferența de puncte.
        """
        victorii_per_sportiv = defaultdict(int)
        diferenta_puncte_per_sportiv = defaultdict(int)
        sportivi_participanti = set()
        
        for meci in self.meciuri:
            sportivi_participanti.add(meci.sportiv1)
            sportivi_participanti.add(meci.sportiv2)
            
            # Numărăm victoria
            victorii_per_sportiv[meci.castigator] += 1
            
            # Calculăm diferența de puncte
            if meci.castigator == meci.sportiv1:
                diferenta_puncte_per_sportiv[meci.sportiv1] += (meci.scor1 - meci.scor2)
                diferenta_puncte_per_sportiv[meci.sportiv2] += (meci.scor2 - meci.scor1)
            else:
                diferenta_puncte_per_sportiv[meci.sportiv2] += (meci.scor2 - meci.scor1)
                diferenta_puncte_per_sportiv[meci.sportiv1] += (meci.scor1 - meci.scor2)
        
        # Sortăm după numărul de victorii, apoi după diferența de puncte
        sportivi_sortati = sorted(
            sportivi_participanti,
            key=lambda s: (victorii_per_sportiv[s], diferenta_puncte_per_sportiv[s]),
            reverse=True
        )
        
        clasament = []
        for i, sportiv in enumerate(sportivi_sortati):
            clasament.append({
                'pozitie': i + 1,
                'sportiv': sportiv,
                'detalii': f'{victorii_per_sportiv[sportiv]} victorii, +{diferenta_puncte_per_sportiv[sportiv]} diferență'
            })
        
        return clasament
    
    def actualizeaza_clasament_in_baza_de_date(self):
        """
        Actualizează clasamentul în baza de date cu pozițiile calculate.
        """
        clasament = self.calculeaza_clasament()
        
        try:
            with transaction.atomic():
                # Ștergem clasamentul existent pentru această categorie
                ClasamentProba.objects.filter(
                    competitie=self.competitie,
                    categorie=self.categorie
                ).delete()
                
                # Creăm noile înregistrări de clasament
                for item in clasament:
                    ClasamentProba.objects.create(
                        competitie=self.competitie,
                        categorie=self.categorie,
                        sportiv=item['sportiv'],
                        puncte=item['pozitie']  # Folosim puncte pentru a stoca poziția
                    )
                
                logger.info(f"Clasament actualizat pentru {self.categorie}: {len(clasament)} poziții")
        
        except Exception as e:
            logger.error(f"Eroare la actualizarea clasamentului pentru {self.categorie}: {e}")
            raise


def actualizeaza_clasament_dupa_meci(meci):
    """
    Funcție helper pentru a actualiza clasamentul după finalizarea unui meci.
    """
    calculator = ClasamentProbaCalculator(meci.competitie, meci.categorie)
    calculator.actualizeaza_clasament_in_baza_de_date()


def actualizeaza_clasament_pentru_categorie(competitie, categorie):
    """
    Funcție helper pentru a actualiza clasamentul pentru o categorie specifică.
    """
    calculator = ClasamentProbaCalculator(competitie, categorie)
    return calculator.actualizeaza_clasament_in_baza_de_date()


def obtine_clasament_pentru_categorie(competitie, categorie):
    """
    Funcție helper pentru a obține clasamentul calculat pentru o categorie.
    """
    calculator = ClasamentProbaCalculator(competitie, categorie)
    return calculator.calculeaza_clasament()