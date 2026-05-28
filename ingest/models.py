from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Tenant(TimeStampedModel):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=40, unique=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class IngestionBatch(TimeStampedModel):
    class SourceType(models.TextChoices):
        SAP = "sap", "SAP"
        UTILITY = "utility", "Utility"
        TRAVEL = "travel", "Travel"

    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="batches")
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    ingestion_mode = models.CharField(max_length=80)
    source_reference = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RECEIVED)
    row_count = models.PositiveIntegerField(default=0)
    failure_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.tenant.code} - {self.source_type} - {self.created_at.date()}"


class EmissionsRecord(TimeStampedModel):
    class Scope(models.TextChoices):
        SCOPE_1 = "scope_1", "Scope 1"
        SCOPE_2 = "scope_2", "Scope 2"
        SCOPE_3 = "scope_3", "Scope 3"

    class Category(models.TextChoices):
        FUEL = "fuel", "Fuel"
        PROCUREMENT = "procurement", "Procurement"
        ELECTRICITY = "electricity", "Electricity"
        AIR_TRAVEL = "air_travel", "Air Travel"
        HOTEL = "hotel", "Hotel"
        GROUND_TRANSPORT = "ground_transport", "Ground Transport"

    class ReviewState(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        LOCKED = "locked", "Locked"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="records")
    ingestion_batch = models.ForeignKey(
        IngestionBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name="records"
    )
    source_type = models.CharField(max_length=20, choices=IngestionBatch.SourceType.choices)
    source_record_id = models.CharField(max_length=120)
    activity_date = models.DateField()
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    scope = models.CharField(max_length=20, choices=Scope.choices)
    category = models.CharField(max_length=40, choices=Category.choices)

    activity_value = models.DecimalField(max_digits=14, decimal_places=4)
    activity_unit_raw = models.CharField(max_length=30)
    normalized_value = models.DecimalField(max_digits=14, decimal_places=4)
    normalized_unit = models.CharField(max_length=20)

    emission_factor = models.DecimalField(max_digits=14, decimal_places=6)
    emission_factor_unit = models.CharField(max_length=60)
    emissions_kgco2e = models.DecimalField(max_digits=14, decimal_places=4)

    suspicious_reason = models.CharField(max_length=255, blank=True)
    review_state = models.CharField(max_length=20, choices=ReviewState.choices, default=ReviewState.PENDING)
    reviewed_by = models.CharField(max_length=120, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    analyst_note = models.TextField(blank=True)

    source_payload = models.JSONField(default=dict)
    was_edited = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "source_type"]),
            models.Index(fields=["tenant", "review_state"]),
            models.Index(fields=["tenant", "scope"]),
        ]
        unique_together = [("tenant", "source_type", "source_record_id")]

    def __str__(self):
        return f"{self.tenant.code} {self.source_type}:{self.source_record_id}"
