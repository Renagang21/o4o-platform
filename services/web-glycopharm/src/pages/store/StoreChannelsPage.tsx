/**
 * StoreChannelsPage — 채널 중심 진열 실행 콘솔 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
 * WO-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreChannelsView 로 이관.
 *   이 파일은 API adapter + accent(theme) + route + 문구(labels) + guide/quick-action slot 주입만 담는다.
 *   GP 전용 SIGNAGE Quick Action('디지털사이니지 운영')은 renderExtraQuickActions slot 으로 보존한다.
 */

import { useNavigate } from 'react-router-dom';
import {
  StoreChannelsView,
  type StoreChannelsApi,
  type StoreChannelAssetItem,
} from '@o4o/store-ui-core';
import {
  fetchChannelOverviewWithCode,
  fetchChannelOverview,
  createChannel,
} from '@/api/storeHub';
import { storeAssetControlApi } from '@/api/assetSnapshot';
import {
  fetchChannelProducts,
  fetchAvailableProducts,
  addProductToChannel,
  deactivateChannelProduct,
  reorderChannelProducts,
} from '@/api/channelProducts';
import { GuideBlock } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide/GuideEditableSection';
import { fetchGuidePageContent } from '@/api/guideContent';

const GUIDE_PAGE_KEY = 'store.channel.editor';
const SERVICE_KEY_GUIDE = 'glycopharm';

const channelsApi: StoreChannelsApi = {
  fetchChannelOverviewWithCode: () => fetchChannelOverviewWithCode(),
  fetchChannelOverview: () => fetchChannelOverview(),
  createChannel: (channelType) => createChannel(channelType),
  listAssets: (params) =>
    storeAssetControlApi.list(params).then(r => r.data.items as StoreChannelAssetItem[]),
  updateAssetPublishStatus: (snapshotId, status) =>
    storeAssetControlApi.updatePublishStatus(snapshotId, status).then(r => ({ publishStatus: r.data.publishStatus })),
  updateAssetChannelMap: (snapshotId, channelMap) =>
    storeAssetControlApi.updateChannelMap(snapshotId, channelMap).then(r => ({ channelMap: r.data.channelMap })),
  fetchChannelProducts: (channelId) => fetchChannelProducts(channelId),
  fetchAvailableProducts: (channelId) => fetchAvailableProducts(channelId),
  addProductToChannel: (channelId, productListingId) => addProductToChannel(channelId, productListingId),
  deactivateChannelProduct: (channelId, productChannelId) => deactivateChannelProduct(channelId, productChannelId),
  reorderChannelProducts: (channelId, items) => reorderChannelProducts(channelId, items),
};

export function StoreChannelsPage() {
  const navigate = useNavigate();

  return (
    <StoreChannelsView
      api={channelsApi}
      /* Tailwind 가 스캔할 수 있도록 완성된 class 문자열로 전달한다(동적 조합 금지). */
      theme={{
        accentText: 'text-blue-600',
        accentBtn: 'text-white bg-blue-600 hover:bg-blue-700',
        accentSoftBtn: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
        accentOutlineBtn: 'text-blue-700 bg-white border-blue-200 hover:bg-blue-50',
        accentTab: 'border-blue-600 text-blue-600',
        accentCard: 'border-blue-400 bg-blue-50',
        accentCardText: 'text-blue-700',
        accentIcon: 'text-blue-500',
        accentModalIcon: 'text-blue-600',
        accentRowHover: 'hover:border-blue-300 hover:bg-blue-50/30',
      }}
      routes={{
        dashboard: '/store/hub',
        hubB2b: '/store-hub/b2b',
        storeSettings: '/store/settings',
        storeContent: '/store/content',
        signagePlaylist: '/store/marketing/signage/playlist',
      }}
      labels={{
        dashboardAction: '매장 HUB으로 이동',
        missingOrgCodeHint: '매장 설정에서 약국 코드를 등록하면 공개 URL이 생성됩니다.',
        emptyChannelAssetsHint: '자산 관리에서 채널 배치를 설정하거나, 매장 HUB에서 콘텐츠를 가져오세요.',
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
      /* GP 전용: SIGNAGE 탭에서만 노출되는 사이니지 운영 진입 */
      renderExtraQuickActions={({ activeTab }) =>
        activeTab === 'SIGNAGE' ? (
          <button
            onClick={() => navigate('/store/marketing/signage/playlist')}
            className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
          >
            디지털사이니지 운영
          </button>
        ) : null
      }
    />
  );
}

export default StoreChannelsPage;
