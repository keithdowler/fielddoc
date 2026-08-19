# Beta Readiness

FieldDoc is treated as beta-ready only when the local-first evidence loop has
been proven with real field data and the minimum cloud safety rails are
configured.

## Readiness Stages

| Stage                  | Meaning                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `setup_required`       | Tenant or private storage setup is missing. Do not rely on cloud flows. |
| `field_validation`     | Core cloud setup exists, but real project/report validation is thin.    |
| `beta_candidate`       | Real synced projects, originals, and archived PDFs exist.               |
| `production_candidate` | Core providers, legal URLs, observability, and field proof are ready.   |

## Current Scoring Inputs

The shared domain helper scores these checks:

- Tenant provisioned.
- Private object storage configured.
- RevenueCat webhook configured.
- Email delivery configured.
- Error reporting configured.
- Privacy and terms URLs configured.
- At least one project synced from mobile.
- At least one evidence item synced from mobile.
- All known media originals uploaded or no media exists.
- At least one generated report PDF archived when drafts exist.
- Zero rejected sync receipts.
- At least one audit event recorded.

The score is a directional readiness indicator, not a compliance certificate.
Provider dashboards and end-to-end manual checks still decide launch readiness.

## Operator Loop

1. Create a real project on mobile.
2. Capture before/work/after evidence and import one supporting document.
3. Generate a Proof Packet PDF locally.
4. Sign in on mobile and confirm subscription is active.
5. Run Upload All Pending Changes.
6. Open the web app and review dashboard, project detail, reports, originals,
   and readiness warnings.
7. Resolve any rejected receipts, missing captions, or pending originals before
   inviting external users.
