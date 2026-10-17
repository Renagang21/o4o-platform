# CHECK-O4O-COOPERATIVE-AUTH-AND-TEST-BUSINESS-CONNECTION-V1

- Date: 2026-10-17
- Status: LOCAL_VERIFIED — production delivery pending
- Scope: cooperative authentication, individual enrollment identity, explicit business mapping and controlled test provisioning

## Result

The production entry now uses the common AuthClient/useServiceAuth email login, session restoration and logout.
Public directory and authenticated self-context are served by `/api/v1/neture/cooperatives` and `/cooperatives/me`.
The directory binds an explicit cooperative slug to a semi-franchise business row. Personal membership uses
`cooperative_memberships`, not pharmacy organization memberships. Multiple personal enrollments remain independent.
Operator context requires both an active assigned business relationship and an existing active Neture operator/admin role.
No federation grants, account creation, password changes, pharmacy membership or store ownership are introduced.
The cooperative origin is added exactly to CORS and has its own session revocation scope (`coop`).
Personal enrollment rows are included in the existing account-erasure owned-row registry and write fence.

The target is `coop.neture.co.kr/test`, test cooperative name `테스트 협동조합`, business key `coop-test`.
Account selectors are provided at execution, not committed. Provisioning requires the existing active accounts and
operator role, runs atomically with a target advisory lock, and fails on conflicting directory/business/member state.
Dry run validates the target without data writes; repeated apply preserves existing active enrollment.
An explicit owner-only, freeze-gated manual workflow requires main HEAD, green CI and a same-SHA serving API image digest.
It runs the separate provisioning Job and builds/smokes the frontend before traffic switch. It grants no IAM permissions.

## Migration ordering

While this branch was under development, main integrated `AddFundingOfflineState1792212000000`.
The two cooperative migrations had only been used on disposable databases, never production. They were renamed before
first integration to `CreateBusinessContentSubmissions1792213000000` and `CreateCooperativeMemberships1792214000000`.
Main's existing manifest/history prefix and expected state are preserved unchanged. No applied migration was edited.

Isolated PostgreSQL 15 canonical bootstrap verified every main prefix and the appended schemas:

| Applied through | Fingerprint | Lines |
| --- | --- | --- |
| AddFundingOfflineState1792212000000 | 76c1307f0ee0a073e7ce53f9ae00e58c8695b6084842d42f6475bac35df58c04 | 6698 |
| CreateBusinessContentSubmissions1792213000000 | 8d935b8c346fff658ead1aefc456704469332afc7b7a66f0f0705657bf87d49c | 6725 |
| CreateCooperativeMemberships1792214000000 | beeeaa21eac87f87cf64e53bf7234949151be15b412c7cfc376c6a26617c0971 | 6758 |

The final down restores the previous expected schema fingerprint inside a rolled-back transaction.

## Validation

- 69 backend tests: actual isolated PostgreSQL cooperative/supplier content tests, auth origin boundaries,
  existing login eligibility and account-erasure storage regressions.
- 37 cooperative frontend tests, including failed-load handling, another user's snapshot rejection and clearing
  old assignments when authentication changes.
- Migration contract: 21 passed, zero failed.
- API type checking, frontend production build, API bundled provisioning entry, frozen install and changed-file lint passed.
- Docker production build and running container `/test` SPA response passed. The clean container exposed a router
  resolution issue; copying the existing workspace hoist config with integrity verification explicitly enabled fixed it.
- Chromium mobile: common login, authenticated self-context bearer header, personal active membership display,
  absence of federation grants, logout and zero page errors. Synthetic intercepted API, no production enrollment writes.
- Existing authorized test member account's production login was checked successfully; account credentials and tokens
  were not logged, saved or changed.
- Deployment workflow YAML parsed and existing workflow regression tests passed (2 tests).

## Delivery boundary

These are local code and isolated database results, not production migration or domain readiness claims.
Production migration/API deploy must succeed before the same-SHA provisioning workflow can execute.
New Cloud Run public-invoker IAM, DNS, HTTPS certificate and LB host routing require the existing infrastructure owner path.
The current cloud workspace has no configured GCP identity; GitHub Actions WIF is the supported deployment path.
The environment network draft adds the target hostname, but that draft requires environment review/save/publication to activate.
Personal membership application/review, federation enrollment operations and member community implementation remain separate work.
