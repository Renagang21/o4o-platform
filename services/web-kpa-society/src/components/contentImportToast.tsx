/**
 * contentImportToast — "내 자료함 가져가기" 완료 안내 + canonical 관리 화면 CTA
 *
 * WO-O4O-KPA-CONTENT-IMPORT-COMPLETE-CANONICAL-MANAGEMENT-LINK-V1
 *
 * 배경(IR-...-USABILITY-AND-FLOW-AUDIT-V1 C6):
 *   복사는 정상 동작했으나 완료 후 방금 가져온 사본을 확인·수정할 진입점이 없었다.
 *   (기존: 성공 토스트 문구만 표시 → 사용자가 자료함을 직접 찾아 들어가야 함)
 *
 * 설계:
 *   - 자동 redirect 하지 않는다. 현재 화면(목록/Drawer/상세)을 유지하고 CTA 만 제공한다
 *     → 재복사·다른 콘텐츠 탐색 흐름 보존.
 *   - 기존 성공 문구를 그대로 유지하고 CTA 만 덧붙인다(회귀 최소화).
 *   - 신규 알림 시스템을 만들지 않는다. 기존 toast(react-hot-toast)의 custom 렌더만 사용하며
 *     색상은 O4OToastProvider 의 success 스타일과 동일하게 맞춘다.
 *   - 단일 = 생성된 사본 편집 화면 / 일괄 = canonical 자료함 목록 (임의의 마지막 사본으로 가지 않는다).
 */

import { toast } from '@o4o/error-handling';
import { STORE_LIBRARY_CONTENTS_PATH, storeContentEditPath } from '../api/contentStoreImport';

/** CTA 노출 시간 — 기본 success(2.5s)보다 길게 잡아 클릭할 여유를 준다 */
const CTA_TOAST_DURATION = 7000;

type NavigateFn = (path: string) => void;

function renderImportToast(message: string, ctaLabel: string, to: string, navigate: NavigateFn) {
  toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderRadius: 8,
          padding: '12px 16px',
          fontSize: 14,
          maxWidth: 400,
          // O4OToastProvider success 스타일과 동일
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          boxShadow: '0 3px 10px rgba(0,0,0,.1)',
          opacity: t.visible ? 1 : 0,
          transition: 'opacity .15s ease',
        }}
      >
        <span>{message}</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            navigate(to);
          }}
          style={{
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #16a34a',
            background: '#16a34a',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
      </div>
    ),
    { duration: CTA_TOAST_DURATION },
  );
}

/**
 * 단일 가져오기 완료 — 생성된 사본의 편집 화면으로 연결.
 * snapshotId 가 없으면(예: 응답 형태 예외) CTA 없이 기존 성공 토스트로 폴백한다.
 */
export function notifyContentImported(snapshotId: string | undefined | null, navigate: NavigateFn) {
  const message = '내 자료함에 가져왔습니다';
  if (!snapshotId) {
    toast.success(message);
    return;
  }
  renderImportToast(message, '가져온 콘텐츠 보기', storeContentEditPath(snapshotId), navigate);
}

/**
 * 일괄 가져오기 완료 — canonical 자료함 목록으로 연결.
 * 여러 건이므로 특정 사본으로 이동하지 않는다.
 */
export function notifyContentsImported(count: number, message: string, navigate: NavigateFn) {
  if (count <= 0) {
    toast.success(message);
    return;
  }
  renderImportToast(message, '내 자료함에서 보기', STORE_LIBRARY_CONTENTS_PATH, navigate);
}
