# Data model and rationale

## Core entities

- `Tenant`: multi-tenant partition key (`code`) for every ingestion and emissions row.
- `IngestionBatch`: one run of source ingestion (source type, ingestion mode, status, row and failure counts, source reference).
- `EmissionsRecord`: normalized source-of-truth row used by analysts and auditors.

## Why this model

The assignment asks for ingestion from heterogeneous systems while preserving source lineage and auditability. The model centers that:

- Multi-tenancy: all auditable data ties to `Tenant`.
- Source-of-truth tracking: each record stores `source_type`, `source_record_id`, `ingestion_batch`, and raw `source_payload`.
- Unit normalization: both raw (`activity_value`, `activity_unit_raw`) and normalized (`normalized_value`, `normalized_unit`) values are retained.
- Scope classification: each row has `scope` plus practical `category` (fuel, electricity, air travel, hotel, etc.).
- Analyst workflow: `review_state`, `reviewed_by`, `reviewed_at`, and `analyst_note` support review and sign-off.

## Audit trail strategy

- Immutable lineage from normalized row back to source payload.
- Review actions timestamped and reviewer-attributed.
- `was_edited` flag reserved for explicit future post-ingestion edits.
- `IngestionBatch` captures processing quality (failures vs accepted rows) per run.

## Indexing and constraints

- Unique key: (`tenant`, `source_type`, `source_record_id`) avoids silent duplicates.
- Indexes on tenant + source/review/scope support dashboard queries.

## Scope mapping used in prototype

- Scope 1: fuel combustion rows from SAP.
- Scope 2: purchased electricity rows from utility source.
- Scope 3: procurement from SAP + travel categories.
