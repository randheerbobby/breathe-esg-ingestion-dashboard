from django.contrib import admin

from .models import EmissionsRecord, IngestionBatch, Tenant

admin.site.register(Tenant)
admin.site.register(IngestionBatch)
admin.site.register(EmissionsRecord)

# Register your models here.
