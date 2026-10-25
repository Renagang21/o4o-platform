import { productRuleTemplates, createProductRuleDraft } from './product-rule-templates';
import ProductCorrectionProductPanel from './ProductCorrectionProductPanel';
import ProductCorrectionPeriodicPanel from './ProductCorrectionPeriodicPanel';
import ProductCorrectionProposalQueue from './ProductCorrectionProposalQueue';
import ProductCorrectionProposalEditor from './ProductCorrectionProposalEditor';
import { useEffect, useRef, useState } from 'react';
import type {
  ProductCorrectionBatch,
  ProductCorrectionBatchSummary,
  ProductCorrectionCheck,
  ProductCorrectionMatch,
  ProductCorrectionPreview,
  ProductCorrectionRule,
  ProductCorrectionRuleInput,
  ProductCorrectionTask,
  ProductCorrectionTaskState,
  ProductCorrectionTaskVersion,
} from '@o4o/types';
import { productCorrectionApi as api } from '@/api/product-correction.api';
import ProductCorrectionOperations, { ProductCorrectionRuns } from './ProductCorrectionOperations';
import { useProductDbWriteAccess } from './useProductDbWriteAccess';

const inputClass = 'w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100';
const buttonClass = 'rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-40';
const secondary = 'rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40';
const labels: Record<ProductCorrectionCheck['kind'], string> = {
  missing_field: '기본 정보 누락',
  missing_description: '설명서 없음',
  stale_description: '설명서 재확인 주기',
  text: '본문 확인 문구',
  copied_b2b: 'STORE·B2B 동일 본문',
  manual: '범위 내 상품 수동 검토',
};
const states: Record<ProductCorrectionTaskState, string> = {
  pending: '대기',
  in_progress: '작업 중',
  needs_source: '근거 확인 필요',
  review_ready: '검토 대기 (미적용)',
  deferred: '보류',
  no_change: '수정 불필요 (검토 완료)',
  reviewed: '변경안 검토 완료 (미적용)',
  excluded: '대상 제외 (검토 완료)',
};
const purposes = {
  professional: '전문인용',
  'ai-support': 'AI 판단·상담지원용',
  'consumer-qr': '소비자 QR용',
};
const emptyRule: ProductCorrectionRuleInput = {
  title: '',
  instructions: '',
  purpose: 'ai-support',
  regulatoryTypes: [],
  descriptionType: 'STORE',
  language: 'ko',
  cadenceDays: 30,
  enabled: true,
  check: { kind: 'manual' },
};
const groups = {
  GENERAL: '일반상품',
  DRUG: '의약품',
  HEALTH_FUNCTIONAL: '건강기능식품',
  COSMETIC: '화장품',
  MEDICAL_DEVICE: '의료기기',
  QUASI_DRUG: '의약외품',
};
const message = (error: unknown) => (error instanceof Error ? error.message : '요청에 실패했습니다.');

export default function ProductCorrectionWorkspace() {
  const canWrite = useProductDbWriteAccess();
  const [rules, setRules] = useState<ProductCorrectionRule[]>([]);
  const [ruleId, setRuleId] = useState('');
  const rule = rules.find((r) => r.id === ruleId);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<ProductCorrectionPreview | null>(null);
  const [selected, setSelected] = useState<Record<string, ProductCorrectionMatch>>({});
  const [batchTitle, setBatchTitle] = useState('');
  const [batch, setBatch] = useState<ProductCorrectionBatch | null>(null);
  const [batches, setBatches] = useState<ProductCorrectionBatchSummary[]>([]);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotal, setBatchTotal] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [focusTaskId, setFocusTaskId] = useState('');
  const [reused, setReused] = useState<Array<{ batchId: string; taskId: string; productName: string }>>([]);
  const readSequence = useRef(0);
  const batchSequence = useRef(0);
  const historySequence = useRef(0);
  const mutationLock = useRef(false);
  const context = useRef('');
  context.current = `${ruleId}:${rule?.revision ?? 0}:${search}`;
  const currentBatch = useRef<string | null>(null);
  currentBatch.current = batch?.id ?? null;

  const loadHistory = async (page: number) => {
    const seq = ++historySequence.current;
    try {
      const result = await api.batches(page);
      if (seq !== historySequence.current) return;
      setBatches(result.items);
      setBatchPage(page);
      setBatchTotal(result.total);
    } catch (e) {
      if (seq === historySequence.current) setError(message(e));
    }
  };
  useEffect(() => {
    let live = true;
    const sequences = [readSequence, batchSequence, historySequence];
    api
      .rules()
      .then((data) => {
        if (live) setRules(data);
      })
      .catch((e) => {
        if (live) setError(message(e));
      })
      .finally(() => {
        if (live) setRulesLoading(false);
      });
    void loadHistory(1);
    return () => {
      live = false;
      for (const sequence of sequences) sequence.current++;
    };
  }, []);
  const resetPreview = () => {
    readSequence.current++;
    setLoading(false);
    setPreview(null);
    setSelected({});
    setReused([]);
    setError('');
  };
  const runPreview = async (page = 1) => {
    if (!rule) return;
    const key = context.current;
    const seq = ++readSequence.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.preview(rule.id, { search, page }, rule.revision);
      if (seq === readSequence.current && key === context.current) setPreview(data);
    } catch (e) {
      if (seq === readSequence.current && key === context.current) setError(message(e));
    } finally {
      if (seq === readSequence.current) {
        setLoading(false);
        setRefresh((v) => v + 1);
      }
    }
  };
  const saveRule = async (definition: ProductCorrectionRuleInput) => {
    if (!canWrite || mutationLock.current) return;
    mutationLock.current = true;
    setWorking(true);
    setError('');
    const key = context.current;
    try {
      const saved = await api.saveRule(definition, rule);
      setRules((previous) => [saved, ...previous.filter((r) => r.id !== saved.id)]);
      if (context.current === key) {
        resetPreview();
        setRuleId(saved.id);
        setNotice(`기준 v${saved.revision} 저장 완료`);
      }
    } catch (e) {
      if (key === context.current) setError(message(e));
    } finally {
      mutationLock.current = false;
      setWorking(false);
    }
  };
  const openBatch = async (id: string, taskId = '') => {
    const seq = ++batchSequence.current;
    setError('');
    try {
      const result = await api.batch(id);
      if (seq === batchSequence.current) {
        setBatch(result);
        setFocusTaskId(taskId);
      }
    } catch (e) {
      if (seq === batchSequence.current) setError(message(e));
    }
  };
  const createBatch = async () => {
    if (!rule || !preview || !canWrite || mutationLock.current) return;
    const key = context.current;
    mutationLock.current = true;
    setWorking(true);
    setError('');
    try {
      const created = await api.createBatch(
        rule,
        { search, page: preview.page },
        batchTitle,
        Object.values(selected),
      );
      if (key === context.current) {
        batchSequence.current++;
        setBatch(created);
        setSelected({});
        const reusedItems = created.selectionResult?.reused ?? [];
        setReused(reusedItems);
        setFocusTaskId(reusedItems[0]?.batchId === created.id ? reusedItems[0].taskId : '');
        setNotice(
          `새 작업 ${created.selectionResult?.createdCount ?? created.items.length}개 · 기존 작업 연결 ${reusedItems.length}개. 상품 원본은 변경되지 않았습니다.`,
        );
      }
      await loadHistory(1);
      setRefresh((v) => v + 1);
    } catch (e) {
      if (key === context.current) setError(message(e));
    } finally {
      mutationLock.current = false;
      setWorking(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('batch');
    const taskId = params.get('task') ?? '';
    if (id && /^[0-9a-f-]{36}$/i.test(id)) void openBatch(id, taskId);
  }, []);
  return (
    <section
      className="space-y-5 rounded-lg border border-blue-200 bg-white p-4"
      aria-label="상품 보정 작업 공간"
    >
      <div>
        <h3 className="text-lg font-semibold">상품 보정 작업 공간</h3>
        <p className="mt-1 text-sm text-gray-600">
          기준 관리 → 대상 점검 → 상품 선택 → 보완안 준비 → 변경안 검토·선택 반영.
          기준과 작업 기록 저장은 원본을 변경하지 않으며, 별도의 선택 반영에서만 상품 원본을 변경합니다.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          점검 주기는 검토 완료 후 다음 점검일 계산에 사용합니다. 수동·대량·예약 점검은 후보를 찾으며
          상품을 자동 수정하지 않습니다.
        </p>
      </div>
      <ProductCorrectionPeriodicPanel canWrite={canWrite} />
      <ProductCorrectionProposalQueue />
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded bg-blue-50 p-3 text-sm">
          {notice}
        </p>
      )}
      <ProductCorrectionProductPanel />
      <ProductCorrectionOperations refresh={refresh} onOpen={(id, taskId) => void openBatch(id, taskId)} />
      <ProductCorrectionRuns canWrite={canWrite} refresh={refresh} onRetry={() => setRefresh((v) => v + 1)} />
      {reused.map((item) => (
        <button
          key={item.taskId}
          className={secondary}
          onClick={() => void openBatch(item.batchId, item.taskId)}
        >
          {item.productName} 기존 작업 열기
        </button>
      ))}
      {rulesLoading ? (
        <p>기준 불러오는 중…</p>
      ) : (
        <>
          <label className="block text-sm">
            보정 기준
            <select
              aria-label="보정 기준"
              className={inputClass}
              value={ruleId}
              onChange={(e) => {
                resetPreview();
                setRuleId(e.target.value);
              }}
            >
              <option value="">새 기준 만들기</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · v{r.revision}
                  {r.enabled ? '' : ' · 중지'}
                </option>
              ))}
            </select>
          </label>
          <RuleEditor
            key={`${ruleId}:${rule?.revision ?? 0}`}
            rule={rule}
            canWrite={canWrite}
            busy={working}
            onSave={saveRule}
          />
        </>
      )}
      {rule && (
        <section className="space-y-3 border-t pt-4" aria-label="대상 점검">
          <h4 className="font-semibold">2. 기준에 맞는 상품 찾기</h4>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-sm">
              상품명·바코드 검색
              <input
                className={inputClass}
                value={search}
                onChange={(e) => {
                  resetPreview();
                  setSearch(e.target.value);
                }}
              />
            </label>
            <button
              className={buttonClass}
              disabled={!canWrite || loading || working || !rule.enabled}
              onClick={() => void runPreview()}
            >
              대상 점검
            </button>
          </div>
          <p className="text-xs text-gray-500">
            정상 상품에서 점검합니다. 검색 결과는 확인할 후보이며 오류 확정이 아닙니다.
          </p>
          {preview && (
            <>
              <p className="text-sm">
                기준 v{preview.ruleRevision} · 대상 {preview.total}개 · {preview.page}페이지 · 선택{' '}
                {Object.keys(selected).length}개 (최대 50개)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>선택</th>
                      <th>상품</th>
                      <th>점검 사유</th>
                      <th>원천</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${p.name} 선택`}
                            checked={Boolean(selected[p.id])}
                            disabled={
                              !canWrite || working || (!selected[p.id] && Object.keys(selected).length >= 50)
                            }
                            onChange={(e) =>
                              setSelected((old) => {
                                const next = { ...old };
                                if (e.target.checked) next[p.id] = p;
                                else delete next[p.id];
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <a
                            className="text-blue-700 underline"
                            href={`/admin/o4o-product-db/masters/${p.id}`}
                          >
                            {p.name}
                          </a>
                          <div className="text-xs text-gray-500">{p.specification || '규격 없음'}</div>
                        </td>
                        <td>{p.reason}</td>
                        <td>{p.sourceType || '출처 정보 없음'}</td>
                      </tr>
                    ))}
                    {!preview.items.length && (
                      <tr>
                        <td colSpan={4} className="p-4">
                          조건에 맞는 상품이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  className={secondary}
                  disabled={!canWrite || loading || preview.page <= 1}
                  onClick={() => void runPreview(preview.page - 1)}
                >
                  이전 대상
                </button>
                <button
                  className={secondary}
                  disabled={!canWrite || loading || preview.page * preview.pageSize >= preview.total}
                  onClick={() => void runPreview(preview.page + 1)}
                >
                  다음 대상
                </button>
              </div>
              <label className="block text-sm">
                작업 묶음 이름
                <input
                  aria-label="작업 묶음 이름"
                  className={inputClass}
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  maxLength={120}
                />
              </label>
              <button
                className={buttonClass}
                disabled={
                  !canWrite || working || loading || !batchTitle.trim() || !Object.keys(selected).length
                }
                onClick={() => void createBatch()}
              >
                선택 상품 작업 만들기
              </button>
            </>
          )}
        </section>
      )}
      <section className="space-y-2 border-t pt-4" aria-label="보정 작업 이력">
        <h4 className="font-semibold">3. 선택 상품 작업·이력</h4>
        {!batches.length && <p className="text-sm text-gray-500">저장된 작업 묶음이 없습니다.</p>}
        {batches.map((b) => (
          <button key={b.id} className={`${secondary} mr-2 text-left`} onClick={() => void openBatch(b.id)}>
            {b.title} · 기준 v{b.ruleRevision} · {b.itemCount}개 ·{' '}
            {new Date(b.createdAt).toLocaleDateString()}
          </button>
        ))}
        <div className="flex gap-2">
          <button
            className={secondary}
            disabled={batchPage <= 1}
            onClick={() => void loadHistory(batchPage - 1)}
          >
            이전 작업
          </button>
          <button
            className={secondary}
            disabled={batchPage * 10 >= batchTotal}
            onClick={() => void loadHistory(batchPage + 1)}
          >
            다음 작업
          </button>
        </div>
      </section>
      {batch && (
        <BatchEditor
          key={`${batch.id}:${focusTaskId}`}
          initialTaskId={focusTaskId}
          batch={batch}
          canWrite={canWrite}
          onSave={async (task, input) => {
            const id = batch.id;
            const seq = batchSequence.current;
            const saved = await api.saveTask(batch, task, input);
            if (currentBatch.current === id && batchSequence.current === seq) {
              setBatch(saved);
              setNotice('작업 기록 저장 완료 — 상품 원본에는 적용되지 않았습니다.');
            }
            await loadHistory(batchPage);
            setRefresh((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}

function RuleEditor({
  rule,
  canWrite,
  busy,
  onSave,
}: {
  rule?: ProductCorrectionRule;
  canWrite: boolean;
  busy: boolean;
  onSave: (value: ProductCorrectionRuleInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProductCorrectionRuleInput>(
    rule
      ? {
          title: rule.title,
          instructions: rule.instructions,
          purpose: rule.purpose,
          regulatoryTypes: rule.regulatoryTypes,
          descriptionType: rule.descriptionType,
          language: rule.language,
          cadenceDays: rule.cadenceDays,
          enabled: rule.enabled,
          check: rule.check,
        }
      : emptyRule,
  );
  const [versions, setVersions] = useState<ProductCorrectionRule[]>([]);
  const [error, setError] = useState('');
  const versionSequence = useRef(0);
  useEffect(
    () => () => {
      versionSequence.current++;
    },
    [],
  );
  const update = <K extends keyof ProductCorrectionRuleInput>(key: K, value: ProductCorrectionRuleInput[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const checkType = (kind: ProductCorrectionCheck['kind']) =>
    update(
      'check',
      kind === 'missing_field'
        ? { kind, field: 'manufacturer_name' }
        : kind === 'stale_description'
          ? { kind, days: 90 }
          : kind === 'text'
            ? { kind, terms: [], match: 'any' }
            : { kind },
    );
  return (
    <section className="space-y-3" aria-label="보정 기준 편집">
      <h4 className="font-semibold">1. 보정 기준 편집</h4>
      {!rule && <fieldset className="space-y-2 rounded border p-3" disabled={!canWrite || busy}>
        <legend>운영 기준 초안</legend>
        <p className="text-sm">버튼을 누르면 작성 중인 기준 입력을 초안으로 바꿉니다. 목적·유형·언어·주기는 유지하며 사용 여부는 꺼집니다. 편집 후 저장해야 등록됩니다.</p>
        <div className="flex flex-wrap gap-2">{productRuleTemplates.map((template) => (
          <button key={template.id} type="button" className={secondary}
            onClick={() => setDraft(createProductRuleDraft(template.id, draft))}>
            {template.title} 초안 사용
          </button>
        ))}</div>
      </fieldset>}
      <label className="block text-sm">
        기준 이름
        <input
          className={inputClass}
          aria-label="기준 이름"
          value={draft.title}
          maxLength={120}
          disabled={!canWrite || busy}
          onChange={(e) => update('title', e.target.value)}
        />
      </label>
      <label className="block text-sm">
        검토·보완 지침
        <textarea
          className={inputClass}
          aria-label="검토·보완 지침"
          rows={5}
          value={draft.instructions}
          maxLength={8000}
          disabled={!canWrite || busy}
          onChange={(e) => update('instructions', e.target.value)}
          placeholder="확인할 근거, 판단 기준, 필요한 보완 내용을 적으세요. 발견 사례에 따라 계속 보완할 수 있습니다."
        />
      </label>
      <label className="block text-sm">
        설명서 이용 목적
        <select
          aria-label="설명서 이용 목적"
          className={inputClass}
          value={draft.purpose}
          disabled={!canWrite || busy}
          onChange={(e) => update('purpose', e.target.value as ProductCorrectionRuleInput['purpose'])}
        >
          {Object.entries(purposes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          대상 설명서
          <select
            aria-label="대상 설명서"
            className={inputClass}
            value={draft.descriptionType}
            disabled={!canWrite || busy}
            onChange={(e) =>
              update('descriptionType', e.target.value as ProductCorrectionRuleInput['descriptionType'])
            }
          >
            {['STORE', 'B2B', 'B2C', 'SUPPLIER_STORE'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          언어
          <select
            aria-label="언어"
            className={inputClass}
            value={draft.language}
            disabled={!canWrite || busy}
            onChange={(e) => update('language', e.target.value)}
          >
            {['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          점검 주기 (일)
          <input
            className={inputClass}
            type="number"
            min={1}
            max={3650}
            value={draft.cadenceDays}
            disabled={!canWrite || busy}
            onChange={(e) => update('cadenceDays', Number(e.target.value))}
          />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm">상품군 (선택하지 않으면 전체)</legend>
        <div className="flex flex-wrap gap-3">
          {Object.entries(groups).map(([value, label]) => (
            <label key={value} className="text-sm">
              <input
                type="checkbox"
                checked={draft.regulatoryTypes.includes(value)}
                disabled={!canWrite || busy}
                onChange={(e) =>
                  update(
                    'regulatoryTypes',
                    e.target.checked
                      ? [...draft.regulatoryTypes, value]
                      : draft.regulatoryTypes.filter((v) => v !== value),
                  )
                }
              />{' '}
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        대상 찾기 방식
        <select
          aria-label="대상 찾기 방식"
          className={inputClass}
          value={draft.check.kind}
          disabled={!canWrite || busy}
          onChange={(e) => checkType(e.target.value as ProductCorrectionCheck['kind'])}
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {draft.check.kind === 'missing_field' && (
        <label className="block text-sm">
          확인할 기본 정보
          <select
            aria-label="확인할 기본 정보"
            className={inputClass}
            value={draft.check.field}
            disabled={!canWrite || busy}
            onChange={(e) =>
              update('check', {
                kind: 'missing_field',
                field: e.target.value as 'manufacturer_name' | 'specification' | 'barcode',
              })
            }
          >
            <option value="manufacturer_name">제조사</option>
            <option value="specification">규격</option>
            <option value="barcode">바코드</option>
          </select>
        </label>
      )}
      {draft.check.kind === 'stale_description' && (
        <label className="block text-sm">
          설명서 변경 후 경과일
          <input
            className={inputClass}
            type="number"
            min={1}
            max={3650}
            value={draft.check.days}
            disabled={!canWrite || busy}
            onChange={(e) => update('check', { kind: 'stale_description', days: Number(e.target.value) })}
          />
        </label>
      )}
      {draft.check.kind === 'text' && (
        <>
          <label className="block text-sm">
            확인 문구 (줄마다 하나, 최대 8개)
            <textarea
              className={inputClass}
              value={draft.check.terms.join('\n')}
              disabled={!canWrite || busy}
              onChange={(e) =>
                update('check', {
                  kind: 'text',
                  terms: e.target.value.split('\n'),
                  match: draft.check.kind === 'text' ? draft.check.match : 'any',
                })
              }
            />
          </label>
          <label className="block text-sm">
            문구 조건
            <select
              aria-label="문구 조건"
              className={inputClass}
              value={draft.check.match}
              disabled={!canWrite || busy}
              onChange={(e) =>
                update('check', {
                  kind: 'text',
                  terms: draft.check.kind === 'text' ? draft.check.terms : [],
                  match: e.target.value as 'any' | 'all',
                })
              }
            >
              <option value="any">하나라도 포함</option>
              <option value="all">모두 포함</option>
            </select>
          </label>
        </>
      )}
      <label className="block text-sm">
        <input
          type="checkbox"
          checked={draft.enabled}
          disabled={!canWrite || busy}
          onChange={(e) => update('enabled', e.target.checked)}
        />{' '}
        기준 사용
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass}
          disabled={!canWrite || busy || !draft.title.trim() || !draft.instructions.trim()}
          onClick={() => void onSave(draft)}
        >
          기준 저장
        </button>
        {rule && (
          <button
            className={secondary}
            onClick={async () => {
              const seq = ++versionSequence.current;
              try {
                const data = await api.versions(rule.id);
                if (seq === versionSequence.current) setVersions(data);
              } catch (e) {
                if (seq === versionSequence.current) setError(message(e));
              }
            }}
          >
            기준 버전 이력
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {versions.map((v) => (
        <details key={v.revision}>
          <summary>
            v{v.revision} · {new Date(v.updatedAt).toLocaleString()}
          </summary>
          <p className="text-xs">
            {v.title} · {purposes[v.purpose]} · {v.descriptionType}/{v.language} ·{' '}
            {v.regulatoryTypes.join(', ') || '전체 상품군'} · {v.cadenceDays}일 주기 ·{' '}
            {v.enabled ? '사용' : '중지'}
          </p>
          <pre className="whitespace-pre-wrap text-sm">
            {v.instructions}
            {'\n'}
            {JSON.stringify(v.check, null, 2)}
          </pre>
        </details>
      ))}
    </section>
  );
}

function BatchEditor({
  batch,
  initialTaskId,
  canWrite,
  onSave,
}: {
  batch: ProductCorrectionBatch;
  initialTaskId?: string;
  canWrite: boolean;
  onSave: (
    task: ProductCorrectionTask,
    input: Pick<ProductCorrectionTask, 'state' | 'draft' | 'notes' | 'sources' | 'followUpAt'>,
  ) => Promise<void>;
}) {
  const [taskId, setTaskId] = useState(
    batch.items.some((item) => item.id === initialTaskId) ? initialTaskId! : batch.items[0]?.id || '',
  );
  const task = batch.items.find((i) => i.id === taskId);
  return (
    <section className="space-y-3 rounded border p-4" aria-label="선택 상품 보완 작업">
      <h4 className="font-semibold">
        {batch.title} · 작업 묶음 v{batch.revision}
      </h4>
      <p className="text-sm">
        작업 당시 기준: {batch.ruleSnapshot.title} v{batch.ruleSnapshot.revision} · 지침은 이후 기준 수정과
        독립적으로 보존됩니다.
      </p>
      <details>
        <summary>이 작업에 적용된 기준 보기</summary>
        <pre className="whitespace-pre-wrap text-sm">{batch.ruleSnapshot.instructions}</pre>
      </details>
      <select
        className={inputClass}
        aria-label="작업 상품"
        value={taskId}
        onChange={(e) => setTaskId(e.target.value)}
      >
        {batch.items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.product.name} · {states[i.state]}
          </option>
        ))}
      </select>
      {task && <ProductCorrectionProposalEditor key={task.id} batchId={batch.id} taskId={task.id} canWrite={canWrite} />}
      {task && (
        <TaskEditor
          key={`${task.id}:${task.updatedAt}`}
          task={task}
          batchId={batch.id}
          batchRevision={batch.revision}
          rule={batch.ruleSnapshot}
          canWrite={canWrite}
          onSave={(input) => onSave(task, input)}
        />
      )}
    </section>
  );
}
function TaskEditor({
  task,
  batchId,
  batchRevision,
  rule,
  canWrite,
  onSave,
}: {
  task: ProductCorrectionTask;
  batchId: string;
  batchRevision: number;
  rule: ProductCorrectionRule;
  canWrite: boolean;
  onSave: (
    input: Pick<ProductCorrectionTask, 'state' | 'draft' | 'notes' | 'sources' | 'followUpAt'>,
  ) => Promise<void>;
}) {
  const [form, setForm] = useState({
    state: task.state,
    draft: task.draft,
    notes: task.notes,
    sources: task.sources,
    followUpAt: task.followUpAt ?? null,
  });
  const [error, setError] = useState('');
  const [versions, setVersions] = useState<ProductCorrectionTaskVersion[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const versionSequence = useRef(0);
  useEffect(() => {
    const sequence = versionSequence;
    return () => {
      sequence.current++;
    };
  }, []);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDraft, setAiDraft] = useState<{ draft: string; missingEvidence: string[]; batchRevision: number } | null>(null);
  const aiLock = useRef(false);
  const aiActive = useRef(true);
  useEffect(() => { aiActive.current = true; return () => { aiActive.current = false; }; }, []);
  const lock = useRef(false);
  const requestAiDraft = async () => {
    if (!canWrite || saving || aiLock.current) return;
    aiLock.current = true;
    setAiBusy(true);
    setAiDraft(null);
    setError('');
    try {
      const result = await api.aiDraft(batchId, task.id, batchRevision);
      if (result.taskId !== task.id || result.batchRevision !== batchRevision || result.sourceFingerprint !== task.product.fingerprint)
        throw new Error('작업 기준이 변경됐습니다. 최신 작업을 확인해 주세요.');
      if (aiActive.current) setAiDraft(result);
    } catch (e) {
      if (aiActive.current) setError(message(e));
    } finally {
      aiLock.current = false;
      if (aiActive.current) setAiBusy(false);
    }
  };
  const requestText = `상품 보완 검토 작업 (원본 적용 없음)\n기준: ${rule.title} v${rule.revision}\n지침:\n${rule.instructions}\n상품: ${task.product.name}\n이용 목적: ${purposes[rule.purpose]}\n대상: ${rule.descriptionType} / ${rule.language}\n상품군: ${task.product.regulatoryType} / 제조사: ${task.product.manufacturerName ?? '미확인'} / 규격: ${task.product.specification ?? '미확인'}\n기존 원문${task.product.sourceTruncated ? ' (앞부분만, 전체 원문 추가 확인 필요)' : ''}:\n${task.product.sourceContent}\n출처: ${task.product.sourceType ?? '미확인'} / ${task.product.sourceRefId ?? '미확인'}\n상품 사실과 전문 참고정보를 구분하고 각각의 출처·확인일을 기록하세요. 수치의 기준량을 추정하거나 일반 사용 안내를 제품 고유 사용법으로 바꾸지 마세요. 질병명·진단·감별 정보는 단어만으로 배제하지 말고 해당 이용 목적과 전문 근거에 맞게 구성하세요. 확인되지 않은 내용은 필요한 근거로 표시하세요. 보완 초안과 근거·검토 메모를 작성하고 공식 데이터 변경·게시 완료로 표현하지 마세요.`;
  return (
    <div className="space-y-3">
      <a className="block text-sm text-blue-700 underline" href={`/admin/o4o-product-db/maintenance?product=${task.product.id}&batch=${batchId}&task=${task.id}#product-workspace`}>이 상품의 자료·정비·갱신 이력 열기</a>
      <details>
        <summary>점검 당시 원문·작업 안내</summary>
        <p className="text-xs">
          설명서 변경 시점: {task.product.descriptionUpdatedAt ?? '설명서 없음'}. 현재 원문과 다를 수
          있습니다.
        </p>
        <textarea className={inputClass} aria-label="작업 안내" rows={8} value={requestText} readOnly />
        <button
          className={secondary}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(requestText);
              setError('');
            } catch {
              setError('복사하지 못했습니다. 작업 안내를 직접 선택해 복사해 주세요.');
            }
          }}
        >
          작업 안내 복사
        </button>
      </details>
      <label className="block text-sm">
        작업 상태
        <select
          aria-label="작업 상태"
          className={inputClass}
          value={form.state}
          disabled={!canWrite || saving}
          onChange={(e) => setForm({ ...form, state: e.target.value as ProductCorrectionTaskState })}
        >
          {Object.entries(states).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-gray-600">
        검토 완료: {task.reviewedAt ? new Date(task.reviewedAt).toLocaleString() : '미완료'} · 다음 점검:{' '}
        {task.nextReviewAt ? new Date(task.nextReviewAt).toLocaleString() : '없음'}
      </p>
      {['needs_source', 'deferred'].includes(form.state) && (
        <label className="block text-sm">
          재확인 예정일
          <input
            aria-label="재확인 예정일"
            type="datetime-local"
            className={inputClass}
            disabled={!canWrite || saving}
            value={
              form.followUpAt
                ? new Date(
                    new Date(form.followUpAt).getTime() -
                      new Date(form.followUpAt).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ''
            }
            onChange={(e) =>
              setForm({ ...form, followUpAt: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </label>
      )}
      <section className="rounded border p-3" aria-label="AI 보완 초안">
        <button type="button" className={secondary} disabled={!canWrite || saving || aiBusy} onClick={() => void requestAiDraft()}>
          {aiBusy ? 'AI 초안 준비 중…' : 'AI 보완 초안 요청'}
        </button>
        <p className="text-xs">저장된 원문·기준·메모·근거로 검토안을 만듭니다. 입력 중인 내용은 먼저 저장해 주세요. 공식 상품에는 반영하지 않습니다.</p>
        {aiDraft && <>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words">{aiDraft.draft}</pre>
          <ul>{aiDraft.missingEvidence.map((item, i) => <li key={`${i}:${item}`}>{item}</li>)}</ul>
          {aiDraft.batchRevision !== batchRevision && <p role="alert">작업 버전이 바뀌었습니다. 최신 기준으로 다시 요청해 주세요.</p>}
          <button type="button" className={secondary} disabled={!canWrite || saving || aiDraft.batchRevision !== batchRevision} onClick={() => setForm(previous => ({ ...previous, draft: aiDraft.draft }))}>이 검토안을 보완 초안에 넣기</button>
        </>}
      </section>
      {(['draft', 'notes', 'sources'] as const).map((field) => (
        <label key={field} className="block text-sm">
          {{ draft: '보완 초안 (미적용)', notes: '검토 메모', sources: '확인 근거·출처' }[field]}
          <textarea
            className={inputClass}
            aria-label={{ draft: '보완 초안', notes: '검토 메모', sources: '확인 근거·출처' }[field]}
            placeholder={
              field === 'sources'
                ? '상품 고유 사실 근거: 출처·확인일\n전문 참고정보 근거: 출처·확인일\n추가 확인이 필요한 자료:'
                : undefined
            }
            rows={field === 'draft' ? 8 : 3}
            maxLength={field === 'draft' ? 30000 : 8000}
            value={form[field]}
            disabled={!canWrite || saving}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          />
        </label>
      ))}
      <button
        className={buttonClass}
        disabled={!canWrite || saving}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setSaving(true);
          setError('');
          try {
            await onSave(form);
          } catch (e) {
            setError(message(e));
          } finally {
            lock.current = false;
            setSaving(false);
          }
        }}
      >
        작업 기록 저장
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className={secondary}
          onClick={async () => {
            const seq = ++versionSequence.current;
            try {
              const data = await api.taskVersions(batchId, task.id, 1);
              if (seq === versionSequence.current) {
                setVersions(data);
                setHistoryPage(1);
              }
            } catch (e) {
              if (seq === versionSequence.current) setError(message(e));
            }
          }}
        >
          작업 저장 이력
        </button>
        {historyPage > 0 && (
          <button
            className={secondary}
            disabled={versions.length < 10}
            onClick={async () => {
              const seq = ++versionSequence.current;
              try {
                const data = await api.taskVersions(batchId, task.id, historyPage + 1);
                if (seq === versionSequence.current) {
                  setVersions(data);
                  setHistoryPage((p) => p + 1);
                }
              } catch (e) {
                if (seq === versionSequence.current) setError(message(e));
              }
            }}
          >
            이전 저장 더 보기
          </button>
        )}
      </div>
      {versions.map((v) => (
        <details key={v.batchRevision}>
          <summary>
            저장 v{v.batchRevision} · {states[v.task.state]} · {new Date(v.task.updatedAt).toLocaleString()}
          </summary>
          <pre className="whitespace-pre-wrap break-words text-sm">
            {v.task.draft}
            {'\n'}
            {v.task.notes}
            {'\n'}
            {v.task.sources}
          </pre>
        </details>
      ))}
      <p className="text-xs text-gray-600">
        검토 대기·변경안 검토 완료에는 초안·메모·근거가 필요합니다. 수정 불필요·대상 제외에는 메모·근거, 근거
        대기·보류에는 사유·재확인일이 필요합니다. 이 저장은 상품 원본을 바꾸지 않습니다.
      </p>
    </div>
  );
}
