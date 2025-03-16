from django.contrib import admin
from .models import User, Competitie, Inscriere, Meci, Rezultat
# Register your models here.

admin.site.register(User)
admin.site.register(Competitie)
admin.site.register(Inscriere)
admin.site.register(Meci)
admin.site.register(Rezultat)
