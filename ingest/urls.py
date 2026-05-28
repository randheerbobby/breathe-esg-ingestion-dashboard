from django.urls import path

from .views import BatchUploadView, DashboardSummaryView, RecordReviewView, RecordsListView, TenantListView

urlpatterns = [
    path("tenants/", TenantListView.as_view(), name="tenant-list"),
    path("batches/upload/", BatchUploadView.as_view(), name="batch-upload"),
    path("records/", RecordsListView.as_view(), name="records-list"),
    path("records/<int:record_id>/review/", RecordReviewView.as_view(), name="record-review"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
]
