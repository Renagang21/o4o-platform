import React from 'react';
import ReferralLinkBox from '../components/affiliate/ReferralLinkBox';
import AffiliateStats from '../components/affiliate/AffiliateStats';
import ActivityHistoryTable from '../components/affiliate/ActivityHistoryTable';
import NoticeBanner from '../components/affiliate/NoticeBanner';

const AffiliateDashboard: FC = () => {
  const [showNotice, setShowNotice] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            제휴 마케팅 대시보드
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            리퍼럴 링크를 통해 발생한 수익을 확인하고 관리하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 왼쪽 컬럼 */}
          <div className="space-y-6">
            <ReferralLinkBox />
            {showNotice && <NoticeBanner onClose={() => setShowNotice(false)} />}
          </div>

          {/* 오른쪽 컬럼 */}
          <div className="space-y-6">
            <AffiliateStats />
            <ActivityHistoryTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard; 