/**
 * GuidelineManagementPage — 운영자 가이드라인 관리
 * WO-GLYCOPHARM-GUIDELINE-CMS-MIGRATION-V1
 *
 * 당뇨인용 / 약국용 가이드라인 2개를 CMS로 관리.
 * TipTap RichTextEditor로 편집, 발행 후 사용자 페이지에 반영.
 */

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Edit3, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cmsApi, type CmsContent, type CmsContentDetail } from '@/api/cms';
import { RichTextEditor, ContentPreview } from '@o4o/content-editor';

/* ── 가이드라인 대상 정의 ── */

interface GuidelineTarget {
  key: 'patient' | 'pharmacist';
  label: string;
  title: string;
  summary: string;
  staticHtml: string;
}

const TARGETS: GuidelineTarget[] = [
  {
    key: 'patient',
    label: '당뇨인용 가이드라인',
    title: '당뇨 케어 가이드라인',
    summary: '당뇨 관리에 도움이 되는 교육 자료입니다.',
    staticHtml: [
      '<h2>혈당 모니터링</h2>',
      '<h3>측정 시점</h3><p>공복(아침 식전), 식후 2시간, 취침 전을 권장합니다. 주치의 지시에 따라 추가 측정이 필요할 수 있습니다.</p>',
      '<h3>목표 혈당 범위</h3><p>일반적으로 공복 혈당 80~130mg/dL, 식후 2시간 혈당 180mg/dL 미만을 목표로 합니다. 개인마다 다를 수 있으므로 주치의와 상담하세요.</p>',
      '<h3>기록의 중요성</h3><p>매일 혈당을 기록하면 패턴을 파악하고 치료 효과를 평가할 수 있습니다. 앱의 혈당 입력 기능을 활용하세요.</p>',
      '<h2>식이요법 가이드</h2>',
      '<h3>균형 잡힌 식단</h3><p>매 끼니 탄수화물, 단백질, 지방을 균형 있게 섭취하세요. 접시의 절반은 채소, 1/4은 단백질, 1/4은 탄수화물로 구성하는 것이 좋습니다.</p>',
      '<h3>탄수화물 관리</h3><p>정제된 탄수화물(백미, 흰 빵) 대신 통곡물, 잡곡밥을 선택하세요. 한 끼 탄수화물 양을 일정하게 유지하면 혈당 변동을 줄일 수 있습니다.</p>',
      '<h3>식사 시간</h3><p>규칙적인 식사 시간을 유지하세요. 식사를 거르면 다음 식사 때 과식하게 되어 혈당이 급격히 오를 수 있습니다.</p>',
      '<h3>간식 선택</h3><p>견과류, 삶은 달걀, 채소 스틱 등 혈당을 천천히 올리는 간식을 선택하세요. 과일은 적정량(주먹 1개 크기)을 지키세요.</p>',
      '<h2>운동 가이드</h2>',
      '<h3>유산소 운동</h3><p>걷기, 자전거 타기, 수영 등 유산소 운동을 주 150분 이상(주 5일, 하루 30분) 실시하세요. 식후 30분~1시간 후 운동하면 혈당 조절에 효과적입니다.</p>',
      '<h3>근력 운동</h3><p>주 2~3회 근력 운동을 병행하면 인슐린 감수성을 높이는 데 도움이 됩니다. 가벼운 아령이나 밴드 운동부터 시작하세요.</p>',
      '<h3>운동 시 주의사항</h3><p>운동 전후 혈당을 확인하세요. 혈당이 70mg/dL 미만이면 간식을 먼저 섭취하고, 300mg/dL 이상이면 운동을 미루세요.</p>',
      '<h2>약물 복용 안내</h2>',
      '<h3>복용 원칙</h3><p>처방받은 약은 정해진 시간에 정확한 용량으로 복용하세요. 임의로 복용량을 변경하거나 중단하지 마세요.</p>',
      '<h3>인슐린 관리</h3><p>인슐린은 냉장 보관(2~8°C)하고, 사용 중인 것은 실온(30°C 이하)에서 28일 이내 사용하세요. 주사 부위를 매번 바꿔주세요.</p>',
      '<h3>부작용 관찰</h3><p>저혈당(어지러움, 떨림, 식은땀), 소화 장애 등 이상 증상이 있으면 즉시 주치의에게 상담하세요.</p>',
      '<h2>저혈당 · 고혈당 대처</h2>',
      '<h3>저혈당 증상 (70mg/dL 미만)</h3><p>어지러움, 식은땀, 손 떨림, 심장 두근거림, 공복감, 두통이 나타날 수 있습니다.</p>',
      '<h3>저혈당 대처법 (15-15 규칙)</h3><p>포도당 정제 3~4개 또는 주스/사탕 등 당분 15g을 섭취 → 15분 후 혈당 재측정 → 여전히 70mg/dL 미만이면 한 번 더 섭취. 의식이 없으면 119에 즉시 신고하세요.</p>',
      '<h3>고혈당 증상 (250mg/dL 이상)</h3><p>잦은 소변, 극심한 갈증, 피로감, 시야 흐림이 나타날 수 있습니다. 충분한 수분을 섭취하고 격렬한 운동은 피하세요. 300mg/dL 이상이 지속되면 즉시 의료기관을 방문하세요.</p>',
      '<h2>합병증 예방</h2>',
      '<h3>눈 관리</h3><p>당뇨 망막병증 예방을 위해 연 1회 안저 검사를 받으세요. 시력 변화가 느껴지면 바로 안과를 방문하세요.</p>',
      '<h3>발 관리</h3><p>매일 발을 확인하고, 상처나 감각 이상이 있는지 살피세요. 발톱은 일자로 깎고, 맨발 보행을 피하세요.</p>',
      '<h3>신장 관리</h3><p>최소 연 1회 소변 알부민 검사와 혈액 크레아티닌 검사를 받으세요. 충분한 수분을 섭취하고 과도한 단백질 섭취를 피하세요.</p>',
      '<h3>심혈관 관리</h3><p>혈압(130/80mmHg 미만), 콜레스테롤(LDL 100mg/dL 미만) 관리가 중요합니다. 금연은 합병증 예방에 가장 효과적입니다.</p>',
      '<h2>정기 검진 안내</h2>',
      '<h3>HbA1c 검사</h3><p>3개월마다 당화혈색소(HbA1c) 검사를 받으세요. 일반적 목표는 7.0% 미만이며, 개인 상태에 따라 달라질 수 있습니다.</p>',
      '<h3>정기 검사 항목</h3><p>혈압, 혈중 지질(콜레스테롤), 신장 기능, 간 기능 검사를 최소 6개월~1년 간격으로 받으세요.</p>',
      '<h3>전문의 상담</h3><p>내분비내과 정기 방문 외에도 안과(연 1회), 치과(6개월), 신경과(필요 시) 검진을 받으세요.</p>',
    ].join('\n'),
  },
  {
    key: 'pharmacist',
    label: '약국용 가이드라인',
    title: '약국 케어 가이드라인',
    summary: '당뇨 환자 케어 실무 참고 자료입니다.',
    staticHtml: [
      '<h2>초기 환자 평가</h2>',
      '<h3>등록 시 확인 사항</h3><p>당뇨 유형(제1형/제2형/임신성/전단계), 진단 시기, 현재 처방약, HbA1c 최근 수치, 합병증 유무를 확인합니다. 환자 프로필에 기록하면 이후 케어에 활용됩니다.</p>',
      '<h3>혈당 측정 습관 파악</h3><p>자가혈당측정(SMBG) 빈도, 측정 시점(공복/식후/취침 전), 사용 기기를 파악합니다. 측정이 불규칙한 환자에게는 최소 공복 + 식후 2시간 측정을 권장하세요.</p>',
      '<h3>목표 수치 설정</h3><p>일반적 목표: 공복 80~130mg/dL, 식후 2시간 &lt;180mg/dL, HbA1c &lt;7.0%. 고령자·합병증 동반 시 완화 목표(HbA1c &lt;8.0%)를 적용할 수 있습니다.</p>',
      '<h2>환자 참여 유도</h2>',
      '<h3>첫 방문 안내</h3><p>앱 사용법(혈당 입력, 데이터 조회)을 간단히 안내합니다. 처음에는 하루 1~2회 혈당 기록만으로도 충분하다는 점을 강조하여 부담을 줄이세요.</p>',
      '<h3>정기 접점 유지</h3><p>2주 또는 월 1회 간격으로 혈당 추이를 함께 확인하는 시간을 가지세요. 예약 기능을 활용하면 체계적으로 관리할 수 있습니다.</p>',
      '<h3>동기 부여</h3><p>Time in Range(TIR) 개선, 평균 혈당 감소 등 긍정적 변화를 구체적 수치로 보여주세요. 작은 개선도 함께 인정하면 지속적 참여에 도움이 됩니다.</p>',
      '<h2>혈당 데이터 모니터링</h2>',
      '<h3>TIR (Time in Range) 확인</h3><p>70~180mg/dL 범위 내 시간 비율이 70% 이상을 목표로 합니다. TIR이 낮으면 고혈당 또는 저혈당 빈도를 우선 확인하세요.</p>',
      '<h3>CV (변동계수) 확인</h3><p>CV 36% 이하면 안정적, 36% 초과면 혈당 변동이 큰 상태입니다. 변동이 크면 식사 패턴·운동·약물 복용 시간을 점검합니다.</p>',
      '<h3>패턴 분석</h3><p>공복 고혈당 반복 → 야간 인슐린 또는 경구약 조정 필요 가능성. 식후 고혈당 반복 → 탄수화물 양·식사 속도·약물 타이밍 점검. 저혈당 반복 → 약물 과량·식사 부족·운동 과다 확인.</p>',
      '<h3>위험 수준 판단</h3><p>고위험: TIR &lt;50% 또는 CV &gt;45% 또는 저혈당 주 3회 이상. 주의: TIR 50~70% 또는 CV 36~45%. 양호: TIR &ge;70% 및 CV &le;36%.</p>',
      '<h2>코칭 실무</h2>',
      '<h3>코칭 세션 준비</h3><p>세션 전 환자의 최근 7~14일 혈당 데이터, TIR, CV를 미리 확인합니다. 이전 코칭 기록을 참고하여 지난번 권고사항의 이행 여부를 확인합니다.</p>',
      '<h3>코칭 내용 구성</h3><p>1) 데이터 기반 현황 공유 → 2) 문제점 1~2가지 선정 → 3) 구체적 실천 방안 제시 → 4) 다음 목표 합의. 한 번에 너무 많은 변화를 요구하지 말고, 1~2가지에 집중하세요.</p>',
      '<h3>기록 관리</h3><p>코칭 내용은 반드시 시스템에 기록합니다. 다음 세션에서 연속성 있는 케어를 제공하고, 다른 약사가 담당할 때도 일관된 관리가 가능합니다.</p>',
      '<h2>응급 상황 대응</h2>',
      '<h3>반복적 저혈당</h3><p>주 2회 이상 저혈당(&lt;70mg/dL) 발생 시 즉시 처방의에게 보고를 권합니다. 인슐린/설폰요소제 용량 조정이 필요할 수 있습니다.</p>',
      '<h3>지속적 고혈당</h3><p>공복 혈당이 3일 연속 250mg/dL 이상이면 의료기관 방문을 강하게 권합니다. 케톤산증(DKA) 위험이 있으므로 구역·구토·복통·과호흡 증상을 확인합니다.</p>',
      '<h3>약물 부작용 의심</h3><p>새 약물 시작 후 저혈당·소화장애·부종·체중 급변이 있으면 처방의 상담을 안내합니다.</p>',
      '<h2>약물 복약 지도</h2>',
      '<h3>복약 순응도 확인</h3><p>정기 방문 시 남은 약 수량, 복용 시간, 누락 빈도를 확인합니다. 혈당 패턴과 복약 이행을 연결하여 설명하면 환자의 이해도가 높아집니다.</p>',
      '<h3>주요 당뇨약 복용 지도</h3><p>메트포르민: 식사 중·후 복용(위장장애 감소). 설폰요소제: 식전 30분(저혈당 주의). DPP-4 억제제: 식사 무관. SGLT-2 억제제: 아침 복용 권장(야간 이뇨 방지). GLP-1 RA: 주 1회 제제 요일 고정.</p>',
      '<h3>인슐린 사용자 관리</h3><p>주사 부위 로테이션, 보관 온도(냉장 2~8°C, 개봉 후 실온 28일), 주사 기법(피부를 살짝 잡고 90도 주사)을 확인합니다.</p>',
      '<h2>의뢰 기준 및 협력</h2>',
      '<h3>의료기관 의뢰 기준</h3><p>HbA1c 9.0% 이상 지속, 저혈당 반복(주 3회 이상), 새로운 합병증 증상(시력 변화, 발 궤양, 단백뇨), 약물 부작용이 의심될 때는 의료기관 방문을 적극 권합니다.</p>',
      '<h3>다직종 협력</h3><p>영양사 연계(식이 상담 필요 시), 안과(연 1회 안저검사), 족부 관리(발 관리 교육). 약국에서 제공하는 케어와 전문의 진료가 상호 보완되도록 합니다.</p>',
      '<h3>정보 공유</h3><p>환자 동의 하에 혈당 추이·코칭 기록을 담당 의사에게 공유할 수 있습니다. 체계적 데이터는 처방 조정에 유용한 근거가 됩니다.</p>',
    ].join('\n'),
  },
];

/* ── 상태 뱃지 ── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    published: { bg: 'bg-green-100', text: 'text-green-700', label: '발행됨' },
    draft: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '초안' },
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '검토중' },
    archived: { bg: 'bg-slate-100', text: 'text-slate-500', label: '보관됨' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

/* ── 메인 컴포넌트 ── */

export default function GuidelineManagementPage() {
  const [guidelines, setGuidelines] = useState<(CmsContent & { target: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 편집 모달
  const [editTarget, setEditTarget] = useState<CmsContentDetail | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const loadGuidelines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cmsApi.getContents({
        serviceKey: 'glycopharm',
        type: 'guide',
        limit: 10,
      });
      const items = res.data
        .filter((c: any) => c.metadata?.guidelineTarget)
        .map((c: any) => ({ ...c, target: c.metadata.guidelineTarget }));
      setGuidelines(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load guidelines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGuidelines(); }, [loadGuidelines]);

  /* ── 초기 콘텐츠 생성 ── */

  const handleInitialize = async (target: GuidelineTarget) => {
    try {
      setInitializing(true);
      await cmsApi.createContent({
        serviceKey: 'glycopharm',
        type: 'guide',
        title: target.title,
        summary: target.summary,
        body: target.staticHtml,
        metadata: { guidelineTarget: target.key },
        visibilityScope: 'service',
      });
      await loadGuidelines();
    } catch (err: any) {
      setError(err.message || 'Failed to create guideline');
    } finally {
      setInitializing(false);
    }
  };

  const handleInitializeAll = async () => {
    for (const t of TARGETS) {
      const exists = guidelines.some((g) => g.target === t.key);
      if (!exists) await handleInitialize(t);
    }
  };

  /* ── 편집 ── */

  const openEdit = async (item: CmsContent) => {
    try {
      const res = await cmsApi.getContentById(item.id);
      const detail = res.data;
      setEditTarget(detail);
      setEditTitle(detail.title);
      setEditSummary(detail.summary || '');
      setEditBody(detail.body || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load content');
    }
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditTitle('');
    setEditSummary('');
    setEditBody('');
  };

  const handleSave = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      await cmsApi.updateContent(editTarget.id, {
        title: editTitle,
        summary: editSummary || undefined,
        body: editBody,
      });
      closeEdit();
      await loadGuidelines();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      // 먼저 저장
      await cmsApi.updateContent(editTarget.id, {
        title: editTitle,
        summary: editSummary || undefined,
        body: editBody,
      });
      // draft → pending → published (CMS 상태 머신)
      const currentStatus = editTarget.status;
      if (currentStatus === 'draft') {
        await cmsApi.updateContentStatus(editTarget.id, 'pending');
        await cmsApi.updateContentStatus(editTarget.id, 'published');
      } else if (currentStatus === 'pending') {
        await cmsApi.updateContentStatus(editTarget.id, 'published');
      }
      closeEdit();
      await loadGuidelines();
    } catch (err: any) {
      setError(err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  /* ── 상태 토글 ── */

  const handleToggleStatus = async (item: CmsContent) => {
    try {
      if (item.status === 'published') {
        await cmsApi.updateContentStatus(item.id, 'archived');
      } else if (item.status === 'draft') {
        await cmsApi.updateContentStatus(item.id, 'pending');
        await cmsApi.updateContentStatus(item.id, 'published');
      } else if (item.status === 'pending') {
        await cmsApi.updateContentStatus(item.id, 'published');
      }
      await loadGuidelines();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  /* ── 렌더링 ── */

  const missingTargets = TARGETS.filter(
    (t) => !guidelines.some((g) => g.target === t.key),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">가이드라인 관리</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6 ml-[52px]">
        당뇨인용 / 약국용 가이드라인을 편집하고 발행합니다.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">닫기</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* 초기화 안내 */}
          {missingTargets.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 mb-3">
                아직 CMS에 등록되지 않은 가이드라인이 있습니다.
                초기 콘텐츠를 생성하면 기존 정적 콘텐츠가 CMS에 등록됩니다.
              </p>
              <button
                onClick={handleInitializeAll}
                disabled={initializing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {initializing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                초기 콘텐츠 생성 ({missingTargets.length}개)
              </button>
            </div>
          )}

          {/* 가이드라인 카드 리스트 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {TARGETS.map((target) => {
              const item = guidelines.find((g) => g.target === target.key);
              if (!item) return null;
              return (
                <div
                  key={target.key}
                  className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">
                        {target.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{item.title}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.updatedAt && (
                    <p className="text-xs text-slate-400 mb-4">
                      수정: {new Date(item.updatedAt).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      편집
                    </button>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {item.status === 'published' ? (
                        <><EyeOff className="w-3.5 h-3.5" />보관</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5" />발행</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 편집 모달 ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {TARGETS.find((t) => t.key === (editTarget.metadata as any)?.guidelineTarget)?.label || '가이드라인'} 편집
              </h2>
              <button
                onClick={closeEdit}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">본문</label>
                <RichTextEditor
                  value={editBody}
                  onChange={(content) => setEditBody(content.html)}
                  placeholder="가이드라인 내용을 입력하세요..."
                  minHeight="500px"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장 (초안)'}
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '처리 중...' : '저장 & 발행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
