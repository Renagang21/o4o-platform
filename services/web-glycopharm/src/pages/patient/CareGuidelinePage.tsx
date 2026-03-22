/**
 * CareGuidelinePage — 당뇨 케어 가이드라인
 * WO-GLYCOPHARM-PATIENT-CARE-GUIDELINE-V1
 * WO-GLYCOPHARM-GUIDELINE-CMS-MIGRATION-V1: CMS 연동 + 정적 폴백
 *
 * 당뇨 관리 교육 자료 페이지.
 * CMS에 발행된 가이드라인이 있으면 CMS HTML 렌더링,
 * 없으면 정적 콘텐츠 아코디언 UI 폴백.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Activity,
  Utensils,
  Dumbbell,
  Pill,
  AlertTriangle,
  Heart,
  Stethoscope,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { ContentPreview } from '@o4o/content-editor';
import { cmsApi } from '@/api/cms';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  items: { heading: string; body: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'monitoring',
    icon: <Activity className="w-5 h-5" />,
    title: '혈당 모니터링',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    items: [
      {
        heading: '측정 시점',
        body: '공복(아침 식전), 식후 2시간, 취침 전을 권장합니다. 주치의 지시에 따라 추가 측정이 필요할 수 있습니다.',
      },
      {
        heading: '목표 혈당 범위',
        body: '일반적으로 공복 혈당 80~130mg/dL, 식후 2시간 혈당 180mg/dL 미만을 목표로 합니다. 개인마다 다를 수 있으므로 주치의와 상담하세요.',
      },
      {
        heading: '기록의 중요성',
        body: '매일 혈당을 기록하면 패턴을 파악하고 치료 효과를 평가할 수 있습니다. 앱의 혈당 입력 기능을 활용하세요.',
      },
    ],
  },
  {
    id: 'diet',
    icon: <Utensils className="w-5 h-5" />,
    title: '식이요법 가이드',
    color: 'text-green-600',
    bg: 'bg-green-50',
    items: [
      {
        heading: '균형 잡힌 식단',
        body: '매 끼니 탄수화물, 단백질, 지방을 균형 있게 섭취하세요. 접시의 절반은 채소, 1/4은 단백질, 1/4은 탄수화물로 구성하는 것이 좋습니다.',
      },
      {
        heading: '탄수화물 관리',
        body: '정제된 탄수화물(백미, 흰 빵) 대신 통곡물, 잡곡밥을 선택하세요. 한 끼 탄수화물 양을 일정하게 유지하면 혈당 변동을 줄일 수 있습니다.',
      },
      {
        heading: '식사 시간',
        body: '규칙적인 식사 시간을 유지하세요. 식사를 거르면 다음 식사 때 과식하게 되어 혈당이 급격히 오를 수 있습니다.',
      },
      {
        heading: '간식 선택',
        body: '견과류, 삶은 달걀, 채소 스틱 등 혈당을 천천히 올리는 간식을 선택하세요. 과일은 적정량(주먹 1개 크기)을 지키세요.',
      },
    ],
  },
  {
    id: 'exercise',
    icon: <Dumbbell className="w-5 h-5" />,
    title: '운동 가이드',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    items: [
      {
        heading: '유산소 운동',
        body: '걷기, 자전거 타기, 수영 등 유산소 운동을 주 150분 이상(주 5일, 하루 30분) 실시하세요. 식후 30분~1시간 후 운동하면 혈당 조절에 효과적입니다.',
      },
      {
        heading: '근력 운동',
        body: '주 2~3회 근력 운동을 병행하면 인슐린 감수성을 높이는 데 도움이 됩니다. 가벼운 아령이나 밴드 운동부터 시작하세요.',
      },
      {
        heading: '운동 시 주의사항',
        body: '운동 전후 혈당을 확인하세요. 혈당이 70mg/dL 미만이면 간식을 먼저 섭취하고, 300mg/dL 이상이면 운동을 미루세요. 항상 포도당 정제 등 응급 간식을 준비하세요.',
      },
    ],
  },
  {
    id: 'medication',
    icon: <Pill className="w-5 h-5" />,
    title: '약물 복용 안내',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    items: [
      {
        heading: '복용 원칙',
        body: '처방받은 약은 정해진 시간에 정확한 용량으로 복용하세요. 임의로 복용량을 변경하거나 중단하지 마세요.',
      },
      {
        heading: '인슐린 관리',
        body: '인슐린은 냉장 보관(2~8°C)하고, 사용 중인 것은 실온(30°C 이하)에서 28일 이내 사용하세요. 주사 부위를 매번 바꿔주세요.',
      },
      {
        heading: '부작용 관찰',
        body: '저혈당(어지러움, 떨림, 식은땀), 소화 장애 등 이상 증상이 있으면 즉시 주치의에게 상담하세요.',
      },
    ],
  },
  {
    id: 'emergency',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: '저혈당 · 고혈당 대처',
    color: 'text-red-600',
    bg: 'bg-red-50',
    items: [
      {
        heading: '저혈당 증상 (70mg/dL 미만)',
        body: '어지러움, 식은땀, 손 떨림, 심장 두근거림, 공복감, 두통이 나타날 수 있습니다.',
      },
      {
        heading: '저혈당 대처법 (15-15 규칙)',
        body: '포도당 정제 3~4개 또는 주스/사탕 등 당분 15g을 섭취 → 15분 후 혈당 재측정 → 여전히 70mg/dL 미만이면 한 번 더 섭취. 의식이 없으면 119에 즉시 신고하세요.',
      },
      {
        heading: '고혈당 증상 (250mg/dL 이상)',
        body: '잦은 소변, 극심한 갈증, 피로감, 시야 흐림이 나타날 수 있습니다. 충분한 수분을 섭취하고 격렬한 운동은 피하세요. 300mg/dL 이상이 지속되면 즉시 의료기관을 방문하세요.',
      },
    ],
  },
  {
    id: 'complications',
    icon: <Heart className="w-5 h-5" />,
    title: '합병증 예방',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    items: [
      {
        heading: '눈 관리',
        body: '당뇨 망막병증 예방을 위해 연 1회 안저 검사를 받으세요. 시력 변화가 느껴지면 바로 안과를 방문하세요.',
      },
      {
        heading: '발 관리',
        body: '매일 발을 확인하고, 상처나 감각 이상이 있는지 살피세요. 발톱은 일자로 깎고, 맨발 보행을 피하세요.',
      },
      {
        heading: '신장 관리',
        body: '최소 연 1회 소변 알부민 검사와 혈액 크레아티닌 검사를 받으세요. 충분한 수분을 섭취하고 과도한 단백질 섭취를 피하세요.',
      },
      {
        heading: '심혈관 관리',
        body: '혈압(130/80mmHg 미만), 콜레스테롤(LDL 100mg/dL 미만) 관리가 중요합니다. 금연은 합병증 예방에 가장 효과적입니다.',
      },
    ],
  },
  {
    id: 'checkup',
    icon: <Stethoscope className="w-5 h-5" />,
    title: '정기 검진 안내',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    items: [
      {
        heading: 'HbA1c 검사',
        body: '3개월마다 당화혈색소(HbA1c) 검사를 받으세요. 일반적 목표는 7.0% 미만이며, 개인 상태에 따라 달라질 수 있습니다.',
      },
      {
        heading: '정기 검사 항목',
        body: '혈압, 혈중 지질(콜레스테롤), 신장 기능, 간 기능 검사를 최소 6개월~1년 간격으로 받으세요.',
      },
      {
        heading: '전문의 상담',
        body: '내분비내과 정기 방문 외에도 안과(연 1회), 치과(6개월), 신경과(필요 시) 검진을 받으세요.',
      },
    ],
  },
];

export default function CareGuidelinePage() {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['monitoring']));

  // CMS 연동 상태
  const [cmsHtml, setCmsHtml] = useState<string | null>(null);
  const [cmsTitle, setCmsTitle] = useState<string | null>(null);
  const [cmsLoading, setCmsLoading] = useState(true);

  useEffect(() => {
    cmsApi
      .getContents({ serviceKey: 'glycopharm', type: 'guide', status: 'published' })
      .then((res) => {
        const guide = res.data.find(
          (c: any) => c.metadata?.guidelineTarget === 'patient',
        );
        if (guide) return cmsApi.getContentById(guide.id);
        return null;
      })
      .then((detail) => {
        if (detail?.data?.body) {
          setCmsHtml(detail.data.body);
          setCmsTitle(detail.data.title);
        }
      })
      .catch(() => {}) // fallback to static
      .finally(() => setCmsLoading(false));
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (cmsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/patient')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {cmsTitle || '당뇨 케어 가이드라인'}
          </h1>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-[52px]">
          당뇨 관리에 도움이 되는 교육 자료입니다.
        </p>

        {/* Notice */}
        <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-amber-700 leading-relaxed">
            본 자료는 일반적인 당뇨 관리 정보이며, 개인의 상태에 따라 다를 수 있습니다. 구체적인 치료 방침은 반드시 담당 의료진과 상담하세요.
          </p>
        </div>

        {/* CMS Content or Static Fallback */}
        {cmsHtml ? (
          <div className="prose prose-sm max-w-none">
            <ContentPreview html={cmsHtml} />
          </div>
        ) : (
          /* Static Accordion Fallback */
          <div className="space-y-3">
            {GUIDE_SECTIONS.map((section) => {
              const isOpen = openSections.has(section.id);
              return (
                <div
                  key={section.id}
                  className="border border-slate-200 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg ${section.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={section.color}>{section.icon}</span>
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-800">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="pl-12">
                          <h3 className="text-sm font-medium text-slate-700 mb-1">
                            {item.heading}
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-xs text-slate-400">
            대한당뇨병학회 진료지침 참고
          </p>
        </div>
      </div>
    </div>
  );
}
