/**
 * StoreChannelsPage — 채널 중심 진열 실행 콘솔 (K-Cosmetics)
 *
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreChannelsView 로 이관.
 *   이 파일은 API adapter + accent(theme) + route + 문구(labels) + guide slot 주입만 담는다.
 *   GuideBlock(@o4o/shared-space-ui) · GuideEditableSection(서비스 컴포넌트) ·
 *   fetchGuidePageContent(서비스 api) 는 store-ui-core 의존성이 아니므로 여기서 주입한다.
 */

import {
  StoreChannelsView,
  type StoreChannelsApi,
} from '@o4o/store-ui-core';
import {
  fetchChannelOverviewWithCode,
  fetchChannelOverview,
  createChannel,
} from '@/api/storeHub';
import {
  fetchChannelProducts,
  fetchAvailableProducts,
  addProductToChannel,
  deactivateChannelProduct,
  reorderChannelProducts,
} from '@/api/channelProducts';
import { GuideBlock } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '@/components/guide/GuideEditableSection';
import { fetchGuidePageContent } from '@/api/guideContent';

const GUIDE_PAGE_KEY = 'store.channel.editor';
const SERVICE_KEY_GUIDE = 'k-cosmetics';

const channelsApi: StoreChannelsApi = {
  fetchChannelOverviewWithCode: () => fetchChannelOverviewWithCode(),
  fetchChannelOverview: () => fetchChannelOverview(),
  createChannel: (channelType) => createChannel(channelType),
  // WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1:
  //   listAssets / updateAssetPublishStatus / updateAssetChannelMap 를 주입하지 않는다.
  //   이 축은 KPA 의 kpa_store_asset_controls 확장(본사 강제 배포·게시·채널 매핑)이며 K-Cosmetics 에는
  //   대응 원장·데이터·업무가 없다. 종전에는 /cosmetics/store-assets 가 KPA 조직 resolver 로 풀려
  //   이 화면이 사용자의 **KPA 약국** 스냅샷을 보여줬다(P0 tenant 결함). 축 자체를 빼서 닫는다.
  fetchChannelProducts: (channelId) => fetchChannelProducts(channelId),
  fetchAvailableProducts: (channelId) => fetchAvailableProducts(channelId),
  addProductToChannel: (channelId, productListingId) => addProductToChannel(channelId, productListingId),
  deactivateChannelProduct: (channelId, productChannelId) => deactivateChannelProduct(channelId, productChannelId),
  reorderChannelProducts: (channelId, items) => reorderChannelProducts(channelId, items),
};

export function StoreChannelsPage() {
  return (
    <StoreChannelsView
      api={channelsApi}
      /* Tailwind 가 스캔할 수 있도록 완성된 class 문자열로 전달한다(동적 조합 금지). */
      theme={{
        accentText: 'text-pink-600',
        accentBtn: 'text-white bg-pink-600 hover:bg-pink-700',
        accentSoftBtn: 'text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100',
        accentOutlineBtn: 'text-pink-700 bg-white border-pink-200 hover:bg-pink-50',
        accentTab: 'border-pink-600 text-pink-600',
        accentCard: 'border-pink-400 bg-pink-50',
        accentCardText: 'text-pink-700',
        accentIcon: 'text-pink-500',
        accentModalIcon: 'text-pink-600',
        accentRowHover: 'hover:border-pink-300 hover:bg-pink-50/30',
      }}
      routes={{
        dashboard: '/store',
        hubB2b: '/store-hub/b2b',
        storeSettings: '/store/settings',
        storeContent: '/store/content',
        signagePlaylist: '/store/marketing/signage/playlist',
      }}
      labels={{
        dashboardAction: '대시보드로 이동',
        missingOrgCodeHint: '매장 설정에서 매장 코드를 등록하면 공개 URL이 생성됩니다.',
        emptyChannelAssetsHint: '자산 관리에서 채널 배치를 설정하거나, 콘텐츠를 가져오세요.',
      }}
      fetchGuideSections={() => fetchGuidePageContent(SERVICE_KEY_GUIDE, GUIDE_PAGE_KEY)}
      renderGuideBlock={({ title, description, steps }) => (
        <GuideBlock variant="info" title={title} description={description} steps={steps} compact />
      )}
      renderHeroDescription={({ defaultContent }) => (
        <GuideEditableSection
          pageKey="store/channels"
          sectionKey="hero-description"
          defaultContent={defaultContent}
        />
      )}
    />
  );
}

export default StoreChannelsPage;
