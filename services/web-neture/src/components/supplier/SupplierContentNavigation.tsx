import { Link, useSearchParams } from "react-router-dom";
import { supplierReturnPath } from "../../lib/supplierNavigation";

/** 같은 자료 작업의 현황·제작·복귀 진입. 저장 원장과 편집기는 각 기존 화면이 담당한다. */
export default function SupplierContentNavigation() {
  const [params] = useSearchParams();
  const returnTo = supplierReturnPath(
    params.get("returnTo"),
    "/supplier/store-materials-status",
  );
  return (
    <nav
      aria-label="공급자 자료 작업"
      className="mb-4 flex flex-wrap gap-2 text-sm"
    >
      <Link
        to={returnTo}
        className="rounded-lg border bg-white px-3 py-2 text-blue-700"
      >
        {params.has("returnTo") ? "이전 업무로 돌아가기" : "자료 현황"}
      </Link>
      <Link
        to="/supplier/library"
        className="rounded-lg border bg-white px-3 py-2 text-slate-600"
      >
        자료 보관함
      </Link>
      <Link
        to="/supplier/store-descriptions"
        className="rounded-lg border bg-white px-3 py-2 text-slate-600"
      >
        상품 설명서 만들기
      </Link>
      <Link
        to="/supplier/tablet-screen-sets"
        className="rounded-lg border bg-white px-3 py-2 text-slate-600"
      >
        태블릿 화면 만들기
      </Link>
      <Link
        to="/supplier/signage"
        className="rounded-lg border bg-white px-3 py-2 text-slate-600"
      >
        사이니지 만들기
      </Link>
    </nav>
  );
}
