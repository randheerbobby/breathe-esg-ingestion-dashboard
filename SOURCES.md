# Source research notes

## 1) SAP fuel/procurement

- **Researched format**: practical SAP flat exports from transactional tables / document reports (CSV-friendly, coded columns, varying date and unit conventions).
- **What I learned**:
  - Exports often include plant/material/vendor codes requiring lookup context.
  - Dates can be `YYYYMMDD`, locale dates, or ISO.
  - Fuel/procurement quantities may mix liters, gallons, kilograms.
- **Sample data rationale**:
  - Included mixed date formats and mixed units (`l`, `gal`, `kg`).
  - Added fields like `werks`, `matkl`, `lifnr` to reflect coded SAP shapes.
- **What breaks in real deployment**:
  - Missing code-master mappings.
  - Currency and valuation logic for procurement factors.
  - More edge-case units and localization.

## 2) Utility electricity

- **Researched format**: facilities-team portal CSV exports.
- **What I learned**:
  - Billing periods often do not align to month boundaries.
  - Meter and tariff context can materially affect validation.
  - Quality issues include zero or negative usage rows.
- **Sample data rationale**:
  - Included two normal bills and one zero-consumption anomaly.
  - Included `bill_start`, `bill_end`, `demand_kw`, and `tariff`.
- **What breaks in real deployment**:
  - Multi-meter account rollups and timezone issues.
  - Complex tariff-level CO2 calculations.
  - Need for bill PDF reconciliation workflows.

## 3) Corporate travel

- **Researched format**: API payload patterns from corporate travel tools (Concur/Navan-style trip records by category).
- **What I learned**:
  - Categories map to different factors (flight/hotel/ground).
  - Distances may be estimated or absent in some payloads.
  - Airport/city metadata is often necessary for enrichment.
- **Sample data rationale**:
  - Included flight, hotel, and ground records in one array.
  - Added a short flight to trigger suspicious flagging.
- **What breaks in real deployment**:
  - Missing distance requiring route geocoding.
  - Roundtrip segmentation and class-of-travel impacts.
  - Cancellations/refunds and duplicate itinerary handling.
