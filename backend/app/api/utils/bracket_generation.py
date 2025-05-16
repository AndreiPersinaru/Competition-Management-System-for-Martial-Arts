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
        Meci.objects.filter(categorie=categorie, competitie=competitie).delete()

        if len(sportivi) == 2:
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
            numar_spoturi = 8 if len(sportivi) > 4 else 4
            locuri = list(range(1, numar_spoturi + 1))

            # Grupare sportivi dupa club
            sportivi_per_club = defaultdict(list)
            for s in sportivi:
                sportivi_per_club[s.club.id].append(s)

            cluburi_ordonate = sorted(sportivi_per_club.items(), key=lambda x: len(x[1]), reverse=True)

            pozitii = {}
            sportivi_random = sportivi.copy()
            random.shuffle(sportivi_random)

            idx_poz = 0
            while sportivi_random:
                for club_id, lista_sportivi in cluburi_ordonate:
                    if not lista_sportivi:
                        continue
                    pozitii[locuri[idx_poz]] = lista_sportivi.pop(0)
                    idx_poz += 1
                    if idx_poz >= len(locuri) or not sportivi_random:
                        break
                sportivi_random = [s for s in sportivi_random if s not in pozitii.values()]

            for loc in locuri:
                if loc not in pozitii:
                    pozitii[loc] = None

            perechi = [(1, 2), (3, 4), (5, 6), (7, 8)]
            if numar_spoturi == 4:
                perechi = [(1, 2), (3, 4)]

            for idx, (loc1, loc2) in enumerate(perechi, start=1):
                sportiv1 = pozitii.get(loc1)
                sportiv2 = pozitii.get(loc2)

                if sportiv1 or sportiv2:
                    Meci.objects.create(
                        competitie=competitie,
                        categorie=categorie,
                        sportiv1=sportiv1,
                        sportiv2=sportiv2,
                        runda='Semifinala' if numar_spoturi == 4 else 'Optimi',
                        pozitie_in_bracket=loc1,
                        pozitie_in_runda=idx
                    )
