# Decisions and ambiguities

## 1) SAP format handled

- **Ambiguity**: SAP can come as IDoc, BAPI/OData pulls, or flat exports.
- **Choice**: flat CSV export resembling table extracts (material + posting docs).
- **Why**: easiest realistic prototype path in 4 days while still representing SAP pains (mixed date formats, mixed units, code fields).
- **Ignored for now**: deep SAP table joins and plant/material lookup master data.

## 2) Utility ingestion mode

- **Ambiguity**: PDF bills, portal CSV, or direct utility API.
- **Choice**: CSV upload from facilities portal.
- **Why**: common in practice and carries billing-period misalignment + tariff fields needed for quality checks.
- **Ignored for now**: PDF OCR and account-specific API auth flows.

## 3) Travel ingestion mode

- **Ambiguity**: Concur/Navan APIs vary; distances may be absent.
- **Choice**: JSON upload shaped like travel platform API payload.
- **Why**: keeps schema close to API output while avoiding third-party auth complexity in prototype.
- **Ignored for now**: route geocoding fallback from airport codes when distance missing.

## 4) Normalization strategy

- Keep both raw and normalized units per row.
- Use transparent fixed factors in code (not hidden external service) so decisions are explainable.
- Mark suspicious rows instead of auto-rejecting to keep analyst in control.

## 5) PM questions I would ask

- Should procurement be mapped to supplier-specific factors or spend-based factors initially?
- Which emission factor library/version is required for audit sign-off?
- Is record locking reversible under any governance workflow?
- Which tenant identity source is canonical (SSO org, account ID, or manual mapping)?
