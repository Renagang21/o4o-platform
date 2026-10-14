import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { StoreQrCreateModal, type InlineQrTarget } from "./StoreQrCreateModal";
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from "./StoreWorkflowNavigation";

/** Only persisted content is passed here; the existing QR contract owns origin support. */
interface NextStepsProps { contentId?: string; title?: string }
export function StoreContentNextSteps(props: NextStepsProps) {
  const { key } = useStoreOperationScope();
  return <ContentNextStepsSession key={`${key}:${props.contentId ?? ''}`} {...props} />;
}
function ContentNextStepsSession({ contentId, title }: NextStepsProps) {
  const { isCurrent } = useStoreOperationScope();
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const [qrOpen, setQrOpen] = useState(false);
  const target = useMemo<InlineQrTarget | null>(
    () =>
      contentId
        ? { id: contentId, title: title ?? "내 매장 콘텐츠", origin: "direct" }
        : null,
    [contentId, title],
  );
  return (
    <section className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4">
      <h2 className="text-sm font-semibold text-teal-900">
        저장한 자료로 이어서 작업하기
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {target && (
          <button
            type="button"
            onClick={() => { if (isCurrent()) setQrOpen(true); }}
            className="rounded-lg border border-teal-300 bg-white px-3 py-2.5 text-sm text-teal-900"
          >
            이 콘텐츠로 QR 만들기
          </button>
        )}
        <Link
          className="rounded-lg border border-teal-300 bg-white px-3 py-2.5 text-sm text-teal-900"
          to={`${base}/library/contents`}
        >
          자료 선택·제작
        </Link>
        <Link
          className="rounded-lg border border-teal-300 bg-white px-3 py-2.5 text-sm text-teal-900"
          to={`${base}/workspace/use`}
        >
          매장에서 활용
        </Link>
      </div>
      <p className="mt-3 text-xs text-teal-800">저장한 콘텐츠를 활용할 수 있습니다. 게시 설정과 QR·기기 적용 결과는 각각 확인해 주세요.</p>
      <StoreQrCreateModal
        open={qrOpen}
        target={target}
        onClose={() => setQrOpen(false)}
      />
    </section>
  );
}
