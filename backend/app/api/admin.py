from django.contrib import admin
from .models import Club, User, Proba, Categorie, Competitie, Inscriere, Saltea, Meci, ClasamentClub, ClasamentProba
# Register your models here.

admin.site.register(Club)
admin.site.register(User)
admin.site.register(Proba)
admin.site.register(Categorie)
admin.site.register(Competitie)
admin.site.register(Inscriere)
admin.site.register(Saltea)
admin.site.register(Meci)
admin.site.register(ClasamentClub)
admin.site.register(ClasamentProba)

