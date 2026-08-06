/**
 * LibraryPage (약국 경영자) — 자료함 / 제작 자료
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 공통 `StoreProductionMaterialsView`(@o4o/store-ui-core)를 그대로 쓴다 — 화면 복제 0.
 * 목록은 공통 `mergeProductionMaterials` 로 정규화한다:
 *   - store_execution_assets (자료함)
 *   - store_blog_posts       (블로그)
 * QR·직접작성 소스는 Pharmacy-Hub V1 범위 밖이라 주입하지 않는다(선택 소스 — 미주입 시 빈 배열).
 *
 * 교차 진입 CTA 기본값(`/store/marketing/*`)은 Pharmacy-Hub 에 route 가 없다 →
 * PH route 로 override 한다 (데드링크 0). 가이드 페이지도 없어 guideLink=null.
 *
 * fetchDerivations: Pharmacy-Hub 에는 원본→사본 파생(store_asset_derivations) 생성 경로가
 * 아직 없다. 공통 `/store/asset-derivations` 는 KPA/GP/KCos mount 전용 가드(requirePharmacyOwner)
 * 라 그대로 호출할 수 없고, 본 WO 는 공통 가드 변경을 금지한다. 따라서 빈 결과를 돌려주는
 * 어댑터를 주입한다 — 다른 조직 데이터를 노출할 경로 자체를 만들지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, FileEdit } from 'lucide-react';
import { StoreProductionMaterialsView, mergeProductionMaterials } from '@o4o/store-ui-core';
import type { ProductionMaterialItem, StoreProductionMaterialsCrossLink } from '@o4o/store-ui-core';
import { fetchLibraryAssets } from '../../lib/api/pharmacyHubStoreLibrary';
import { fetchBlogPosts } from '../../lib/api/pharmacyHubStoreBlog';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const CROSS_LINKS: StoreProductionMaterialsCrossLink[] = [
  { key: 'content', label: '콘텐츠 작성', icon: FileEdit, to: '/store-owner/content' },
  { key: 'blog', label: '블로그 글쓰기', icon: PenLine, to: '/store-owner/blog/new' },
];

/** Pharmacy-Hub 는 파생 관계를 만들지 않는다 — 공통 뷰어에 빈 결과를 준다. */
async function fetchDerivations(): Promise<{ items: never[] }> {
  return { items: [] };
}

export default function StoreOwnerLibraryPage() {
  const [items, setItems] = useState<ProductionMaterialItem[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchLibraryAssets({ page: 1, limit: 100 }), fetchBlogPosts({ page: 1, limit: 100 })])
      .then(([assets, blog]) => {
        setConnection(assets.storeConnection);
        setItems(
          mergeProductionMaterials({
            executionAssets: assets.items,
            blogPosts: blog.posts,
          }),
        );
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '자료함을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (connection && connection.status !== 'connected') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-1 text-xl font-bold">자료함</h1>
        <p className="mb-6 text-sm text-gray-500">매장에서 활용하는 자료와 제작 결과물을 모아 봅니다.</p>
        <StoreConnectionNotice connection={connection} subject="매장 자료" />
        <p className="mt-6 text-sm">
          <Link to="/store-owner" className="text-gray-500 underline">
            약국 경영자 홈
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <StoreProductionMaterialsView
        items={items}
        loading={loading}
        error={error}
        onRefresh={load}
        fetchDerivations={fetchDerivations}
        crossCreateLinks={CROSS_LINKS}
        guideLink={null}
      />
      <div className="mx-auto max-w-[900px] px-6 pb-8 text-sm">
        <Link to="/store-owner/library/resources" className="text-blue-600 underline">
          자료 등록·관리로 이동
        </Link>
      </div>
    </>
  );
}
