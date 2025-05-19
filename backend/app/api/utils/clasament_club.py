
from collections import defaultdict
from django.db import transaction
from ..models import ClasamentProba, ClasamentClub, Club, Sportiv, Competitie, Categorie
import logging

logger = logging.getLogger(__name__)

class ClasamentClubCalculator:
    """
    Calculează clasamentul pentru cluburi pe baza rezultatelor sportivilor.
    """
    
    def __init__(self, competitie):
        self.competitie = competitie
        self.clasamente_proba = ClasamentProba.objects.filter(
            competitie=competitie
        ).select_related('sportiv', 'sportiv__club', 'categorie')
    
    def calculeaza_clasament_cluburi(self):
        """
        Calculează clasamentul complet pentru cluburi.
        Criterii:
        - loc 1: 5 pct (3 pct dacă doar 2 sportivi, 0 pct dacă doar 1 sportiv)
        - loc 2: 3 pct (1 pct dacă doar 2 sportivi)
        - loc 3: 1 pct
        """
        cluburi_puncte = defaultdict(int)
        
        # Grupăm clasamentele pe categorii pentru a determina câți sportivi sunt
        categorii_clasamente = defaultdict(list)
        for clasament in self.clasamente_proba:
            categorie_key = (
                clasament.categorie.id,
                clasament.categorie.proba.nume,
                clasament.categorie.sex,
                clasament.categorie.categorie_greutate
            )
            categorii_clasamente[categorie_key].append(clasament)
        
        # Pentru fiecare categorie, calculăm punctele
        for categorie_key, clasamente_categorie in categorii_clasamente.items():
            # Sortăm după poziție (puncte în ClasamentProba reprezintă poziția)
            clasamente_categorie.sort(key=lambda x: x.puncte)
            
            nr_sportivi = len(clasamente_categorie)
            
            if nr_sportivi == 0:
                continue
            elif nr_sportivi == 1:
                # Un singur sportiv - 0 puncte
                pass
            elif nr_sportivi == 2:
                # Doi sportivi
                # Locul 1: 3 puncte
                # Locul 2: 1 punct
                for i, clasament in enumerate(clasamente_categorie):
                    if clasament.sportiv.club:
                        if i == 0:  # Locul 1
                            cluburi_puncte[clasament.sportiv.club] += 3
                        elif i == 1:  # Locul 2
                            cluburi_puncte[clasament.sportiv.club] += 1
            else:
                # Trei sau mai mulți sportivi
                # Locul 1: 5 puncte
                # Locul 2: 3 puncte
                # Locul 3: 1 punct
                for i, clasament in enumerate(clasamente_categorie):
                    if clasament.sportiv.club:
                        if i == 0:  # Locul 1
                            cluburi_puncte[clasament.sportiv.club] += 5
                        elif i == 1:  # Locul 2
                            cluburi_puncte[clasament.sportiv.club] += 3
                        elif i == 2:  # Locul 3
                            cluburi_puncte[clasament.sportiv.club] += 1
        
        # Sortăm cluburile după puncte (descrescător)
        cluburi_sortate = sorted(
            cluburi_puncte.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        clasament = []
        for i, (club, puncte) in enumerate(cluburi_sortate):
            clasament.append({
                'pozitie': i + 1,
                'club': club,
                'puncte': puncte
            })
        
        return clasament
    
    def actualizeaza_clasament_in_baza_de_date(self):
        """
        Actualizează clasamentul cluburilor în baza de date.
        """
        clasament = self.calculeaza_clasament_cluburi()
        
        try:
            with transaction.atomic():
                # Ștergem clasamentul existent pentru această competiție
                ClasamentClub.objects.filter(competitie=self.competitie).delete()
                
                # Creăm noile înregistrări de clasament
                for item in clasament:
                    ClasamentClub.objects.create(
                        competitie=self.competitie,
                        club=item['club'],
                        puncte=item['puncte']
                    )
                
                logger.info(f"Clasament cluburi actualizat pentru {self.competitie.nume}: {len(clasament)} cluburi")
        
        except Exception as e:
            logger.error(f"Eroare la actualizarea clasamentului cluburi pentru {self.competitie.nume}: {e}")
            raise


def actualizeaza_clasament_cluburi_pentru_competitie(competitie):
    """
    Funcție helper pentru a actualiza clasamentul cluburilor pentru o competiție.
    """
    calculator = ClasamentClubCalculator(competitie)
    calculator.actualizeaza_clasament_in_baza_de_date()


def obtine_clasament_cluburi_pentru_competitie(competitie):
    """
    Funcție helper pentru a obține clasamentul calculat pentru cluburi.
    """
    calculator = ClasamentClubCalculator(competitie)
    return calculator.calculeaza_clasament_cluburi()