from django.db import models
from django.contrib.auth.models import AbstractUser

class Club(models.Model):
    nume = models.CharField(max_length=100)

    def __str__(self):
        return self.nume

class User(AbstractUser):    
    ROLE_CHOICES = [
        ('sportiv', 'Sportiv'),
        ('organizator', 'Organizator'),
    ]
    role = models.CharField(max_length=20, default='sportiv', choices=ROLE_CHOICES)
    club = models.ForeignKey(Club, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.username} ({self.role})"

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
    organizator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='competitii_organizate')

    def __str__(self):
        return self.nume

class Inscriere(models.Model):
    STATUS_CHOICES = [
        ('inscris', 'Înscris'),
        ('retras', 'Retras'),
        ('descalificat', 'Descalificat'),
    ]
    sportiv = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inscrieri', default=1)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='inscrieri', default=1)
    varsta = models.IntegerField(null=True)
    greutate = models.FloatField(null=True)
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, related_name='inscrieri', default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inscris')
    data_inscriere = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sportiv.username} - {self.categorie} - {self.competitie.nume}"

class Saltea(models.Model):
    numar = models.IntegerField()

    def __str__(self):
        return f"Saltea {self.numar}"

class Meci(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, related_name='meciuri', default=1)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, default=1)
    sportiv1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meciuri_ca_sportiv1', default=1)
    sportiv2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meciuri_ca_sportiv2', default=1)
    saltea = models.ForeignKey(Saltea, on_delete=models.SET_NULL, null=True, default=1)
    castigator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='meciuri_castigate', default=1)
    scor1 = models.IntegerField(default=0)
    scor2 = models.IntegerField(default=0)
    diferenta_activata = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.sportiv1.username} vs {self.sportiv2.username}"

class ClasamentClub(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, default=1)
    club = models.ForeignKey(Club, on_delete=models.CASCADE, default=1)
    puncte = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.club.nume} - {self.puncte} puncte"

class ClasamentProba(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, default=1)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, default=1)
    sportiv = models.ForeignKey(User, on_delete=models.CASCADE, default=1)
    puncte = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.sportiv.username} - {self.puncte} puncte"
