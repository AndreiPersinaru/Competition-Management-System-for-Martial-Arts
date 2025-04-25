from django.db import models
from django.contrib.auth.models import AbstractUser

class Club(models.Model):
    nume = models.CharField(max_length=100)

    def __str__(self):
        return self.nume

class User(AbstractUser):

    def __str__(self):
        return self.username

class Sportiv(models.Model):
    nume = models.CharField(max_length=100)
    prenume = models.CharField(max_length=100)
    cnp = models.CharField(max_length=13, unique=True)
    club = models.ForeignKey(Club, on_delete=models.SET_NULL, null=True)
    sex = models.CharField(max_length=10)
    data_nastere = models.DateField()

    def __str__(self):
        return f"{self.nume} {self.prenume}"

class Proba(models.Model):
    nume = models.CharField(max_length=100)

    def __str__(self):
        return self.nume

class Categorie(models.Model):
    proba = models.ForeignKey(Proba, on_delete=models.CASCADE, related_name='categorii')
    sex = models.CharField(max_length=10)
    varsta_min = models.IntegerField()
    varsta_max = models.IntegerField()
    greutate_min = models.FloatField()
    greutate_max = models.FloatField()

    def __str__(self):
        return f"{self.proba.nume} - {self.sex} - {self.greutate_min}-{self.greutate_max}kg"

class Competitie(models.Model):
    nume = models.CharField(max_length=255)
    data_incepere = models.DateField()
    data_sfarsit = models.DateField()
    oras = models.CharField(max_length=10, blank=True, null=True)
    adresa = models.CharField(max_length=255, blank=True, null=True)
    locatie_google_maps = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.nume

class Inscriere(models.Model):
    STATUS_CHOICES = [
        ('inscris', 'Înscris'),
        ('retras', 'Retras'),
        ('descalificat', 'Descalificat'),
    ]
    sportiv = models.ForeignKey(Sportiv, on_delete=models.CASCADE, related_name='inscrieri')
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='inscrieri')
    varsta = models.IntegerField(null=True)
    greutate = models.FloatField(null=True)
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, related_name='inscrieri')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inscris')
    data_inscriere = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sportiv} - {self.categorie} - {self.competitie.nume}"

class Saltea(models.Model):
    numar = models.IntegerField()

    def __str__(self):
        return f"Saltea {self.numar}"

class Meci(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, related_name='meciuri')
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE)
    sportiv1 = models.ForeignKey(Sportiv, on_delete=models.CASCADE, related_name='meciuri_ca_sportiv1')
    sportiv2 = models.ForeignKey(Sportiv, on_delete=models.CASCADE, related_name='meciuri_ca_sportiv2')
    saltea = models.ForeignKey(Saltea, on_delete=models.SET_NULL, null=True)
    castigator = models.ForeignKey(Sportiv, on_delete=models.SET_NULL, null=True, blank=True, related_name='meciuri_castigate')
    scor1 = models.IntegerField(default=0)
    scor2 = models.IntegerField(default=0)
    diferenta_activata = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.sportiv1} vs {self.sportiv2}"

class ClasamentClub(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE)
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    puncte = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.club.nume} - {self.puncte} puncte"

class ClasamentProba(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE)
    sportiv = models.ForeignKey(Sportiv, on_delete=models.CASCADE)
    puncte = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.sportiv} - {self.puncte} puncte"
