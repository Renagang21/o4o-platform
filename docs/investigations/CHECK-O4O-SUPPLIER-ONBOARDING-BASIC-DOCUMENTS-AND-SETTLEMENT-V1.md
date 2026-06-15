# CHECK-O4O-SUPPLIER-ONBOARDING-BASIC-DOCUMENTS-AND-SETTLEMENT-V1

## 1. Implementation Summary

Neture supplier onboarding now supports the basic document and settlement layer on top of the existing two-step supplier approval flow.

The existing flow remains unchanged:

```text
service_memberships pending -> active
neture_suppliers PENDING -> ACTIVE / REJECTED
requireActiveSupplier gates product write APIs
```

This WO adds:

```text
business registration PDF
settlement bank/account/account holder
settlement bankbook PDF
settlement contact name/email
required tax invoice email validation
operator/admin visibility before supplier activation
backend activation guard for incomplete onboarding
```

Category-specific documents, mail-order reporting, and product registration category gates were not implemented in this WO.

## 2. Modified Files

```text
apps/api-server/src/database/migrations/20260615130000-AddSupplierBasicDocumentsAndSettlement.ts
apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts
apps/api-server/src/modules/neture/services/supplier-onboarding.service.ts
apps/api-server/src/modules/neture/services/supplier.service.ts
apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts
apps/api-server/src/modules/neture/controllers/operator-supplier.controller.ts
apps/api-server/src/modules/neture/controllers/admin.controller.ts
services/web-neture/src/lib/api/supplier.ts
services/web-neture/src/lib/api/admin.ts
services/web-neture/src/lib/api/index.ts
services/web-neture/src/pages/supplier/SupplierProfilePage.tsx
services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx
services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx
```

## 3. Data/API Changes

### Entity fields

Added nullable fields to `neture_suppliers`:

```text
business_registration_document_id
settlement_bank_name
settlement_account_number
settlement_account_holder
settlement_bankbook_document_id
settlement_contact_name
settlement_contact_email
```

Document IDs reference `kyc_documents(id)` with `ON DELETE SET NULL`.

### Supplier APIs

```text
GET   /api/v1/neture/supplier/onboarding
PATCH /api/v1/neture/supplier/onboarding
POST  /api/v1/neture/supplier/documents/:documentType
GET   /api/v1/neture/supplier/documents/:documentType/download
```

Allowed document types:

```text
business_registration
bank_statement
```

### Operator/Admin APIs

```text
GET /api/v1/neture/operator/suppliers/:id/onboarding
GET /api/v1/neture/operator/suppliers/:id/documents/:documentType/download
GET /api/v1/neture/admin/suppliers/:id/onboarding
GET /api/v1/neture/admin/suppliers/:id/documents/:documentType/download
```

Supplier list responses now include document IDs, masked settlement account, settlement fields, and tax invoice email.

## 4. PDF Upload/Read Model

`KycDocument` is reused for supplier onboarding documents.

Files are stored in a private GCS bucket:

```text
GCS_PRIVATE_DOCUMENT_BUCKET
fallback: o4o-private-documents
```

Stored object path:

```text
neture/suppliers/{supplierId}/kyc/{documentType}/{uuid}.pdf
```

The media library public asset path is not used for these documents.

## 5. Access Control

Upload/read access is restricted through authenticated endpoints:

```text
supplier owner via linked supplier identity
Neture operator scope
Neture admin scope
```

Document read uses axios blob downloads so localStorage access-token auth headers are included. Public URLs are not exposed.

## 6. Supplier UI

`SupplierProfilePage` now includes a supplier onboarding section for:

```text
business registration PDF upload/view
settlement bank name
settlement account number
settlement account holder
bankbook PDF upload/view
settlement contact name
settlement contact email
tax invoice email
```

The existing active-supplier profile save remains in place. The new onboarding save uses `/supplier/onboarding`, which is available to linked suppliers before ACTIVE status.

## 7. Operator/Admin UI

`OperatorSupplierApprovalPage` and `AdminSupplierApprovalPage` now show:

```text
required onboarding completion state
missing required onboarding items
settlement bank/account holder/masked account
business registration PDF view action
bankbook PDF view action
```

PENDING supplier activation/approval buttons are disabled when required onboarding fields are missing.

## 8. Backend Activation Guard

`NetureSupplierService.approveSupplier` now blocks `PENDING -> ACTIVE` when required onboarding data is incomplete.

Required before activation:

```text
business registration document
tax invoice email
valid tax invoice email format
settlement bank name
settlement account number
settlement account holder
bankbook document
```

This keeps `requireActiveSupplier` product write gates unchanged while ensuring suppliers cannot become ACTIVE without the basic onboarding layer.

## 9. Excluded Items

```text
category-specific document submission
regulated category approval status
product registration category gate
mail-order reporting fields
automatic remittance
external bank account verification
OCR
tax invoice issuance integration
document change history/re-review workflow
```

## 10. Verification

```text
pnpm --filter @o4o/api-server type-check
result: passed

pnpm --filter @o4o/web-neture build
result: passed
```

The web build emitted existing bundle-size and browserslist/baseline data warnings only.

## 11. Follow-up WO

Recommended next work:

```text
WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1
WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1
WO-O4O-SUPPLIER-ONBOARDING-DOCUMENT-REVIEW-HISTORY-V1
```
