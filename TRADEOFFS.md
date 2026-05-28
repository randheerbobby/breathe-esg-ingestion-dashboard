# Deliberate tradeoffs

## 1) Did not build robust auth/RBAC

- Built a prototype review flow without full user management.
- Why: assignment weights data model and source realism more than auth integration.
- Risk: not production-ready for role-restricted sign-off.

## 2) Did not integrate live external APIs

- Travel is represented as API-shaped JSON upload, not OAuth pull.
- Utility is CSV upload, not per-utility API connectors.
- Why: faster to prove ingestion architecture and normalization in limited timeline.

## 3) Did not implement full factor governance

- Emission factors are in-code constants for explainability.
- Why: avoids premature complexity (factor versioning service, regional sets, approvals).
- Risk: factor maintenance and compliance controls need a dedicated subsystem.
