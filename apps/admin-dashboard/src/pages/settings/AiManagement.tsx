import { AiModelCatalog, ModelControlStatus, UsageModelSelection, useAiModelControls } from './AiModelControls';
import ExternalAiConnections from './external-ai/ExternalAiConnections';
import { ConsultationRuntimeControls } from './ConsultationRuntimeControls';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAiManagement,
  getAiRecordedUsage,
  type AiManagementSnapshot,
  type AiRecordedUsage,
  type AiUsageEntry,
} from "@/api/ai-management";

const coverage = {
  connected: "연결",
  partial: "부분 연결",
  unconnected: "미연결",
};
const stops = { query: "공통 질의 설정", scope: "공유 정책", none: "미연결" };

const configuration = {
  stored: "저장 설정",
  missing: "정책 미등록",
  unavailable: "설정 조회 실패",
  code: "코드 기본값",
  runtime: "실행 시 결정",
};
const button =
  "rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50";
const input = "rounded border border-gray-300 bg-white px-3 py-2 text-sm";

function timestamp(value: string) {
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function AiManagement() {
  const [area,setArea]=useState<'internal'|'external'>('internal');
  return <div className="space-y-5">
    <nav aria-label="AI 연결 구분" className="flex flex-wrap gap-2">
      <button className={button} aria-pressed={area==='internal'} onClick={()=>setArea('internal')}>O4O 내부 AI</button>
      <button className={button} aria-pressed={area==='external'} onClick={()=>setArea('external')}>외부 AI 연결</button>
    </nav>
    {area==='internal'?<InternalAiManagement/>:<ExternalAiConnections/>}
  </div>;
}

function InternalAiManagement() {
  const modelControl = useAiModelControls();
  const [data, setData] = useState<AiManagementSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<"usages" | "providers" | "statistics">(
    "usages",
  );
  const [group, setGroup] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setData(null);
    getAiManagement()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);

  if (loading) return <p role="status">AI 운영 정보를 불러오는 중입니다.</p>;
  if (error || !data)
    return (
      <div role="alert">
        <p>AI 운영 정보를 불러오지 못했습니다.</p>
        <button
          className={button}
          onClick={() => setRetry((value) => value + 1)}
        >
          다시 불러오기
        </button>
      </div>
    );
  const groupName = (id: string) =>
    data.groups.find((item) => item.id === id)?.name ?? id;
  const filtered = data.usages.filter(
    (item) =>
      (!group || item.group === group) &&
      `${item.name} ${groupName(item.group)} ${item.capability} ${item.configuration.model ?? ""} ${modelControl.data?.selections[modelControl.data.usageTargets[item.id]]?.model ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const detail = data.usages.find((item) => item.id === selected);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">AI 운영 관리</h2>
          <p className="mt-1 text-sm text-gray-600">
            사용처별 설정과 연결 범위, 기록된 사용량을 확인합니다.
          </p>
        </div>
        <button
          className={button}
          disabled={modelControl.busy}
          onClick={() => { setRetry((value) => value + 1); void modelControl.refresh(); }}
        >
          새로 불러오기
        </button>
      </div>
      <p className="text-sm text-gray-600">
        조회 시각: {timestamp(data.observedAt)} (한국 시간)
      </p>
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm space-y-1">
        <p>{data.notice}</p>
        <p>
          모델 목록과 사용 모델을 관리합니다. 사용 중지 설정과 실제 공급자 인증·실행 결과 확인은 별도입니다.
        </p>
      </div>
      <ModelControlStatus control={modelControl} />
      <ConsultationRuntimeControls control={modelControl} />
      <div
        role="tablist"
        aria-label="AI 운영 관리 화면"
        className="flex flex-wrap gap-2 border-b pb-3"
      >
        {(
          [
            ["usages", "사용처·현재 설정"],
            ["providers", "API·모델 연결"],
            ["statistics", "사용량·비용"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`ai-tab-${id}`}
            aria-controls={`ai-panel-${id}`}
            aria-selected={tab === id}
            className={`${button} ${tab === id ? "bg-blue-50 font-semibold text-blue-800" : ""}`}
            disabled={modelControl.busy}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "usages" && (
        <section
          role="tabpanel"
          id="ai-panel-usages"
          aria-labelledby="ai-tab-usages"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              서비스·업무 영역
              <select
                className={input}
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value);
                  setSelected(null);
                }}
              >
                <option value="">전체 영역</option>
                {data.groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              기능·모델 검색
              <input
                className={input}
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelected(null);
                }}
                placeholder="기능 이름 또는 모델"
              />
            </label>
            <p className="py-2 text-sm text-gray-600">
              {filtered.length}개 항목
            </p>
          </div>
          {(data.queryPolicyRead === "unavailable" ||
            data.scopePolicyRead === "unavailable") && (
            <p role="alert" className="text-red-700">
              일부 저장 설정을 조회하지 못했습니다. 해당 항목은 설정 조회 실패로
              표시합니다.
            </p>
          )}
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">
                AI 사용처와 현재 설정·중지·집계 연결
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "사용처",
                    "저장 모델·결정 방식",
                    "사용 설정",
                    "중지 연결",
                    "비용 집계",
                    "실행 적용",
                  ].map((title) => (
                    <th key={title} className="p-3">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="p-3">
                      <button
                        className="text-left font-medium text-blue-800 underline"
                        aria-expanded={selected === item.id}
                        aria-controls="ai-usage-detail"
                        onClick={() =>
                          setSelected(selected === item.id ? null : item.id)
                        }
                      >
                        {item.name}
                      </button>
                      <p className="mt-1 text-xs text-gray-600">
                        {groupName(item.group)} · {item.capability}
                      </p>
                    </td>
                    <td className="p-3 break-all">
                      {modelControl.data?.selections[modelControl.data.usageTargets[item.id]]?.model ?? item.configuration.model ??
                        configuration[item.configuration.state]}
                      <p className="mt-1 text-xs text-gray-600">
                        {modelControl.data?.selections[modelControl.data.usageTargets[item.id]]?.provider ?? item.configuration.provider ?? "기능별 결정"} ·{" "}
                        {modelControl.data?.selections[modelControl.data.usageTargets[item.id]] ? '관리자 지정' : configuration[item.configuration.state]}
                      </p>
                    </td>
                    <td className="p-3">
                      {item.configuration.enabled === null
                        ? "확인 불가"
                        : item.configuration.enabled
                          ? "사용 설정"
                          : "중지 설정"}
                    </td>
                    <td className="p-3">{stops[item.stop]}</td>
                    <td className="p-3">{coverage[item.accounting]}</td>
                    <td className="p-3">미확인</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="p-4">선택한 조건의 사용처가 없습니다.</p>
            )}
          </div>
          <div id="ai-usage-detail">
            {detail && <><UsageDetail usage={detail} /><UsageModelSelection usageId={detail.id} control={modelControl} /></>}
          </div>
          <div className="rounded border p-4 text-sm space-y-2">
            <h3 className="font-semibold">기존 공통 질의 설정</h3>
            <p>
              Gemini 모델 선택은 이를 읽는 질의·편집 경로에 영향을 줍니다.
              활성화 설정은 공통 질문·요약에 적용되며 전체 AI의 중지 설정은
              아닙니다.
            </p>
            <Link className="text-blue-800 underline" to="/settings/ai-query">
              공통 질의 설정으로 이동
            </Link>
          </div>
          <details className="rounded border p-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              도입 예정·외부 API 호출과 구분할 항목
            </summary>
            <ul className="mt-3 space-y-3">
              {data.nonApiItems.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong> · {item.status}
                  <p className="text-gray-600">{item.note}</p>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
      {tab === "providers" && (
        <section
          role="tabpanel"
          id="ai-panel-providers"
          aria-labelledby="ai-tab-providers"
          className="space-y-4"
        >
          <AiModelCatalog providers={data.providers} control={modelControl} />
        </section>
      )}
      {tab === "statistics" && <RecordedUsage />}
    </div>
  );
}

function UsageDetail({ usage }: { usage: AiUsageEntry }) {
  return (
    <section
      className="rounded border border-blue-200 bg-blue-50 p-4 text-sm space-y-2"
      aria-label={`${usage.name} 상세`}
    >
      <h3 className="font-semibold">{usage.name}</h3>
      <p>{usage.note}</p>
      <p>{usage.configuration.description}</p>
      {usage.scope && (
        <p>
          집계 정책: {usage.scope}. 공유 정책의 기록은 기능별로 나누어 집계할 수
          없습니다.
        </p>
      )}
      <p>
        중지 연결: {stops[usage.stop]} · 비용 집계: {coverage[usage.accounting]}{" "}
        · 실행 적용: 미확인
      </p>
    </section>
  );
}

function RecordedUsage() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<AiRecordedUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setData(null);
    getAiRecordedUsage(days)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, retry]);
  return (
    <section
      role="tabpanel"
      id="ai-panel-statistics"
      aria-labelledby="ai-tab-statistics"
      className="space-y-4"
    >
      <label className="flex items-center gap-2 text-sm">
        조회 기간
        <select
          className={input}
          value={days}
          onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
        >
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
          <option value={90}>최근 90일</option>
        </select>
      </label>
      {loading ? (
        <p role="status">사용량을 불러오는 중입니다.</p>
      ) : error || !data ? (
        <div role="alert">
          <p>사용량을 조회하지 못했습니다. 0건으로 판단할 수 없습니다.</p>
          <button
            className={button}
            onClick={() => setRetry((value) => value + 1)}
          >
            다시 조회
          </button>
        </div>
      ) : (
        <>
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
            {data.notice}
          </p>
          <p className="text-sm text-gray-600">
            {timestamp(data.period.from)} ~ {timestamp(data.period.to)} (한국
            시간)
          </p>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["기록 건수", data.total.records.toLocaleString()],
              ["오류 기록", data.total.errors.toLocaleString()],
              ["기록된 추정 비용 (USD)", data.total.cost],
              ["비용 미집계 기록", data.total.unpriced.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded border bg-white p-3">
                <dt className="text-sm text-gray-600">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {(data.total.unpriced > 0 || data.total.unmetered > 0) && (
            <p className="text-sm text-amber-800">
              비용 미집계 {data.total.unpriced}건 · 토큰 정보 누락{" "}
              {data.total.unmetered}건. 누락 값은 무료 사용을 뜻하지 않습니다.
            </p>
          )}
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">
                공급자·모델·기록 정책별 사용량
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "공급자·모델",
                    "기록 정책·관련 기능",
                    "기록/오류",
                    "입력/출력 토큰",
                    "기록된 추정 비용 (USD)",
                  ].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.groups.map((row) => (
                  <tr
                    className="border-t align-top"
                    key={JSON.stringify([row.provider, row.model, row.scope])}
                  >
                    <td className="p-3 break-all">
                      {row.provider}
                      <p>{row.model}</p>
                    </td>
                    <td className="p-3">
                      {row.scope ?? "기능 미분류"}
                      <p className="text-xs text-gray-600">
                        {row.relatedUsages.length
                          ? row.relatedUsages.join(" · ")
                          : "사용처 귀속 미확인"}
                      </p>
                    </td>
                    <td className="p-3">
                      {row.records.toLocaleString()} /{" "}
                      {row.errors.toLocaleString()}
                    </td>
                    <td className="p-3">
                      {row.input.toLocaleString()} /{" "}
                      {row.output.toLocaleString()}
                      {row.unmetered > 0 && (
                        <p className="text-xs">정보 누락 {row.unmetered}건</p>
                      )}
                    </td>
                    <td className="p-3">
                      {row.cost}
                      {row.unpriced > 0 && (
                        <p className="text-xs text-amber-800">
                          미집계 {row.unpriced}건
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.groups.length && (
              <p className="p-4">
                선택한 기간에 기록된 사용량이 없습니다. 전체 서비스에서 AI를
                사용하지 않았다는 뜻은 아닙니다.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
