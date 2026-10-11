# PharmacyHub canonical retirement policy alignment

> 상태: REVIEW · 작성일: 2026-10-11 · 별도 정본 작업: #427

사용자는 PharmacyHub 전면 제거·재사용 없음·전용 데이터 제거를 승인했다. 동일 폐기 WO의 문서 phase로 사용자 지정 worktree를 유지하고 최신 main에서 `wo/pharmacyhub-retirement-canonical`를 생성했다. PR #422의 구현 작업과 분리하여 정본 정책·index만 정렬한다.

PH 서비스 baseline의 현행 1~6항이 이전 PH 서비스 모델을 대체한다. 연결된 role workspace·subdomain·Store access/owner RBAC·RBAC catalog/state·B2B/checkout·content/signage/POP·commonization/operator/header의 PH 관련 절에도 부분 대체를 명시한다. Frozen Distribution·Supplier는 승인된 PH 계약만 부분 대체하고 Neture/Common/Core/Freeze는 보존한다. canonical index의 ACTIVE는 폐기 정책의 효력이며 서비스 운영을 뜻하지 않는다.

기존 본문·과거 실행 기록은 보존하며 PH 운영/가입/역할/opt-in/parity를 현행 의무로 적용하지 않는 우선순위를 관련 절에 표기했다. 공용 조직·사용자·Neture 데이터·인쇄 QR 연결·migration history 및 법정 보유 판단을 보호한다. PH 전용 데이터는 실제 귀속/FK·타 서비스 소비처 확인 후 삭제하는 정책이다.

18개 기존 정본의 원문 보존·추가 링크·code fence 대조, docs 민감정보 검사·whitespace 검사가 통과했다. 이 문서 PR은 운영 URL map·Cloud Run·DB를 변경하지 않으며 운영 삭제 완료를 뜻하지 않는다. 최신 실행 결과는 기존 폐기 TODO 및 운영 workflow에서 추적한다.

색인의 연결 정본을 추가 대조하여 사업 철학·Neture 약국 설계·shared module protocol·Store library/execution 설계·현행 refactoring 상태에도 PH 부분 폐기를 정렬했다. CLAUDE 진입점의 살아 있는 B2B 경로 목록에서는 은퇴 PH 축을 제외한다. Privacy/통합약관 게시 원문·과거 CHECK/IR/WO는 변경하지 않으며 이전 PH 데이터에 적용되는 법정 보유·동의 증빙 의무는 계속 유효하다. 문서 작업을 실제 게시 약관의 개정/재게시로 해석하지 않는다.

PR #439 리뷰 대응: ACTIVE Store Rules의 PH live B2B 표기와 QR Active Design의 PH capability/parity 후속 구현 계약에도 부분 폐기 표기를 추가했다. 공용 QR 구현/분석 계약과 인쇄 QR 연결은 그대로 유지한다.
