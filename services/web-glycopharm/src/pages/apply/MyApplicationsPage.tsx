/**
 * MyApplicationsPage — 내 신청 목록 / 상태 확인 (GlycoPharm 참여 신청)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1 §5·§6·§8·§14
 *
 * 변경: 목록/상태/상세 표현을 자체 구현하지 않고 공통 `MyRequestsInbox` 에 위임한다.
 *       backend 계약(`GET /glycopharm/applications/me` 등 기존 호출)은 그대로이며,
 *       변환은 이 파일의 adapter(`toRequestItem`)에서만 한다(§8).
 *       서비스 고유 필드(신청 서비스 종류·사업자번호·메모)는 `detailSlot` 확장으로 유지한다.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Truck, Monitor } from 'lucide-react';
import { MyRequestsInbox } from '@o4o/account-ui';
import type { MyRequestItem } from '@o4o/account-ui';
import { glycopharmApi } from '@/api/glycopharm';
import type { GlycopharmApplication, ServiceType } from '@/api/glycopharm';
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '@/api/guideContent';

const GUIDE_PAGE_KEY = 'user.application.status';
const GUIDEBLOCK_SECTION_KEY = 'guideblock-page-help';
const SERVICE_KEY = 'glycopharm';

const SERVICE_LABELS: Record<ServiceType, { label: string; icon: typeof Building2 }> = {
  dropshipping: { label: '무재고 판매', icon: Truck },
  sample_sales: { label: '샘플 판매', icon: Building2 },
  digital_signage: { label: '디지털사이니지', icon: Monitor },
};

/**
 * GlycoPharm 상태 enum 은 재설계하지 않는다 (§9).
 *
 * `glycopharm_applications.status` 의 `submitted` 는 "운영자 검토 대기" 를 뜻하므로
 * 공통 기본 라벨(`submitted` = '제출됨')이 아니라 `pending` 과 같은 '검토 중' 으로 표시한다.
 * 같은 신청서를 보여주는 `/mypage/my-requests`(backend 가 `pending` 으로 내려줌)와
 * 라벨/tone 이 어긋나지 않도록 맞춘 것이다. `approved` / `rejected` 는 공통 기본값을 그대로 쓴다.
 */
const STATUS_OVERRIDES = {
  submitted: { label: '검토 중', tone: 'amber' as const },
};

const TYPE_OVERRIDES = {
  service_application: { label: '참여 신청', tone: 'blue' as const },
};

/** GlycopharmApplication → 최소 공통 view model (§8). */
function toRequestItem(app: GlycopharmApplication): MyRequestItem {
  return {
    id: app.id,
    entityType: 'service_application',
    status: app.status,
    displayTitle: app.organizationName || '약국 참여 신청',
    displayDescription: app.organizationType === 'pharmacy_chain' ? '약국 체인' : '개인 약국',
    reviewComment: app.rejectionReason ?? null,
    revisionNote: null,
    reviewedAt: app.decidedAt ?? null,
    resultEntityId: null,
    resultMetadata: null,
    submittedAt: app.submittedAt ?? null,
    createdAt: app.submittedAt ?? new Date().toISOString(),
    updatedAt: app.decidedAt ?? app.submittedAt,
    serviceKey: SERVICE_KEY,
    payload: {
      serviceTypes: app.serviceTypes ?? [],
      businessNumber: app.businessNumber ?? null,
      note: app.note ?? null,
    },
  };
}

export default function MyApplicationsPage() {
  const [items, setItems] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then(sections => {
        if (cancelled) return;
        const raw = sections[GUIDEBLOCK_SECTION_KEY];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);

    try {
      const response = await glycopharmApi.getMyApplications();
      setItems((response.applications ?? []).map(toRequestItem));
    } catch (err: any) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        setAuthRequired(true);
        setError('로그인이 필요합니다.');
      } else {
        setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">내 신청 목록</h1>
          <p className="text-slate-500">제출한 신청서의 상태를 확인하세요.</p>
        </div>

        <div className="mb-6">
          <GuideBlock
            variant="info"
            title={guideTitle ?? '신청 상태 확인 안내'}
            description={guideDesc ?? '제출한 신청서의 처리 현황을 확인합니다.'}
            steps={guideSteps ?? [
              '심사 중인 신청은 처리 완료까지 영업일 기준 며칠이 소요될 수 있습니다.',
              '승인 후 해당 서비스 이용이 활성화됩니다.',
              '반려된 경우 반려 사유를 확인 후 재신청하실 수 있습니다.',
            ]}
            compact
          />
        </div>

        {/* 인증 필요 — 의도된 guard 는 오류 UI 가 아니라 로그인 안내로 표시한다 (§15) */}
        {authRequired ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-slate-700 mb-6">신청 내역을 확인하려면 로그인해 주세요.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              로그인하기
            </Link>
          </div>
        ) : (
          <MyRequestsInbox
            items={items}
            loading={loading}
            error={error}
            onRetry={loadApplications}
            showStats={false}
            statusOverrides={STATUS_OVERRIDES}
            typeOverrides={TYPE_OVERRIDES}
            detailSlot={(item) => {
              const serviceTypes = (item.payload?.serviceTypes as ServiceType[] | undefined) ?? [];
              const businessNumber = item.payload?.businessNumber as string | null | undefined;
              const note = item.payload?.note as string | null | undefined;
              return (
                <>
                  {serviceTypes.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1.5">신청 서비스</div>
                      <div className="flex flex-wrap gap-2">
                        {serviceTypes.map((serviceType) => {
                          const service = SERVICE_LABELS[serviceType];
                          if (!service) return null;
                          const Icon = service.icon;
                          return (
                            <div
                              key={serviceType}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg"
                            >
                              <Icon className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-sm text-slate-600">{service.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {businessNumber && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">사업자번호</div>
                      <p className="text-sm text-slate-700">{businessNumber}</p>
                    </div>
                  )}
                  {note && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">메모</div>
                      <p className="text-sm text-slate-700">{note}</p>
                    </div>
                  )}
                </>
              );
            }}
            emptyTitle="신청 내역이 없습니다"
            emptyDescription="참여 신청을 하면 여기에 표시됩니다"
            actionSection={
              !loading && !error && items.length === 0 ? (
                <div className="mb-4 text-center">
                  <Link
                    to="/apply"
                    className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    참여 신청하기
                  </Link>
                </div>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}
