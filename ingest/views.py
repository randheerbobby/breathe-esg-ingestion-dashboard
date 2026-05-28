import csv
import io
import json

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status, views
from rest_framework.response import Response

from .models import EmissionsRecord, IngestionBatch, Tenant
from .normalizers import normalize_sap_row, normalize_travel_row, normalize_utility_row
from .serializers import EmissionsRecordSerializer, IngestionBatchSerializer, TenantSerializer


def get_tenant_by_code(tenant_code: str):
    return Tenant.objects.get_or_create(
        code=tenant_code,
        defaults={"name": f"Enterprise {tenant_code.upper()}"},
    )[0]


class TenantListView(views.APIView):
    def get(self, request):
        tenants = Tenant.objects.order_by("name")
        return Response(TenantSerializer(tenants, many=True).data)


class BatchUploadView(views.APIView):
    def post(self, request):
        tenant_code = request.data.get("tenant_code", "acme")
        source_type = request.data.get("source_type")
        source_reference = request.data.get("source_reference", "")
        ingestion_mode = request.data.get("ingestion_mode", "upload")
        file_obj = request.FILES.get("file")

        if source_type not in dict(IngestionBatch.SourceType.choices):
            return Response({"error": "Invalid source_type"}, status=status.HTTP_400_BAD_REQUEST)
        if not file_obj:
            return Response({"error": "Missing CSV or JSON file"}, status=status.HTTP_400_BAD_REQUEST)

        tenant = get_tenant_by_code(tenant_code)
        batch = IngestionBatch.objects.create(
            tenant=tenant,
            source_type=source_type,
            source_reference=source_reference,
            ingestion_mode=ingestion_mode,
            status=IngestionBatch.Status.RECEIVED,
        )

        failures = 0
        created = 0
        payload_text = file_obj.read().decode("utf-8")

        try:
            if source_type in (IngestionBatch.SourceType.SAP, IngestionBatch.SourceType.UTILITY):
                rows = list(csv.DictReader(io.StringIO(payload_text)))
            else:
                rows = json.loads(payload_text)
                if not isinstance(rows, list):
                    raise ValueError("Travel payload must be a JSON array")
        except Exception as exc:
            batch.status = IngestionBatch.Status.FAILED
            batch.failure_count = 1
            batch.save(update_fields=["status", "failure_count"])
            return Response({"error": f"Unable to parse file: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        for row in rows:
            try:
                if source_type == IngestionBatch.SourceType.SAP:
                    normalized = normalize_sap_row(row)
                    source_id = row["belnr"]
                elif source_type == IngestionBatch.SourceType.UTILITY:
                    normalized = normalize_utility_row(row)
                    source_id = row["invoice_id"]
                else:
                    normalized = normalize_travel_row(row)
                    source_id = row["trip_id"]

                EmissionsRecord.objects.update_or_create(
                    tenant=tenant,
                    source_type=source_type,
                    source_record_id=source_id,
                    defaults={
                        "ingestion_batch": batch,
                        "source_payload": row,
                        **normalized,
                    },
                )
                created += 1
            except Exception:
                failures += 1

        batch.row_count = created + failures
        batch.failure_count = failures
        batch.status = IngestionBatch.Status.PROCESSED if failures == 0 else IngestionBatch.Status.FAILED
        batch.save(update_fields=["row_count", "failure_count", "status"])

        return Response(IngestionBatchSerializer(batch).data, status=status.HTTP_201_CREATED)


class RecordsListView(views.APIView):
    def get(self, request):
        tenant_code = request.query_params.get("tenant_code", "acme")
        review_state = request.query_params.get("review_state")

        tenant = get_tenant_by_code(tenant_code)
        queryset = EmissionsRecord.objects.filter(tenant=tenant).order_by("-activity_date", "-created_at")
        if review_state:
            queryset = queryset.filter(review_state=review_state)
        return Response(EmissionsRecordSerializer(queryset[:500], many=True).data)


class RecordReviewView(views.APIView):
    def post(self, request, record_id):
        action = request.data.get("action")
        reviewer = request.data.get("reviewed_by", "analyst@breathe.local")
        note = request.data.get("analyst_note", "")
        record = EmissionsRecord.objects.get(id=record_id)

        if action == "approve":
            record.review_state = EmissionsRecord.ReviewState.APPROVED
        elif action == "reject":
            record.review_state = EmissionsRecord.ReviewState.REJECTED
        elif action == "lock":
            record.review_state = EmissionsRecord.ReviewState.LOCKED
        else:
            return Response({"error": "Invalid review action"}, status=status.HTTP_400_BAD_REQUEST)

        record.reviewed_by = reviewer
        record.reviewed_at = timezone.now()
        record.analyst_note = note
        record.save(update_fields=["review_state", "reviewed_by", "reviewed_at", "analyst_note", "updated_at"])
        return Response(EmissionsRecordSerializer(record).data)


class DashboardSummaryView(views.APIView):
    def get(self, request):
        tenant_code = request.query_params.get("tenant_code", "acme")
        tenant = get_tenant_by_code(tenant_code)

        state_counts = (
            EmissionsRecord.objects.filter(tenant=tenant)
            .values("review_state")
            .annotate(count=Count("id"))
            .order_by("review_state")
        )
        scope_totals = (
            EmissionsRecord.objects.filter(tenant=tenant)
            .values("scope")
            .annotate(total_kgco2e=Sum("emissions_kgco2e"))
            .order_by("scope")
        )
        suspicious_count = EmissionsRecord.objects.filter(tenant=tenant).exclude(suspicious_reason="").count()
        batch_stats = IngestionBatch.objects.filter(tenant=tenant).order_by("-created_at")[:10]

        return Response(
            {
                "tenant": TenantSerializer(tenant).data,
                "review_states": list(state_counts),
                "scope_totals": list(scope_totals),
                "suspicious_count": suspicious_count,
                "recent_batches": IngestionBatchSerializer(batch_stats, many=True).data,
            }
        )
