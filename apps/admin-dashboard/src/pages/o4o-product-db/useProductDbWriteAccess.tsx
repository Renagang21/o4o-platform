/**
 * WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 §5
 *
 * 공통 Product DB 화면의 write action 노출 판정.
 *
 * 서비스 운영자(kpa-society · k-cosmetics · glycopharm 등)는 이 화면을 계속
 * **조회·검색·상세 확인**할 수 있다. 막는 것은 접근이 아니라 수정이다.
 * 판정 집합은 백엔드 `product-db-write-authority.ts` 의 `PRODUCT_DB_WRITE_ROLES`
 * 와 동일하며, 프런트는 표시만 담당한다 — 실제 경계는 백엔드 guard 다.
 */
import { canWriteProductDb } from '@o4o/auth-context';
import { useAuth } from '@/hooks/useAuth';

/** 현재 사용자가 공통 Product DB 를 수정할 수 있는가 (O4O 전체 관리자). */
export function useProductDbWriteAccess(): boolean {
  const { user } = useAuth();
  return canWriteProductDb(user);
}

/** write 권한이 없는 사용자에게 보여주는 조회 전용 안내. */
export function ProductDbReadOnlyNotice({ what = '이 화면' }: { what?: string }) {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      공통 Product DB 는 O4O 전체 관리자가 관리합니다. {what}에서는 조회만 가능합니다.
    </div>
  );
}
