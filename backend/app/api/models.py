from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):    
    ROLE_CHOICES = [
        ('sportiv', 'Sportiv'),
        ('organizator', 'Organizator'),
    ]
    
    role = models.CharField(max_length=20, default='sportiv', choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.username} ({self.role})"

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

    sportiv = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inscrieri')
    categorie = models.CharField(max_length=10, null=True)
    varsta = models.IntegerField(null=True)
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, related_name='inscrieri')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inscris')
    data_inscriere = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sportiv.username} - {self.competitie.nume}"

class Meci(models.Model):
    competitie = models.ForeignKey(Competitie, on_delete=models.CASCADE, related_name='meciuri')
    sportivi = models.ManyToManyField(User, through='Rezultat')

    def __str__(self):
        return f"Meci {self.id} - {self.competitie.nume}"

class Rezultat(models.Model):
    meci = models.ForeignKey(Meci, on_delete=models.CASCADE, related_name='rezultate')
    castigator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rezultate')
    scor = models.IntegerField()

    def __str__(self):
        return f"Rezultat {self.id} - {self.castigator.username} ({self.scor})"
