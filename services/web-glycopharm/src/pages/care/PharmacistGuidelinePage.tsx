/**
 * PharmacistGuidelinePage — 약국 케어 가이드라인
 * WO-GLYCOPHARM-PHARMACIST-GUIDELINE-V1
 *
 * 약사/약국 관리자용 당뇨 케어 실무 가이드라인.
 * 정적 콘텐츠 기반, 아코디언 UI.
 */

import { useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  UserCheck,
  Activity,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Stethoscope,
  ChevronDown,
} from 'lucide-react';

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
    id: 'initial-assessment',
    icon: <ClipboardList className="w-5 h-5" />,
    title: '초기 환자 평가',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    items: [
      {
        heading: '등록 시 확인 사항',
        body: '당뇨 유형(제1형/제2형/임신성/전단계), 진단 시기, 현재 처방약, HbA1c 최근 수치, 합병증 유무를 확인합니다. 환자 프로필에 기록하면 이후 케어에 활용됩니다.',
      },
      {
        heading: '혈당 측정 습관 파악',
        body: '자가혈당측정(SMBG) 빈도, 측정 시점(공복/식후/취침 전), 사용 기기를 파악합니다. 측정이 불규칙한 환자에게는 최소 공복 + 식후 2시간 측정을 권장하세요.',
      },
      {
        heading: '목표 수치 설정',
        body: '일반적 목표: 공복 80~130mg/dL, 식후 2시간 <180mg/dL, HbA1c <7.0%. 고령자·합병증 동반 시 완화 목표(HbA1c <8.0%)를 적용할 수 있습니다. 담당 의사의 지시를 우선합니다.',
      },
    ],
  },
  {
    id: 'patient-engagement',
    icon: <UserCheck className="w-5 h-5" />,
    title: '환자 참여 유도',
    color: 'text-green-600',
    bg: 'bg-green-50',
    items: [
      {
        heading: '첫 방문 안내',
        body: '앱 사용법(혈당 입력, 데이터 조회)을 간단히 안내합니다. 처음에는 하루 1~2회 혈당 기록만으로도 충분하다는 점을 강조하여 부담을 줄이세요.',
      },
      {
        heading: '정기 접점 유지',
        body: '2주 또는 월 1회 간격으로 혈당 추이를 함께 확인하는 시간을 가지세요. 예약 기능을 활용하면 체계적으로 관리할 수 있습니다.',
      },
      {
        heading: '동기 부여',
        body: 'Time in Range(TIR) 개선, 평균 혈당 감소 등 긍정적 변화를 구체적 수치로 보여주세요. 작은 개선도 함께 인정하면 지속적 참여에 도움이 됩니다.',
      },
    ],
  },
  {
    id: 'data-monitoring',
    icon: <Activity className="w-5 h-5" />,
    title: '혈당 데이터 모니터링',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    items: [
      {
        heading: 'TIR (Time in Range) 확인',
        body: '70~180mg/dL 범위 내 시간 비율이 70% 이상을 목표로 합니다. TIR이 낮으면 고혈당 또는 저혈당 빈도를 우선 확인하세요.',
      },
      {
        heading: 'CV (변동계수) 확인',
        body: 'CV 36% 이하면 안정적, 36% 초과면 혈당 변동이 큰 상태입니다. 변동이 크면 식사 패턴·운동·약물 복용 시간을 점검합니다.',
      },
      {
        heading: '패턴 분석',
        body: '공복 고혈당 반복 → 야간 인슐린 또는 경구약 조정 필요 가능성. 식후 고혈당 반복 → 탄수화물 양·식사 속도·약물 타이밍 점검. 저혈당 반복 → 약물 과량·식사 부족·운동 과다 확인.',
      },
      {
        heading: '위험 수준 판단',
        body: '고위험: TIR <50% 또는 CV >45% 또는 저혈당 주 3회 이상. 주의: TIR 50~70% 또는 CV 36~45%. 양호: TIR ≥70% 및 CV ≤36%. Care 대시보드의 위험도 표시를 활용하세요.',
      },
    ],
  },
  {
    id: 'coaching',
    icon: <MessageSquare className="w-5 h-5" />,
    title: '코칭 실무',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    items: [
      {
        heading: '코칭 세션 준비',
        body: '세션 전 환자의 최근 7~14일 혈당 데이터, TIR, CV를 미리 확인합니다. 이전 코칭 기록을 참고하여 지난번 권고사항의 이행 여부를 확인합니다.',
      },
      {
        heading: '코칭 내용 구성',
        body: '1) 데이터 기반 현황 공유 → 2) 문제점 1~2가지 선정 → 3) 구체적 실천 방안 제시 → 4) 다음 목표 합의. 한 번에 너무 많은 변화를 요구하지 말고, 1~2가지에 집중하세요.',
      },
      {
        heading: '기록 관리',
        body: '코칭 내용은 반드시 시스템에 기록합니다. 다음 세션에서 연속성 있는 케어를 제공하고, 다른 약사가 담당할 때도 일관된 관리가 가능합니다.',
      },
    ],
  },
  {
    id: 'emergency-response',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: '응급 상황 대응',
    color: 'text-red-600',
    bg: 'bg-red-50',
    items: [
      {
        heading: '반복적 저혈당',
        body: '주 2회 이상 저혈당(<70mg/dL) 발생 시 즉시 처방의에게 보고를 권합니다. 인슐린/설폰요소제 용량 조정이 필요할 수 있습니다. 환자에게 15-15 규칙을 재교육하세요.',
      },
      {
        heading: '지속적 고혈당',
        body: '공복 혈당이 3일 연속 250mg/dL 이상이면 의료기관 방문을 강하게 권합니다. 케톤산증(DKA) 위험이 있으므로 구역·구토·복통·과호흡 증상을 확인합니다.',
      },
      {
        heading: '약물 부작용 의심',
        body: '새 약물 시작 후 저혈당·소화장애·부종·체중 급변이 있으면 처방의 상담을 안내합니다. 약사로서 약물 상호작용 점검도 중요한 역할입니다.',
      },
    ],
  },
  {
    id: 'medication-review',
    icon: <TrendingUp className="w-5 h-5" />,
    title: '약물 복약 지도',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    items: [
      {
        heading: '복약 순응도 확인',
        body: '정기 방문 시 남은 약 수량, 복용 시간, 누락 빈도를 확인합니다. 혈당 패턴과 복약 이행을 연결하여 설명하면 환자의 이해도가 높아집니다.',
      },
      {
        heading: '주요 당뇨약 복용 지도',
        body: '메트포르민: 식사 중·후 복용(위장장애 감소). 설폰요소제: 식전 30분(저혈당 주의). DPP-4 억제제: 식사 무관. SGLT-2 억제제: 아침 복용 권장(야간 이뇨 방지). GLP-1 RA: 주 1회 제제 요일 고정.',
      },
      {
        heading: '인슐린 사용자 관리',
        body: '주사 부위 로테이션, 보관 온도(냉장 2~8°C, 개봉 후 실온 28일), 주사 기법(피부를 살짝 잡고 90도 주사)을 확인합니다. 리포하이퍼트로피(경결) 유무를 정기 점검하세요.',
      },
    ],
  },
  {
    id: 'referral',
    icon: <Stethoscope className="w-5 h-5" />,
    title: '의뢰 기준 및 협력',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    items: [
      {
        heading: '의료기관 의뢰 기준',
        body: 'HbA1c 9.0% 이상 지속, 저혈당 반복(주 3회 이상), 새로운 합병증 증상(시력 변화, 발 궤양, 단백뇨), 약물 부작용이 의심될 때는 의료기관 방문을 적극 권합니다.',
      },
      {
        heading: '다직종 협력',
        body: '영양사 연계(식이 상담 필요 시), 안과(연 1회 안저검사), 족부 관리(발 관리 교육). 약국에서 제공하는 케어와 전문의 진료가 상호 보완되도록 합니다.',
      },
      {
        heading: '정보 공유',
        body: '환자 동의 하에 혈당 추이·코칭 기록을 담당 의사에게 공유할 수 있습니다. 체계적 데이터는 처방 조정에 유용한 근거가 됩니다.',
      },
    ],
  },
];

export default function PharmacistGuidelinePage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['initial-assessment']));

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">약국 케어 가이드라인</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-[52px]">
          당뇨 환자 케어 실무 참고 자료입니다.
        </p>

        {/* Notice */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700 leading-relaxed">
            본 자료는 약국 기반 당뇨 케어의 일반적 실무 지침이며, 개별 환자 상태에 따라 전문의 판단이 우선합니다. 대한당뇨병학회 및 대한약사회 지침을 참고하였습니다.
          </p>
        </div>

        {/* Accordion Sections */}
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

        {/* Footer */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-xs text-slate-400">
            대한당뇨병학회 진료지침 · 대한약사회 복약지도 가이드 참고
          </p>
        </div>
      </div>
    </div>
  );
}
