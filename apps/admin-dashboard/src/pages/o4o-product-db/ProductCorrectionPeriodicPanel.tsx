import { useEffect, useRef, useState } from 'react';
import type {
  ProductCorrectionMatch,
  ProductCorrectionRule,
  ProductCorrectionSchedule,
  ProductDescriptionRenewal,
} from '@o4o/types';
import { productCorrectionApi as workspace } from '@/api/product-correction.api';
import {
  productCorrectionPeriodicApi as api,
  type RenewalDetail,
  type PeriodicDashboard,
  type Page,
} from '@/api/product-correction-periodic.api';
const button = 'rounded border px-3 py-2 disabled:opacity-40';
const input = 'w-full rounded border p-2';
const changeNames: Record<string, string> = {
  name: '상품명',
  brandName: '브랜드명',
  specification: '규격',
  originCountry: '원산지',
  tags: '태그',
  descriptionContent: '설명서 본문',
  descriptionSummary: '설명서 요약',
  categoryId: '분류 참조',
  brandId: '브랜드 참조',
  drugCategory: '의약품 분류',
};
const purposeNames = {
  professional: '전문인용',
  'ai-support': 'AI 판단지원용',
  'consumer-qr': '소비자 QR용',
};
const originName = (origin?: string) =>
  origin === 'catalog-edit'
    ? '일반 상품 편집'
    : origin === 'admin-description'
      ? '관리자 설명서 저장'
      : '상품 보정 반영';
const changeValue = (value: unknown) =>
  value === null || value === undefined
    ? '(없음)'
    : Array.isArray(value)
      ? value.join(', ')
      : String(value);
const statusNames: Record<string, string> = {
  queued: '대기',
  running: '점검 중',
  paused: '일시 중지',
  retry_wait: '자동 재시도 대기',
  failed: '실패·수동 처리 필요',
  completed: '후보 점검 완료',
  cancelled: '취소',
  pending: '갱신 검토 대기',
  in_progress: '갱신 검토 중',
  done: '검토 종료 (게시 아님)',
  excluded: '대상 제외',
};
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '없음';
const kstInput = (iso: string) =>
  new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 16);
function Pager({
  data,
  busy,
  load,
}: {
  data: { page: number; total: number; pageSize: number };
  busy: boolean;
  load: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <span>
        {data.total}건 · {data.page}페이지
      </span>
      <button type="button" disabled={busy || data.page <= 1} onClick={() => load(data.page - 1)}>
        이전
      </button>
      <button
        type="button"
        disabled={busy || data.page * data.pageSize >= data.total}
        onClick={() => load(data.page + 1)}
      >
        다음
      </button>
    </div>
  );
}
export default function ProductCorrectionPeriodicPanel({ canWrite }: { canWrite: boolean }) {
  const [renewalVersions, setRenewalVersions] = useState<ProductDescriptionRenewal[]>([]);
  const [controls, setControls] = useState<Awaited<ReturnType<typeof api.bulkControls>>>([]);
  const [opened, setOpened] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [rules, setRules] = useState<ProductCorrectionRule[]>([]),
    [ruleId, setRuleId] = useState(''),
    [search, setSearch] = useState('');
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PeriodicDashboard | null>(null);
  const [renewals, setRenewals] = useState<Page<ProductDescriptionRenewal> | null>(null),
    [renewalState, setRenewalState] = useState<'open' | 'all'>('open');
  const [renewal, setRenewal] = useState<RenewalDetail | null>(null),
    [renewalNotes, setRenewalNotes] = useState('');
  const [renewalStatus, setRenewalStatus] = useState<ProductDescriptionRenewal['state']>('pending'),
    [purposes, setPurposes] = useState<Array<ProductCorrectionRule['purpose']>>([]);
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof api.bulk>> | null>(null),
    [pages, setPages] = useState<Awaited<ReturnType<typeof api.bulkPages>> | null>(null);
  const [selected, setSelected] = useState<ProductCorrectionMatch[]>([]),
    [batchLink, setBatchLink] = useState('');
  const [schedules, setSchedules] = useState<Awaited<ReturnType<typeof api.schedules>> | null>(
      null,
    ),
    [schedule, setSchedule] = useState<ProductCorrectionSchedule | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false),
    [intervalDays, setIntervalDays] = useState(30),
    [nextDue, setNextDue] = useState('');
  const [notices, setNotices] = useState<Awaited<ReturnType<typeof api.notices>> | null>(null);
  const active = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : '요청 실패');
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };
  const refresh = async () => {
    const [d, r, j, s, n, definitions] = await Promise.all([
      api.dashboard(),
      api.renewals(renewalState, renewals?.page ?? 1),
      api.bulk(jobs?.page ?? 1),
      api.schedules(schedules?.page ?? 1),
      api.notices(notices?.page ?? 1),
      workspace.rules(),
    ]);
    if (!active.current) return;
    setRefreshedAt(new Date().toISOString());
    setDashboard(d);
    setRenewals(r);
    setJobs(j);
    setSchedules(s);
    setNotices(n);
    setRules(definitions);
    setOpened(true);
  };
  // A committed mutation must never be reported as failed because the subsequent read failed.
  const afterSaved = async (message: string, followUp?: () => Promise<void>) => {
    if (active.current) setNotice(message);
    try {
      if (followUp) await followUp();
      await refresh();
    } catch {
      if (active.current)
        setError(
          '작업은 저장됐지만 최신 현황을 불러오지 못했습니다. 같은 작업을 다시 만들지 말고 현황을 새로고침하세요.',
        );
    }
  };
  const openJob = async (id: string, page = 1) => {
    const result = await api.bulkPages(id, page);
    if (active.current) {
      setControls([]);
      setPages(result);
      setSelected([]);
      setBatchLink('');
    }
  };
  const openRenewal = async (id: string) => {
    const result = await api.renewal(id);
    if (active.current) {
      setRenewalVersions([]);
      setRenewal(result);
      setRenewalNotes(result.record.notes);
      setRenewalStatus(result.record.state);
      setPurposes(result.record.purposes);
    }
  };
  const chooseRule = async (id: string) => {
    setRuleId(id);
    setSchedule(null);
    setScheduleEnabled(false);
    setNextDue('');
    if (!id) return;
    const value = await api.schedule(id);
    if (active.current) {
      setSchedule(value);
      setScheduleEnabled(value?.enabled ?? false);
      setIntervalDays(value?.intervalDays ?? rules.find((r) => r.id === id)?.cadenceDays ?? 30);
      setNextDue(kstInput(value?.nextDueAt ?? new Date(Date.now() + 86400000).toISOString()));
    }
  };
  const job = pages?.job;
  return (
    <section className="space-y-4 rounded border p-4" aria-label="상품 정기 관리 확장">
      <h4 className="font-semibold">설명서 갱신 · 대량 점검 · 예약·알림</h4>
      <p className="text-sm">
        후보 점검과 갱신 검토 작업입니다. 상품·설명서 자동 수정, AI 호출, QR 자동 변경은 없습니다.
      </p>
      <button type="button" className={button} disabled={busy} onClick={() => void run(refresh)}>
        정기 관리 현황 불러오기·새로고침
      </button>
      {error && <p role="alert">{error} 입력 중인 검토 내용은 유지됩니다.</p>}
      {notice && <p role="status">{notice}</p>}
      {opened && (
        <>
          {refreshedAt && (
            <p className="text-sm">
              표시 현황의 최근 성공 조회: {date(refreshedAt)}. 조회 실패 시 이전 표시를 유지합니다.
            </p>
          )}
          {dashboard && (
            <div className="space-y-2 rounded border p-3" aria-label="통합 관리 현황">
              <p>
                설명서 갱신 대기 {dashboard.renewalOpen} · 근거 대기 작업기록{' '}
                {dashboard.evidenceWaiting} · 변경안 검토 대기 {dashboard.proposalPending} · 검토 후
                미반영 {dashboard.proposalUnapplied} · 반영 오류 이력 {dashboard.proposalFailed}
              </p>
              <p>
                대량 점검 진행 {dashboard.bulkOpen} · 중지 {dashboard.bulkPaused} · 실패{' '}
                {dashboard.bulkFailed} · 예약 도래·지연 {dashboard.scheduleDue} · 미확인 알림{' '}
                {dashboard.noticeUnread}
              </p>
              <p>
                마지막 서버 점검: {date(dashboard.lastTickAt)} (한국시간). 서버 실행 중 약 1분
                간격으로 처리합니다. 서버가 쉬는 동안 정시 실행을 보장하지 않으며 부팅 후 지연
                회차를 확인합니다.
              </p>
            </div>
          )}
          <section className="space-y-3 rounded border p-3" aria-label="설명서 갱신 작업">
            <h5 className="font-semibold">설명서 갱신 검토</h5>
            <p className="text-sm">
              상품 반영 후 관련 유형·언어의 설명서를 확인합니다. 이용 목적은 기존 작업의
              제안값이므로 실제 용도에 맞게 선택하세요. 검토 종료는 게시·반영 완료를 뜻하지
              않습니다.
            </p>
            <select
              aria-label="갱신 작업 조건"
              className={input}
              disabled={busy}
              value={renewalState}
              onChange={(e) => {
                const state = e.target.value as 'open' | 'all';
                setRenewalState(state);
                void run(async () => {
                  const result = await api.renewals(state);
                  if (active.current) setRenewals(result);
                });
              }}
            >
              <option value="open">미종료 갱신 작업</option>
              <option value="all">전체 갱신 작업</option>
            </select>
            {renewals?.items.map((item) => (
              <div key={item.id} className="break-words rounded border p-2">
                <p>
                  {item.productName} · {originName(item.origin)} · {item.descriptionType}/
                  {item.language} · {statusNames[item.state]}
                </p>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void run(() => openRenewal(item.id))}
                >
                  갱신 검토 열기: {item.productName} {item.descriptionType}/{item.language}
                </button>
              </div>
            ))}
            {renewals && (
              <Pager
                data={renewals}
                busy={busy}
                load={(page) =>
                  void run(async () => {
                    const result = await api.renewals(renewalState, page);
                    if (active.current) setRenewals(result);
                  })
                }
              />
            )}
            {renewal && (
              <div className="space-y-2 rounded border p-3" aria-label="선택 갱신 검토">
                <p>
                  {renewal.record.productName} · {renewal.record.descriptionType}/
                  {renewal.record.language} · v{renewal.record.revision}
                </p>
                <p className="text-sm">
                  관련 상품 변경:{' '}
                  {renewal.record.changedFields?.map((f) => changeNames[f]).join(', ')}
                </p>
                <p className="break-words text-sm">
                  변경 경로: {originName(renewal.record.origin)} · 처리자{' '}
                  {renewal.record.changeActorId ?? '변경 기록 참조'}
                </p>
                {!renewal.record.purposes.length && (
                  <p className="text-sm">
                    이용 목적이 아직 지정되지 않았습니다. 실제 용도를 선택한 뒤 검토 기록을
                    저장하세요.
                  </p>
                )}
                {renewal.record.sourceChanges?.map((change) => (
                  <details key={change.field}>
                    <summary>{changeNames[change.field]} 변경 내역</summary>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
                      변경 전: {changeValue(change.before)}
                      {'\n'}변경 후: {changeValue(change.after)}
                    </pre>
                  </details>
                ))}
                <a
                  className="text-blue-700 underline"
                  href={`/admin/o4o-product-db/masters/${renewal.record.productId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  상품·설명서 편집 화면 열기
                </a>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">
                  {renewal.description?.content ?? '현재 설명서 없음'}
                </pre>
                {!renewal.productExists && (
                  <p>상품이 없어 검토 종료 대신 대상 제외 사유를 기록해야 합니다.</p>
                )}
                <fieldset disabled={!canWrite || busy}>
                  <legend>검토 이용 목적</legend>
                  {(Object.keys(purposeNames) as Array<ProductCorrectionRule['purpose']>).map(
                    (p) => (
                      <label key={p} className="mr-3 inline-block">
                        <input
                          type="checkbox"
                          checked={purposes.includes(p)}
                          onChange={() =>
                            setPurposes(
                              purposes.includes(p)
                                ? purposes.filter((v) => v !== p)
                                : [...purposes, p],
                            )
                          }
                        />
                        {purposeNames[p]}
                      </label>
                    ),
                  )}
                </fieldset>
                <label className="block">
                  갱신 검토 상태
                  <select
                    aria-label="갱신 검토 상태"
                    className={input}
                    disabled={!canWrite || busy}
                    value={renewalStatus}
                    onChange={(e) =>
                      setRenewalStatus(e.target.value as ProductDescriptionRenewal['state'])
                    }
                  >
                    {['pending', 'in_progress', 'done', 'excluded'].map((s) => (
                      <option key={s} value={s}>
                        {statusNames[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  갱신 검토 메모
                  <textarea
                    aria-label="갱신 검토 메모"
                    className={input}
                    disabled={!canWrite || busy}
                    value={renewalNotes}
                    onChange={(e) => setRenewalNotes(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={button}
                  disabled={!canWrite || busy || !purposes.length || !renewalNotes.trim()}
                  onClick={() =>
                    void run(async () => {
                      const saved = await api.saveRenewal(renewal, {
                        state: renewalStatus,
                        notes: renewalNotes,
                        purposes,
                      });
                      if (active.current) {
                        setRenewal({ ...renewal, record: saved });
                      }
                      await afterSaved(
                        '갱신 검토 기록을 저장했습니다. 설명서·QR 원본은 변경하지 않았습니다.',
                      );
                    })
                  }
                >
                  갱신 검토 기록 저장
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const versions = await api.renewalVersions(renewal.record.id);
                      if (active.current) setRenewalVersions(versions);
                    })
                  }
                >
                  갱신 검토 저장 이력
                </button>
                {renewalVersions.map((v) => (
                  <details key={v.revision}>
                    <summary>
                      v{v.revision} · {statusNames[v.state]} · {date(v.updatedAt)}
                    </summary>
                    <p>
                      {v.purposes.map((p) => purposeNames[p]).join(', ')} · {v.notes}
                    </p>
                  </details>
                ))}
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void run(() => openRenewal(renewal.record.id))}
                >
                  최신 갱신 자료 다시 불러오기
                </button>
              </div>
            )}
          </section>
          <section className="space-y-3 rounded border p-3" aria-label="대량 점검과 예약">
            <h5 className="font-semibold">대량 후보 점검·예약</h5>
            <p className="text-sm">
              대상 최대 50,000개, 고정 후보 목록을 25개씩 점검합니다. 추가 상품은 다음 실행에
              포함합니다. 결과는 사람의 검토 완료가 아닙니다.
            </p>
            <label className="block">
              점검 기준
              <select
                aria-label="정기 관리 기준"
                className={input}
                disabled={busy}
                value={ruleId}
                onChange={(e) => void run(() => chooseRule(e.target.value))}
              >
                <option value="">기준 선택</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} · v{r.revision}
                    {r.enabled ? '' : ' (중지)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              대량 점검 검색
              <input
                aria-label="대량 점검 검색"
                className={input}
                disabled={busy}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={button}
              disabled={!canWrite || busy || !rules.find((r) => r.id === ruleId)?.enabled}
              onClick={() =>
                void run(async () => {
                  const result = await api.createBulk(rules.find((r) => r.id === ruleId)!, search);
                  if (active.current) {
                    setPages({ job: result, run: null, totalPages: 0, page: 1 });
                    setSelected([]);
                    setBatchLink('');
                    setJobs((previous) => ({
                      items: [
                        result,
                        ...(previous?.page === 1 ? previous.items : []).filter(
                          (j) => j.id !== result.id,
                        ),
                      ],
                      total: (previous?.total ?? 0) + 1,
                      page: 1,
                      pageSize: 10,
                    }));
                  }
                  await afterSaved(
                    '고정 후보 목록을 저장했습니다. 서버 worker 또는 다음 25개 점검으로 처리합니다.',
                    () => openJob(result.id),
                  );
                })
              }
            >
              대량 후보 점검 만들기
            </button>
            {ruleId && (
              <fieldset className="space-y-2 rounded border p-3" disabled={!canWrite || busy}>
                <legend>기준별 예약 (한국시간)</legend>
                <p className="text-sm">
                  예약 간격은 검토 주기와 별도로 저장합니다. 예약은 검색어 없이 해당 기준 전체를
                  점검합니다. 사용 중지해도 이미 시작한 실행은 별도로 중지·취소해야 합니다.
                </p>
                <label>
                  <input
                    aria-label="예약 사용"
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                  />
                  예약 사용
                </label>
                <label className="block">
                  예약 간격(일)
                  <input
                    aria-label="예약 간격"
                    className={input}
                    type="number"
                    min={1}
                    max={365}
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  최초·다음 예정 (한국시간)
                  <input
                    aria-label="예약 예정 한국시간"
                    className={input}
                    type="datetime-local"
                    value={nextDue}
                    onChange={(e) => setNextDue(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={button}
                  disabled={!nextDue}
                  onClick={() =>
                    void run(async () => {
                      const result = await api.saveSchedule(ruleId, {
                        revision: schedule?.revision ?? 0,
                        enabled: scheduleEnabled,
                        intervalDays,
                        timeZone: 'Asia/Seoul',
                        nextDueAt: new Date(`${nextDue}:00+09:00`).toISOString(),
                      });
                      if (active.current) setSchedule(result);
                      await afterSaved('예약을 저장했습니다. 상품 자동 수정은 수행하지 않습니다.');
                    })
                  }
                >
                  예약 저장
                </button>
              </fieldset>
            )}
            {schedules?.items.map((s) => (
              <p key={s.id} className="break-words">
                예약 {rules.find((r) => r.id === s.ruleId)?.title ?? '조회되지 않는 기준'} ·{' '}
                {s.enabled ? '사용' : '중지'} · 다음 {date(s.nextDueAt)} · 최근 시작{' '}
                {date(s.lastStartedAt)} · 합친 누락 회차 {s.missedOccurrences}
                {s.errorCode
                  ? ` · 시작 오류: ${s.errorCode === 'BULK_SCOPE_TOO_LARGE' ? '범위 50,000개 초과' : s.errorCode === 'RULE_DISABLED' ? '기준 사용 중지' : '시작 실패·재확인 필요'}`
                  : ''}
              </p>
            ))}
            {schedules && (
              <Pager
                data={schedules}
                busy={busy}
                load={(page) =>
                  void run(async () => {
                    const result = await api.schedules(page);
                    if (active.current) setSchedules(result);
                  })
                }
              />
            )}
            {jobs?.items.map((j) => (
              <div key={j.id} className="rounded border p-2">
                <p>
                  {j.ruleSnapshot.title} v{j.ruleSnapshot.revision} · {statusNames[j.status]} ·{' '}
                  {j.cursor}/{j.total} · 후보 유지 {j.matched} · 조건 이탈 {j.skipped}
                </p>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void run(() => openJob(j.id))}
                >
                  실행 결과 열기: {j.ruleSnapshot.title} {date(j.createdAt)}
                </button>
              </div>
            ))}
            {jobs && (
              <Pager
                data={jobs}
                busy={busy}
                load={(page) =>
                  void run(async () => {
                    const result = await api.bulk(page);
                    if (active.current) setJobs(result);
                  })
                }
              />
            )}
            {job && (
              <div className="space-y-2 rounded border p-3" aria-label="선택 대량 점검">
                <p>
                  {job.ruleSnapshot.title} v{job.ruleSnapshot.revision} · {statusNames[job.status]}{' '}
                  · {job.cursor}/{job.total} · 페이지 {pages.page}/{pages.totalPages}
                </p>
                {rules.find((r) => r.id === job.ruleSnapshot.id)?.revision !==
                  job.ruleSnapshot.revision && (
                  <p role="alert">
                    현재 기준 버전과 다릅니다. 기존 결과는 당시 기준이며 최신 기준으로 다시 점검해야
                    선택 작업을 만들 수 있습니다.
                  </p>
                )}
                {job.errorCode && (
                  <p role="alert">
                    처리 실패 · 연속 시도 {job.attempts}/3 ·{' '}
                    {job.status === 'failed'
                      ? '자동 재시도 종료·수동 재개 필요'
                      : `다음 재시도 ${date(job.nextRetryAt)}`}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={button}
                    disabled={!canWrite || busy || !['queued', 'running'].includes(job.status)}
                    onClick={() =>
                      void run(async () => {
                        const result = await api.stepBulk(job.id);
                        if (result && active.current)
                          setPages((previous) =>
                            previous ? { ...previous, job: result } : previous,
                          );
                        await afterSaved(
                          result
                            ? '후보 점검 처리 결과를 저장했습니다.'
                            : '다른 처리 요청이 진행 중이거나 점검할 항목이 없습니다. 실행 상태를 확인하세요.',
                          () => openJob(job.id, pages.page),
                        );
                      })
                    }
                  >
                    다음 25개 점검
                  </button>
                  {(['pause', 'resume', 'cancel'] as const).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={button}
                      disabled={
                        !canWrite || busy || ['completed', 'cancelled'].includes(job.status)
                      }
                      onClick={() =>
                        void run(async () => {
                          const result = await api.controlBulk(job, action);
                          if (active.current)
                            setPages((previous) =>
                              previous ? { ...previous, job: result } : previous,
                            );
                          await afterSaved('실행 제어를 저장했습니다.', () =>
                            openJob(job.id, pages.page),
                          );
                        })
                      }
                    >
                      {action === 'pause'
                        ? '실행 일시 중지'
                        : action === 'resume'
                          ? '실행 재개·재시도'
                          : '남은 점검 취소'}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => void run(() => openJob(job.id, pages.page))}
                  >
                    실행 상태 새로고침
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const history = await api.bulkControls(job.id);
                        if (active.current) setControls(history);
                      })
                    }
                  >
                    실행 제어 이력
                  </button>
                </div>
                <p className="text-sm">
                  중지·취소해도 저장된 결과는 유지됩니다. 상태 충돌 시 실행 상태를 새로고침하세요.
                </p>
                {controls.map((c, index) => (
                  <p key={index} className="text-sm">
                    {date(c.at)} ·{' '}
                    {c.action === 'pause' ? '중지' : c.action === 'resume' ? '재개' : '취소'} ·{' '}
                    {c.cursor}개 처리 시점 · 처리자 {c.actor ?? '기록 없음'}
                  </p>
                ))}
                {pages.run?.result?.items.map((product) => (
                  <label key={product.id} className="block break-words rounded border p-2">
                    <input
                      type="checkbox"
                      disabled={!canWrite || busy}
                      checked={selected.some((p) => p.id === product.id)}
                      onChange={() =>
                        setSelected(
                          selected.some((p) => p.id === product.id)
                            ? selected.filter((p) => p.id !== product.id)
                            : [...selected, product],
                        )
                      }
                    />
                    {product.name} · {product.reason}
                  </label>
                ))}
                <button
                  type="button"
                  className={button}
                  disabled={!canWrite || busy || !selected.length}
                  onClick={() =>
                    void run(async () => {
                      const batch = await workspace.createBatch(
                        job.ruleSnapshot,
                        { search: job.search, page: 1 },
                        `${job.ruleSnapshot.title} 대량 점검 선택`,
                        selected,
                      );
                      if (active.current) {
                        setBatchLink(`/admin/o4o-product-db/maintenance?batch=${batch.id}`);
                        setSelected([]);
                        setNotice(
                          `선택 작업 연결: 새 작업 ${batch.selectionResult?.createdCount ?? batch.items.length}개. 기존 작업 재사용 여부를 확인하세요.`,
                        );
                      }
                    })
                  }
                >
                  이 결과에서 선택 상품 작업 만들기
                </button>
                {batchLink && (
                  <a className="block text-blue-700 underline" href={batchLink}>
                    선택 상품 작업 열기
                  </a>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy || pages.page <= 1}
                    onClick={() => void run(() => openJob(job.id, pages.page - 1))}
                  >
                    이전 결과
                  </button>
                  <button
                    type="button"
                    disabled={busy || pages.page >= pages.totalPages}
                    onClick={() => void run(() => openJob(job.id, pages.page + 1))}
                  >
                    다음 결과
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="space-y-2 rounded border p-3" aria-label="상품 관리 알림">
            <h5 className="font-semibold">관리자 화면 알림</h5>
            <p className="text-sm">
              알림 확인은 작업 완료가 아닙니다. 이메일·외부 메시지는 발송하지 않습니다.
            </p>
            {notices?.items.map((n) => (
              <div key={n.id} className="break-words rounded border p-2">
                <p>
                  {n.title} · {date(n.createdAt)} · {n.acknowledgedAt ? '확인함' : '미확인'}
                </p>
                <button
                  type="button"
                  className={button}
                  disabled={!canWrite || busy || !!n.acknowledgedAt}
                  onClick={() =>
                    void run(async () => {
                      const saved = await api.acknowledge(n.id);
                      if (active.current)
                        setNotices((previous) =>
                          previous
                            ? {
                                ...previous,
                                items: previous.items.map((item) =>
                                  item.id === saved.id ? saved : item,
                                ),
                              }
                            : previous,
                        );
                      await afterSaved('알림 확인을 저장했습니다. 실제 작업 완료와는 별개입니다.');
                    })
                  }
                >
                  알림 확인
                </button>
              </div>
            ))}
            {notices && (
              <Pager
                data={notices}
                busy={busy}
                load={(page) =>
                  void run(async () => {
                    const result = await api.notices(page);
                    if (active.current) setNotices(result);
                  })
                }
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}
