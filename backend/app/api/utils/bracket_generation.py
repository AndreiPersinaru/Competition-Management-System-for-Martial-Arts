from collections import defaultdict
from ..models import Meci
import random

def genereaza_bracket_si_meciuri(inscrieri, competitie):
    categorii_grupate = defaultdict(list)
    for inscriere in inscrieri:
        categorii_grupate[inscriere.categorie].append(inscriere.sportiv)

    for categorie, sportivi in categorii_grupate.items():
        if any(p.lower() in categorie.proba.nume.lower() for p in ["Polydamas", "Palaismata"]):
            continue
        
        # Ștergem meciurile existente pentru această categorie
        Meci.objects.filter(categorie=categorie, competitie=competitie).delete()

        if len(sportivi) == 2:
            # Best of 3 pentru 2 sportivi
            for i in range(1, 4):
                Meci.objects.create(
                    competitie=competitie,
                    categorie=categorie,
                    sportiv1=sportivi[0],
                    sportiv2=sportivi[1],
                    runda=f"Best of 3 - Meci {i}",
                    pozitie_in_bracket=i,
                    pozitie_in_runda=i
                )
                
        elif len(sportivi) == 3:
            # Round Robin pentru 3 sportivi
            Meci.objects.create(
                competitie=competitie,
                categorie=categorie,
                sportiv1=sportivi[0],
                sportiv2=sportivi[1],
                runda="Round Robin - Meci 1",
                pozitie_in_bracket=1,
                pozitie_in_runda=1
            )
            Meci.objects.create(
                competitie=competitie,
                categorie=categorie,
                sportiv1=sportivi[1],
                sportiv2=sportivi[2],
                runda="Round Robin - Meci 2",
                pozitie_in_bracket=2,
                pozitie_in_runda=2
            )
            Meci.objects.create(
                competitie=competitie,
                categorie=categorie,
                sportiv1=sportivi[0],
                sportiv2=sportivi[2],
                runda="Round Robin - Meci 3",
                pozitie_in_bracket=3,
                pozitie_in_runda=3
            )
            
        elif len(sportivi) >= 4:
            # Bracket standard cu eliminare
            numar_spoturi = 8 if len(sportivi) > 4 else 4
            locuri = list(range(1, numar_spoturi + 1))

            # Grupare sportivi după club pentru evitarea întâlnirilor timpurii
            sportivi_per_club = defaultdict(list)
            for s in sportivi:
                sportivi_per_club[s.club.id].append(s)

            cluburi_ordonate = sorted(sportivi_per_club.items(), key=lambda x: len(x[1]), reverse=True)

            pozitii = {}
            sportivi_random = sportivi.copy()
            random.shuffle(sportivi_random)

            # Distribuim sportivii în pozițiile bracket-ului
            idx_poz = 0
            while sportivi_random:
                for club_id, lista_sportivi in cluburi_ordonate:
                    if not lista_sportivi:
                        continue
                    if idx_poz < len(locuri):
                        pozitii[locuri[idx_poz]] = lista_sportivi.pop(0)
                        idx_poz += 1
                    if idx_poz >= len(locuri) or not sportivi_random:
                        break
                sportivi_random = [s for s in sportivi_random if s not in pozitii.values()]

            # Completăm pozițiile goale
            for loc in locuri:
                if loc not in pozitii:
                    pozitii[loc] = None

            # Creăm meciurile pentru prima rundă
            if numar_spoturi == 4:
                # Pentru 4 sportivi: direct semifinale
                perechi = [(1, 2), (3, 4)]
                runda_nume = 'Semifinala'
            else:
                # Pentru 8 sportivi: sferturi de finală
                perechi = [(1, 2), (3, 4), (5, 6), (7, 8)]
                runda_nume = 'Sferturi'

            # Creăm meciurile din prima rundă
            for idx, (loc1, loc2) in enumerate(perechi, start=1):
                sportiv1 = pozitii.get(loc1)
                sportiv2 = pozitii.get(loc2)

                if sportiv1 or sportiv2:
                    Meci.objects.create(
                        competitie=competitie,
                        categorie=categorie,
                        sportiv1=sportiv1,
                        sportiv2=sportiv2,
                        runda=runda_nume,
                        pozitie_in_bracket=loc1,
                        pozitie_in_runda=idx
                    )

            # Pentru bracket-urile cu 4+ sportivi, pre-creăm finala și meciul pentru locul 3
            # Acestea vor fi populate automat când semifinalele se termină
            
            # Creăm finala (goală inițial)
            Meci.objects.create(
                competitie=competitie,
                categorie=categorie,
                sportiv1=None,
                sportiv2=None,
                runda='Finala',
                pozitie_in_bracket=1,
                pozitie_in_runda=1
            )
            
            # Creăm meciul pentru locul 3 (goală inițial)
            Meci.objects.create(
                competitie=competitie,
                categorie=categorie,
                sportiv1=None,
                sportiv2=None,
                runda='Locul 3',
                pozitie_in_bracket=1,
                pozitie_in_runda=1
            )

def actualizeaza_bracket_dupa_meci(meci_finalizat):
    """
    Funcție helper pentru a actualiza bracket-ul după finalizarea unui meci.
    Poate fi apelată din ViewSet pentru logică suplimentară.
    """
    if not meci_finalizat.castigator:
        return
    
    runda = meci_finalizat.runda.lower()
    
    # Logică specială pentru diferite tipuri de runde
    if 'semifinala' in runda:
        # După semifinală, trebuie să actualizăm finala și meciul pentru locul 3
        _actualizeaza_dupa_semifinala(meci_finalizat)
    elif 'sferturi' in runda:
        # După sferturi, trebuie să creăm/actualizăm semifinalele
        _actualizeaza_dupa_sferturi(meci_finalizat)
    elif 'optimi' in runda:
        # După optimi, trebuie să creăm/actualizăm sferturile
        _actualizeaza_dupa_optimi(meci_finalizat)

def _actualizeaza_dupa_semifinala(meci_semifinala):
    """
    Actualizează finala și meciul pentru locul 3 după o semifinală.
    """
    castigator = meci_semifinala.castigator
    pierzator = (meci_semifinala.sportiv2 if castigator == meci_semifinala.sportiv1 
                else meci_semifinala.sportiv1)
    
    # Actualizăm finala
    finala = Meci.objects.filter(
        competitie=meci_semifinala.competitie,
        categorie=meci_semifinala.categorie,
        runda='Finala'
    ).first()
    
    if finala:
        if finala.sportiv1 is None:
            finala.sportiv1 = castigator
        elif finala.sportiv2 is None:
            finala.sportiv2 = castigator
        finala.save()
    
    # Actualizăm meciul pentru locul 3
    meci_loc3 = Meci.objects.filter(
        competitie=meci_semifinala.competitie,
        categorie=meci_semifinala.categorie,
        runda='Locul 3'
    ).first()
    
    if meci_loc3:
        if meci_loc3.sportiv1 is None:
            meci_loc3.sportiv1 = pierzator
        elif meci_loc3.sportiv2 is None:
            meci_loc3.sportiv2 = pierzator
        meci_loc3.save()