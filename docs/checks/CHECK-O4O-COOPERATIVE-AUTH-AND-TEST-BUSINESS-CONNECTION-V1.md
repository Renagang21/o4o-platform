# CHECK-O4O-COOPERATIVE-AUTH-AND-TEST-BUSINESS-CONNECTION-V1

- Date: 2026-10-17
- Status: LOCAL_VERIFIED — production delivery pending
- Scope: cooperative authentication, personal enrollment identity, explicit business mapping and controlled test provisioning

## Result

Production entry uses common AuthClient/useServiceAuth email login, session restoration and logout.
The public directory and authenticated self-context are `/api/v1/neture/cooperatives` and `/cooperatives/me`.
An explicit cooperative slug binds to a business row. Personal membership uses `cooperative_memberships`,
separate from pharmacy organization membership; multiple personal enrollments remain independent.
Operator projection and provisioning share currently valid Neture operator/admin role checks and canonical
`getNetureMainMembershipStatus`, then require an assigned active business. No federation authority is inferred.
Exact cooperative CORS and session-revocation scope are configured. Account erasure recognizes personal membership rows.

Target: `coop.neture.co.kr/test`, name `테스트 협동조합`, business key `coop-test`.
Execution receives account selectors, not passwords. Existing verified usable accounts and a currently valid
operator role are required; no account/password/global-role creation or pharmacy/store membership is performed.
Provisioning is atomic, idempotent and conflict-sensitive, with a dry-run and per-target advisory lock.
The owner-only deployment workflow checks both initial actor and rerun actor, freeze, exact main HEAD,
green CI and the same-SHA serving API digest. It grants no IAM permissions and does not change DNS or LB.

## Shared content integration

During delivery, policy PR #679 and implementation PR #678 were integrated into main.
The earlier separate `semi_franchise_content_submissions` implementation was removed before production application.
Cooperative integration reuses main's `AddSupplierBusinessContentRequests1792215000000` and existing
`semi_franchise_contents` pending/rejected/published flow. It creates no parallel supplier ledger or second approval API.
The cooperative operator has supply proposals and contents tabs; pending review is in the common contents tab.
Native operator authoring, editing, publication, archival and native republishing remain available.
The shared extension adds only allowed tabs, explicit business pinning and cooperative-local editor return routes.

## Migration ordering

Main's existing migration/history prefixes and fingerprints are preserved unchanged. The previously unmerged
cooperative migration was renamed to `CreateCooperativeMemberships1792216000000`, after the common request migration.
No applied production migration was changed. Only disposable databases had used earlier cooperative migration names.

| Applied through | Fingerprint | Lines |
| --- | --- | --- |
| AddSupplierBusinessContentRequests1792215000000 | be4a89ff7ed4ffd22e9ebaf2fdaf954c92f26672e3c4f20256e71ecec8490ce8 | 6703 |
| CreateCooperativeMemberships1792216000000 | 15996765a666dfc6dbea61e98f47a50a1aa580166d80fc08e3bb2a1206e667b4 | 6736 |

Isolated PostgreSQL 15 replayed canonical bootstrap and every incremental prefix. The final down restores the
previous expected fingerprint inside a rolled-back transaction. No production fingerprint was copied or adopted.

## Validation

- Backend: 77 passing tests, including actual isolated PostgreSQL personal enrollment and canonical supplier-request
  integration, role validity/Neture suspension, invalid account selectors, auth origin and account-erasure regressions.
- Shared pharmacy-management: 27 tests passed after integration, retaining supplier review/rejection and native-content flows.
- Cooperative frontend: 38 tests passed, including failed-load handling, another user's snapshot rejection,
  assignment clearing and explicit cooperative editor routes.
- Migration contract: 21 passed; API type check and cooperative production build passed.
- Docker build/run and `/test` SPA response passed. Synthetic Chromium common login, authenticated bearer
  self-context, personal enrollment and logout passed; after canonical integration, supplier approval, own-content
  draft save and return to the cooperative URL, local forum route and zero page errors were verified.
- Actual Axios instances are callable. The operator adapter stores them with a wrapped state updater; a callable-client
  regression prevents accidentally invoking the transport instead of mounting the operator workspace.
- Production member login was checked successfully without logging/persisting credentials or tokens. No production enrollment writes.
- Automatic review's operator eligibility mismatch was fixed in both session projection and provisioning.
- SonarCloud's new-code security issues were fixed: official Google Actions pinned to commit SHAs and bounded
  non-backtracking account selector validation; rendering complexity/accessibility/props findings were addressed.

## Delivery boundary

Local and isolated results do not mean production migration or public domain readiness.
Production migration/API rollout must succeed before same-SHA provisioning. The initial Cloud Run public invoker,
DNS, HTTPS certificate and LB host route require the existing infrastructure owner path.
GitHub Actions Promote dry-run succeeded without deployment; local workspace has no GCP identity.
Network draft adds the cooperative hostname and GitHub log-download hostname and requires environment save/publication.
Personal application/review UI, federation enrollment operations and member community remain separate work.
