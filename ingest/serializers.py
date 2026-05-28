from rest_framework import serializers

from .models import EmissionsRecord, IngestionBatch, Tenant


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "code"]


class IngestionBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionBatch
        fields = [
            "id",
            "tenant",
            "source_type",
            "ingestion_mode",
            "source_reference",
            "status",
            "row_count",
            "failure_count",
            "created_at",
        ]


class EmissionsRecordSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = EmissionsRecord
        fields = [
            "id",
            "tenant",
            "source_type",
            "source_record_id",
            "activity_date",
            "period_start",
            "period_end",
            "scope",
            "category",
            "activity_value",
            "activity_unit_raw",
            "normalized_value",
            "normalized_unit",
            "emission_factor",
            "emission_factor_unit",
            "emissions_kgco2e",
            "suspicious_reason",
            "review_state",
            "reviewed_by",
            "reviewed_at",
            "analyst_note",
            "was_edited",
            "source_payload",
            "created_at",
        ]

