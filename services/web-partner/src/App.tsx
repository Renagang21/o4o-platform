import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  base,
  calendarDate,
  channels,
  contentDraft,
  emptyWorkspace,
  integer,
  loadWorkspace,
  parseWorkspace,
  tags as parseTags,
  channelProfiles,
  validCalendarDate,
  saveWorkspace,
  settlementCsv,
  STORAGE_KEY,
  trackingLink,
  webUrl,
  type Channel,
  type Workspace,
} from "./model";
import RecordEditor, { type Collection, type Editing } from "./RecordEditor";
import AssetResources from "./AssetResources";
import {
  ActivityImporter,
  PaymentImporter,
  PerformanceReports,
} from "./WorkspaceUtilities";

const pages = [
  ["home", "시작하기", "◈"],
  ["proposals", "홍보 제안", "↗"],
  ["creators", "홍보자", "◎"],
  ["library", "콘텐츠 자료실", "▤"],
  ["studio", "제작 도구", "✧"],
  ["activities", "활동 기록", "◷"],
  ["settlements", "정산 내역", "₩"],
  ["reports", "성과 리포트", "▥"],
] as const;
type Page = (typeof pages)[number][0];
const titles: Record<Page, [string, string]> = {
  reports: [
    "기록을 다음 콘텐츠의 힌트로",
    "게시한 콘텐츠와 직접 등록한 지표를 비교하세요.",
  ],
  home: [
    "홍보를 함께 만드는 공간",
    "좋은 제품과 나다운 콘텐츠가 만나는 곳. 필요한 도구부터 시작하세요.",
  ],
  proposals: [
    "새로운 홍보를 발견하세요",
    "사업자가 소개한 제품과 홍보 제안을 살펴보세요.",
  ],
  creators: [
    "채널 너머의 크리에이터",
    "활동 분야와 대표 콘텐츠로 나를 소개하세요.",
  ],
  library: [
    "좋은 콘텐츠의 출발점",
    "제품 정보와 홍보 자료를 모으고, 필요한 곳에 활용하세요.",
  ],
  studio: [
    "아이디어를 게시물로",
    "제품 정보를 채널에 맞는 구성안으로 바꾸고 홍보 링크를 준비하세요.",
  ],
  activities: [
    "나의 홍보를 기록하세요",
    "게시한 콘텐츠와 직접 확인한 결과를 한곳에 모으세요.",
  ],
  settlements: [
    "정산을 더 명확하게",
    "당사자가 정한 지급 내역을 기록하고 명세를 내려받으세요.",
  ],
};
const route = (): Page =>
  pages.find(([id]) => id === window.location.hash.slice(1))?.[0] ?? "home";
const money = (value: number | bigint) => `${value.toLocaleString("ko-KR")}원`;

function download(
  name: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function ChannelField({
  name = "channel",
  filter = false,
  id,
}: {
  name?: string;
  filter?: boolean;
  id?: string;
}) {
  return (
    <select id={id} name={name} required={!filter}>
      {filter && <option value="">모든 채널</option>}
      {channels.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}
function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span aria-hidden="true">＋</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function FormPanel({
  title,
  children,
  onSubmit,
  disabled,
  permissionReadOnly = false,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  permissionReadOnly?: boolean;
}) {
  if (permissionReadOnly)
    return (
      <aside className="panel form-panel">
        <h2>이용 권한 안내</h2>
        <p className="hint">
          현재 권한으로는 이 기록을 추가하거나 수정할 수 없습니다. 등록된 자료와
          내역을 확인할 수 있습니다.
        </p>
      </aside>
    );
  return (
    <aside className="panel form-panel">
      <h2>{title}</h2>
      <form onSubmit={onSubmit}>
        <fieldset disabled={disabled}>
          {children}
          <button className="button primary" type="submit">
            저장하기
          </button>
        </fieldset>
      </form>
    </aside>
  );
}

export type RemoteWorkspace = {
  spaceId?: string;
  workspace: Workspace;
  role: "owner" | "editor" | "viewer";
  name: string;
  save: (workspace: Workspace) => Promise<Workspace>;
};
export default function App({ remote }: { remote?: RemoteWorkspace } = {}) {
  const [initial] = useState(() => {
    if (remote) return { data: remote.workspace, error: "" };
    try {
      return loadWorkspace(window.localStorage);
    } catch {
      return {
        data: emptyWorkspace(),
        error:
          "이 브라우저에서 저장소를 사용할 수 없습니다. 저장 기능이 중지되었습니다.",
      };
    }
  });
  const [workspace, setWorkspace] = useState(initial.data);
  const [page, setPage] = useState<Page>(route);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(initial.error);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [studioChannel, setStudioChannel] = useState<Channel>("인스타그램");
  const [studioProduct, setStudioProduct] = useState("");
  const [studioBusiness, setStudioBusiness] = useState("");
  const [studioFacts, setStudioFacts] = useState("");
  const [folder, setFolder] = useState(""),
    [templatesOnly, setTemplatesOnly] = useState(false);
  const [settlementMonth, setSettlementMonth] = useState(""),
    [settlementStatus, setSettlementStatus] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const readOnly = !!initial.error || saving || remote?.role === "viewer";
  const settlementDisabled = readOnly || (!!remote && remote.role !== "owner");

  useEffect(() => {
    const changed = () => {
      setPage(route());
      setQuery("");
      setFilter("");
      setNotice("");
      setError(initial.error);
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, [initial.error]);
  useEffect(() => {
    document.title = `${pages.find(([id]) => id === page)?.[1]} · O4O Partner`;
  }, [page]);

  const act = (work: () => void | Promise<void>) => {
    setNotice("");
    setError(initial.error);
    const report = (e: unknown) => {
      setError(
        e instanceof Error
          ? e.message
          : "처리하지 못했습니다. 다시 시도해 주세요.",
      );
    };
    try {
      const result = work();
      if (result instanceof Promise) void result.catch(report);
    } catch (e) {
      report(e);
    }
  };
  const persist = (next: Workspace, message = "저장했습니다.") => {
    if (initial.error) throw new Error(initial.error);
    if (remote) {
      if (remote.role === "viewer")
        throw new Error("이 공동공간은 열람만 할 수 있습니다.");
      if (savingRef.current)
        throw new Error("저장 중입니다. 잠시 기다려 주세요.");
      savingRef.current = true;
      setSaving(true);
      return remote
        .save(next)
        .then((saved) => {
          setWorkspace(saved);
          setNotice(message);
        })
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
    }
    const current = loadWorkspace(window.localStorage);
    if (current.error) throw new Error(current.error);
    if (JSON.stringify(current.data) !== JSON.stringify(workspace))
      throw new Error(
        "다른 탭에서 자료가 변경되었습니다. 새로고침 후 다시 저장해 주세요. 기존 자료는 덮어쓰지 않았습니다.",
      );
    try {
      saveWorkspace(window.localStorage, next);
    } catch {
      throw new Error(
        "저장하지 못했습니다. 브라우저 저장 공간과 저장 허용 설정을 확인해 주세요.",
      );
    }
    setWorkspace(next);
    setNotice(message);
  };
  const submit =
    (save: (f: FormData) => void | Promise<void>) =>
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      act(() => {
        const result = save(new FormData(form));
        if (result instanceof Promise)
          return result.then(() => {
            form.reset();
          });
        form.reset();
      });
    };
  const text = (f: FormData, key: string) => {
    const value = String(f.get(key) ?? "").trim();
    if (value.length > 20000)
      throw new Error("입력 내용은 20,000자 이내로 작성해 주세요.");
    return value;
  };
  const required = (f: FormData, key: string) => {
    const v = text(f, key);
    if (!v) throw new Error("필수 항목을 입력해 주세요.");
    return v;
  };
  const selectedChannel = (f: FormData) => {
    const c = required(f, "channel") as Channel;
    if (!channels.includes(c)) throw new Error("채널을 선택해 주세요.");
    return c;
  };
  const relation = (f: FormData) => {
    const proposalId = required(f, "proposalId"),
      creatorId = required(f, "creatorId");
    if (
      !workspace.proposals.some((p) => p.id === proposalId) ||
      !workspace.creators.some((c) => c.id === creatorId)
    )
      throw new Error("등록된 홍보 제안과 홍보자를 선택해 주세요.");
    return { proposalId, creatorId };
  };
  const relations = (
    <>
      <Field label="홍보 제안">
        <select name="proposalId" required defaultValue="">
          <option value="" disabled>
            제안 선택
          </option>
          {workspace.proposals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="홍보자">
        <select name="creatorId" required defaultValue="">
          <option value="" disabled>
            홍보자 선택
          </option>
          {workspace.creators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.channel}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
  const hasRelations =
    workspace.proposals.length > 0 && workspace.creators.length > 0;
  const matches = (value: string, channel: string) =>
    value.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
    (!filter || filter === channel);
  const search = (
    <div className="searchbar">
      <input
        type="search"
        aria-label="검색"
        placeholder="이름, 주제, 제품으로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        aria-label="채널 필터"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="">모든 채널</option>
        {channels.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  );
  const proposals = workspace.proposals.filter((p) =>
    matches(
      `${p.title} ${p.business} ${p.category} ${p.description}`,
      p.channel,
    ),
  );
  const creators = workspace.creators.filter((c) =>
    [c.channel, ...(c.channelProfiles || []).map((p) => p.channel)].some((ch) =>
      matches(`${c.name} ${c.topic} ${c.language || ""} ${c.region || ""}`, ch),
    ),
  );
  const assets = workspace.assets.filter(
    (a) =>
      matches(
        `${a.title} ${a.business} ${a.content} ${(a.tags || []).join(" ")}`,
        a.channel,
      ) &&
      (!folder || a.folder === folder) &&
      (!templatesOnly || a.isTemplate),
  );
  const shownSettlements = workspace.settlements.filter(
    (s) =>
      (!settlementMonth || s.createdAt.slice(0, 7) === settlementMonth) &&
      (!settlementStatus || s.status === settlementStatus),
  );
  const pending = workspace.settlements
    .filter((s) => s.status === "recorded")
    .reduce((n, s) => n + BigInt(s.amount), 0n);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("복사했습니다.");
    } catch {
      setError(
        "자동 복사를 사용할 수 없습니다. 내용란을 선택해 직접 복사해 주세요.",
      );
    }
  };

  const recordControls = (kind: Collection, id: string) => {
    if (readOnly || (kind === "settlements" && settlementDisabled)) return null;
    return (
      <div className="record-controls">
        <button
          className="text-button"
          onClick={() => {
            setError("");
            setEditing({ kind, id });
          }}
        >
          수정
        </button>
        <button
          className="text-button"
          onClick={() =>
            act(() => {
              if (
                ["proposals", "creators"].includes(kind) &&
                [...workspace.activities, ...workspace.settlements].some(
                  (row) =>
                    kind === "proposals"
                      ? row.proposalId === id
                      : row.creatorId === id,
                )
              )
                throw new Error(
                  "활동·정산 기록에서 사용하는 항목은 삭제할 수 없습니다.",
                );
              if (
                !window.confirm(
                  "이 기록을 삭제할까요? 연결된 외부 게시물이나 실제 지급 내역은 변경되지 않습니다.",
                )
              )
                return;
              return persist(
                {
                  ...workspace,
                  [kind]: workspace[kind].filter((row) => row.id !== id),
                },
                "기록을 삭제했습니다.",
              );
            })
          }
        >
          삭제
        </button>
      </div>
    );
  };
  const editSave = (fields: FormData) =>
    act(() => {
      if (!editing) return;
      if (editing.kind === "settlements" && settlementDisabled)
        throw new Error("정산 내역은 소유자만 변경할 수 있습니다.");
      const original = workspace[editing.kind].find(
        (row) => row.id === editing.id,
      );
      if (!original) throw new Error("수정할 기록을 찾지 못했습니다.");
      const updates: Record<string, unknown> = {};
      for (const [key, value] of fields.entries()) {
        const input = String(value).trim();
        updates[key] =
          key === "amount"
            ? integer(input, 1)
            : key === "views"
              ? input
                ? integer(input)
                : null
              : key === "publishedAt"
                ? calendarDate(input)
                : ["url", "contact", "destination", "portfolio"].includes(key)
                  ? webUrl(
                      input,
                      key === "destination" ||
                        (key === "url" && editing.kind === "activities"),
                    )
                  : input;
      }
      if (editing.kind === "creators") {
        updates.channelProfiles = channelProfiles(
          String(fields.get("channelProfiles") || ""),
        );
      }
      if (editing.kind === "assets") {
        updates.tags = parseTags(String(fields.get("tags") || ""));
        updates.isTemplate = fields.has("isTemplate");
      }
      if (editing.kind === "settlements")
        updates.dueDate = fields.get("dueDate")
          ? validCalendarDate(String(fields.get("dueDate")))
          : null;
      if (editing.kind === "activities") {
        updates.assetId = fields.get("assetId") || null;
        const value = (key: string) =>
          fields.get(key) ? integer(String(fields.get(key))) : null;
        updates.metrics = {
          likes: value("likes"),
          comments: value("comments"),
          shares: value("shares"),
          source: "manual",
        };
        delete updates.likes;
        delete updates.comments;
        delete updates.shares;
      }
      const next = parseWorkspace(
        JSON.stringify({
          ...workspace,
          [editing.kind]: workspace[editing.kind].map((row) =>
            row.id === original.id ? { ...row, ...updates } : row,
          ),
        }),
      );
      const result = persist(next, "기록을 수정했습니다.");
      if (result instanceof Promise) return result.then(() => setEditing(null));
      setEditing(null);
    });
  return (
    <div className="app">
      {editing && (
        <RecordEditor
          target={editing}
          workspace={workspace}
          disabled={saving}
          error={error}
          onSave={editSave}
          onClose={() => setEditing(null)}
        />
      )}
      <a className="skip" href="#main">
        본문으로 이동
      </a>
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark">o4o</span>
          <span>
            partner<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="edition">CREATOR & BUSINESS</span>
        <button
          className="button quiet backup"
          onClick={() =>
            act(() => {
              const raw = initial.error
                ? window.localStorage.getItem(STORAGE_KEY)
                : JSON.stringify(workspace, null, 2);
              if (!raw) throw new Error("백업할 저장 데이터가 없습니다.");
              download("o4o-partner-workspace.json", raw, "application/json");
              setNotice(
                "자료·기록 JSON을 내려받았습니다. 첨부 파일은 별도로 보관해 주세요.",
              );
            })
          }
        >
          자료 백업 ↓
        </button>
      </header>
      <div className="shell">
        <aside className="sidebar">
          <p className="nav-label">PARTNER SPACE</p>
          <nav aria-label="주 메뉴">
            {pages.map(([id, label, icon]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={page === id ? "page" : undefined}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </a>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="small-logo">p.</span>
            <strong>함께, 각자의 방식으로.</strong>
            <p>
              콘텐츠부터 활동 기록까지
              <br />
              홍보에 필요한 도구를 만나세요.
            </p>
          </div>
        </aside>
        <main id="main" tabIndex={-1}>
          <div className="local-banner">
            <span className="status-dot" />
            <span>
              {remote ? (
                <>
                  <strong>{remote.name}</strong> · 서버 공동공간 ·{" "}
                  {remote.role === "owner"
                    ? "소유자"
                    : remote.role === "editor"
                      ? "편집자"
                      : "열람자"}{" "}
                  · 참여자가 자료·활동·정산 내역을 함께 볼 수 있습니다. 정산
                  변경은 소유자만 가능합니다.
                </>
              ) : (
                <>
                  <strong>로컬 작업공간</strong> · 자료는 이 브라우저에만
                  저장됩니다. 다른 사용자와의 공유·로그인·송금은 아직 연결되지
                  않았습니다.
                </>
              )}
            </span>
          </div>
          {notice && (
            <div className="message success" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="message failure" role="alert">
              {error}
            </div>
          )}
          <div className="page-heading">
            <p className="eyebrow">
              O4O PARTNER / {pages.find(([id]) => id === page)?.[1]}
            </p>
            <h1>{titles[page][0]}</h1>
            <p>{titles[page][1]}</p>
          </div>

          {page === "home" && (
            <>
              <section className="hero">
                <div>
                  <span className="pill light">YOUR NEXT CREATIVE CHAPTER</span>
                  <h2>
                    좋은 제품에
                    <br />
                    당신의 이야기를 더하세요<span>.</span>
                  </h2>
                  <p>
                    사업자는 홍보할 자료를, 크리에이터는 자신만의 콘텐츠를.
                    <br />
                    O4O Partner가 그 사이에 필요한 도구를 준비합니다.
                  </p>
                  <a className="button cream" href="#proposals">
                    홍보 제안 살펴보기 <span>↗</span>
                  </a>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit one" />
                  <div className="orbit two" />
                  <div className="art-card card-a">
                    <span>PRODUCT</span>
                    <div className="product-shape" />
                    <b>좋은 발견</b>
                  </div>
                  <div className="art-card card-b">
                    <span>CREATOR</span>
                    <div className="play">▶</div>
                    <b>새로운 이야기</b>
                  </div>
                  <div className="spark">✧</div>
                </div>
              </section>
              <section className="stats" aria-label="작업공간 현황">
                {[
                  [
                    "등록한 홍보 제안",
                    workspace.proposals.length,
                    "#proposals",
                  ],
                  ["모아둔 콘텐츠", workspace.assets.length, "#library"],
                  [
                    "기록한 홍보 활동",
                    workspace.activities.length,
                    "#activities",
                  ],
                  ["미지급 기록 금액", money(pending), "#settlements"],
                ].map(([label, value, href]) => (
                  <a href={String(href)} className="stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <span className="stat-arrow">↗</span>
                  </a>
                ))}
              </section>
              <div className="section-title">
                <div>
                  <p className="eyebrow">MADE FOR YOUR WORK</p>
                  <h2>필요한 곳부터 시작하세요</h2>
                </div>
                <span className="muted">
                  각 서비스는 독립적으로 이용할 수 있어요.
                </span>
              </div>
              <section className="tools-grid">
                {[
                  [
                    "01",
                    "좋은 만남의 시작",
                    "홍보 제안",
                    "제품과 브랜드를 소개하고, 나에게 맞는 홍보를 발견하세요.",
                    "proposals",
                  ],
                  [
                    "02",
                    "아이디어를 콘텐츠로",
                    "제작 도구",
                    "채널에 맞는 문구와 영상 구성안을 준비하세요.",
                    "studio",
                  ],
                  [
                    "03",
                    "홍보 자료를 한곳에",
                    "콘텐츠 자료실",
                    "제품 자료와 직접 만든 콘텐츠를 모아 활용하세요.",
                    "library",
                  ],
                  [
                    "04",
                    "활동 이후까지 명확하게",
                    "정산 내역",
                    "지급 내역을 기록하고 명세를 정리하세요.",
                    "settlements",
                  ],
                ].map(([n, caption, title, body, id]) => (
                  <a className="tool-card" href={`#${id}`} key={id}>
                    <span className="tool-number">{n}</span>
                    <p>{caption}</p>
                    <h3>
                      {title} <span>↗</span>
                    </h3>
                    <p>{body}</p>
                  </a>
                ))}
              </section>
              <section className="principle">
                <span>우리의 역할</span>
                <p>
                  홍보는 사업자와 홍보자가 자율적으로 진행합니다. O4O는 콘텐츠와
                  활동에 필요한 서비스를 제공합니다. 참여 조건과 보상에 대한
                  협의는 양측이 각자의 방식으로 진행하세요.
                </p>
              </section>
            </>
          )}

          {page === "proposals" && (
            <>
              {search}
              <div className="split">
                <section className="record-list" aria-label="홍보 제안 목록">
                  {proposals.length ? (
                    proposals.map((p) => (
                      <article className="panel record" key={p.id}>
                        <div className="record-top">
                          <span className="pill">{p.channel}</span>
                          <span className="muted">{p.category}</span>
                        </div>
                        <p className="overline">{p.business}</p>
                        <h2>{p.title}</h2>
                        <p className="preserve">{p.description}</p>
                        {recordControls("proposals", p.id)}
                        <div className="record-actions">
                          <External href={p.destination}>
                            제품·서비스 보기
                          </External>
                          {p.contact && (
                            <External href={p.contact}>외부 문의처</External>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <Empty
                      title={
                        query || filter
                          ? "검색 결과가 없습니다"
                          : "첫 홍보 제안을 등록해 보세요"
                      }
                    >
                      사업자와 제품, 제공할 자료를 소개해 주세요.
                    </Empty>
                  )}
                </section>
                <FormPanel
                  title="홍보 제안 등록"
                  permissionReadOnly={remote?.role === "viewer"}
                  disabled={readOnly}
                  onSubmit={submit((f) =>
                    persist({
                      ...workspace,
                      proposals: [
                        {
                          ...base(),
                          title: required(f, "title"),
                          business: required(f, "business"),
                          category: required(f, "category"),
                          channel: selectedChannel(f),
                          description: required(f, "description"),
                          destination: webUrl(required(f, "destination")),
                          contact: webUrl(text(f, "contact"), false),
                        },
                        ...workspace.proposals,
                      ],
                    }),
                  )}
                >
                  <Field label="사업자·브랜드">
                    <input
                      name="business"
                      required
                      maxLength={120}
                      placeholder="브랜드 이름"
                    />
                  </Field>
                  <Field label="홍보 제안 제목">
                    <input
                      name="title"
                      required
                      maxLength={160}
                      placeholder="어떤 제품을 소개하나요?"
                    />
                  </Field>
                  <Field label="활동 분야">
                    <input
                      name="category"
                      required
                      maxLength={80}
                      placeholder="라이프스타일, 푸드 등"
                    />
                  </Field>
                  <Field label="홍보 채널">
                    <ChannelField />
                  </Field>
                  <Field label="제품·홍보 소개">
                    <textarea
                      name="description"
                      required
                      maxLength={5000}
                      rows={4}
                      placeholder="제품 정보와 제공 가능한 자료를 소개해 주세요."
                    />
                  </Field>
                  <Field label="제품·서비스 주소">
                    <input
                      name="destination"
                      type="url"
                      required
                      placeholder="https://"
                    />
                  </Field>
                  <Field label="외부 문의처 주소 (선택)">
                    <input name="contact" type="url" placeholder="https://" />
                  </Field>
                  <p className="hint">
                    외부에서 협의한 제안도 등록할 수 있습니다. O4O는 참여 조건을
                    결정하거나 협의를 관리하지 않습니다.
                  </p>
                </FormPanel>
              </div>
            </>
          )}

          {page === "creators" && (
            <>
              {search}
              <div className="split">
                <section className="record-list" aria-label="홍보자 목록">
                  {creators.length ? (
                    creators.map((c) => (
                      <article className="panel record creator" key={c.id}>
                        <div className="avatar" aria-hidden="true">
                          {c.name.slice(0, 1)}
                        </div>
                        <div>
                          <span className="pill">{c.channel}</span>
                          <h2>{c.name}</h2>
                          <p>{c.topic}</p>
                          <p className="hint">
                            {[c.language, c.region].filter(Boolean).join(" · ")}
                          </p>
                          <div className="tag-list">
                            {c.channelProfiles?.map((p, i) => (
                              <External key={`${p.channel}-${i}`} href={p.url}>
                                {p.channel}
                              </External>
                            ))}
                          </div>
                          {recordControls("creators", c.id)}
                          {c.portfolio && (
                            <External href={c.portfolio}>
                              대표 콘텐츠 보기
                            </External>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <Empty title="나의 채널을 소개해 주세요">
                      활동 분야와 대표 콘텐츠를 등록할 수 있습니다.
                    </Empty>
                  )}
                </section>
                <FormPanel
                  title="홍보자 프로필 등록"
                  permissionReadOnly={remote?.role === "viewer"}
                  disabled={readOnly}
                  onSubmit={submit((f) =>
                    persist({
                      ...workspace,
                      creators: [
                        {
                          ...base(),
                          name: required(f, "name"),
                          channel: selectedChannel(f),
                          topic: required(f, "topic"),
                          portfolio: webUrl(text(f, "portfolio"), false),
                          channelProfiles: channelProfiles(
                            text(f, "channelProfiles"),
                          ),
                          language: text(f, "language"),
                          region: text(f, "region"),
                        },
                        ...workspace.creators,
                      ],
                    }),
                  )}
                >
                  <Field label="활동 이름">
                    <input name="name" required maxLength={100} />
                  </Field>
                  <Field label="활동 채널">
                    <ChannelField />
                  </Field>
                  <Field label="활동 분야·소개">
                    <textarea name="topic" required maxLength={2000} rows={4} />
                  </Field>
                  <Field label="추가 채널 (채널명 | 주소, 한 줄씩)">
                    <textarea
                      name="channelProfiles"
                      rows={3}
                      placeholder="유튜브 | https://..."
                    />
                  </Field>
                  <Field label="활동 언어 (선택)">
                    <input name="language" maxLength={100} />
                  </Field>
                  <Field label="활동 지역 (선택)">
                    <input name="region" maxLength={100} />
                  </Field>
                  <Field label="채널·대표 콘텐츠 주소 (선택)">
                    <input name="portfolio" type="url" placeholder="https://" />
                  </Field>
                  <p className="hint">
                    직접 등록한 프로필입니다. 계정 소유 인증이나 팔로워 수
                    검증은 연결되지 않았습니다.
                  </p>
                </FormPanel>
              </div>
            </>
          )}

          {page === "library" && (
            <>
              {search}
              <div className="inline-fields">
                <Field label="자료 분류 필터">
                  <select
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                  >
                    <option value="">전체 분류</option>
                    {[
                      ...new Set(
                        workspace.assets.map((a) => a.folder).filter(Boolean),
                      ),
                    ].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={templatesOnly}
                    onChange={(e) => setTemplatesOnly(e.target.checked)}
                  />
                  템플릿만 보기
                </label>
              </div>
              <div className="split">
                <section className="record-list" aria-label="콘텐츠 목록">
                  {assets.length ? (
                    assets.map((a) => (
                      <article className="panel record" key={a.id}>
                        <div className="record-top">
                          <span className="pill">{a.channel}</span>
                          <span className="muted">{a.business}</span>
                        </div>
                        <h2>{a.title}</h2>
                        <p className="preserve content-preview">{a.content}</p>
                        {recordControls("assets", a.id)}
                        <div className="tag-list">
                          {a.folder && <span className="pill">{a.folder}</span>}
                          {a.isTemplate && <span className="pill">템플릿</span>}
                          {a.tags?.map((t) => <span key={t}>#{t}</span>)}
                        </div>
                        <button
                          className="text-button"
                          onClick={() => {
                            setStudioProduct(a.title);
                            setStudioBusiness(a.business);
                            setStudioChannel(a.channel);
                            setStudioFacts(a.content);
                            setDraft("");
                            location.hash = "studio";
                          }}
                        >
                          제작 도구에서 활용 ↗
                        </button>
                        <AssetResources
                          asset={a}
                          spaceId={remote?.spaceId}
                          readOnly={readOnly}
                          onRestore={(v) =>
                            persist({
                              ...workspace,
                              assets: workspace.assets.map((row) =>
                                row.id === a.id
                                  ? { ...v, id: a.id, createdAt: a.createdAt }
                                  : row,
                              ),
                            })
                          }
                        />
                        <div className="usage">
                          <strong>사용 범위</strong>
                          <p>{a.usage}</p>
                        </div>
                        <div className="record-actions">
                          <button
                            className="text-button"
                            onClick={() =>
                              download(
                                `${a.title.replace(/[^\p{L}\p{N}\s_-]/gu, "").slice(0, 80) || "content"}.txt`,
                                `${a.title}\n${a.business} · ${a.channel}\n\n${a.content}\n\n사용 범위: ${a.usage}`,
                              )
                            }
                          >
                            문구 내려받기 ↓
                          </button>
                          {a.url && (
                            <External href={a.url}>원본 자료 보기</External>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <Empty title="활용할 자료를 모아보세요">
                      제품 설명, 홍보 문구, 원본 자료 링크를 등록하세요.
                    </Empty>
                  )}
                </section>
                <FormPanel
                  title="콘텐츠 자료 등록"
                  permissionReadOnly={remote?.role === "viewer"}
                  disabled={readOnly}
                  onSubmit={submit((f) =>
                    persist({
                      ...workspace,
                      assets: [
                        {
                          ...base(),
                          title: required(f, "title"),
                          business: required(f, "business"),
                          channel: selectedChannel(f),
                          content: required(f, "content"),
                          url: webUrl(text(f, "url"), false),
                          usage: required(f, "usage"),
                          folder: text(f, "folder"),
                          tags: parseTags(text(f, "tags")),
                          isTemplate: f.has("isTemplate"),
                        },
                        ...workspace.assets,
                      ],
                    }),
                  )}
                >
                  <Field label="자료 제목">
                    <input name="title" required maxLength={160} />
                  </Field>
                  <Field label="제공자·브랜드">
                    <input name="business" required maxLength={120} />
                  </Field>
                  <Field label="활용 채널">
                    <ChannelField />
                  </Field>
                  <Field label="내용·제품 정보">
                    <textarea
                      name="content"
                      required
                      maxLength={10000}
                      rows={5}
                    />
                  </Field>
                  <Field label="원본 자료 주소 (선택)">
                    <input name="url" type="url" placeholder="https://" />
                  </Field>
                  <Field label="자료 분류 (선택)">
                    <input
                      name="folder"
                      maxLength={100}
                      placeholder="브랜드 · 제품 · 프로젝트"
                    />
                  </Field>
                  <Field label="태그 (쉼표로 구분)">
                    <input name="tags" maxLength={310} />
                  </Field>
                  <Field label="재사용 템플릿으로 보관">
                    <input name="isTemplate" type="checkbox" />
                  </Field>
                  <Field label="사용 범위·출처">
                    <textarea
                      name="usage"
                      required
                      maxLength={2000}
                      rows={3}
                      placeholder="편집 가능 여부, 기간, 출처 등을 적어 주세요."
                    />
                  </Field>
                  <p className="hint">
                    {remote
                      ? "이 공동공간의 참여자가 함께 이용하는 자료실입니다."
                      : "이 브라우저의 자료실입니다. 서버 공동공간을 선택하면 참여자와 공유할 수 있습니다."}
                  </p>
                </FormPanel>
              </div>
            </>
          )}

          {page === "studio" && (
            <>
              <div className="split studio">
                <section className="panel">
                  <span className="pill">문구·구성안 템플릿</span>
                  <h2>제품 정보를 콘텐츠의 시작으로</h2>
                  <p className="muted">
                    입력한 정보로 구성하는 템플릿 도구입니다. AI 호출이나 사실
                    검증은 수행하지 않습니다.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      act(() => {
                        setDraft(
                          contentDraft(
                            required(f, "product"),
                            required(f, "facts"),
                            studioChannel,
                          ),
                        );
                      });
                    }}
                  >
                    <Field label="보관 자료에서 시작 (선택)">
                      <select
                        value=""
                        onChange={(e) => {
                          const a = workspace.assets.find(
                            (a) => a.id === e.target.value,
                          );
                          if (a) {
                            setStudioProduct(a.title);
                            setStudioBusiness(a.business);
                            setStudioChannel(a.channel);
                            setStudioFacts(a.content);
                            setDraft("");
                          }
                        }}
                      >
                        <option value="">자료 선택</option>
                        {workspace.assets.map((a) => (
                          <option value={a.id} key={a.id}>
                            {a.title}
                            {a.isTemplate ? " · 템플릿" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="제품·서비스 이름">
                      <input
                        name="product"
                        required
                        maxLength={120}
                        value={studioProduct}
                        onChange={(e) => setStudioProduct(e.target.value)}
                      />
                    </Field>
                    <Field label="제공자·브랜드">
                      <input
                        required
                        maxLength={120}
                        value={studioBusiness}
                        onChange={(e) => setStudioBusiness(e.target.value)}
                      />
                    </Field>
                    <Field label="게시 채널">
                      <select
                        value={studioChannel}
                        onChange={(e) =>
                          setStudioChannel(e.target.value as Channel)
                        }
                      >
                        {channels.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="전달할 사실 정보">
                      <textarea
                        name="facts"
                        required
                        maxLength={5000}
                        value={studioFacts}
                        onChange={(e) => setStudioFacts(e.target.value)}
                        rows={5}
                        placeholder="제품의 특징과 사용 방법 등 확인된 정보를 입력하세요."
                      />
                    </Field>
                    <button className="button primary">구성안 만들기</button>
                  </form>
                </section>
                <section className="panel">
                  <h2>나의 콘텐츠 초안</h2>
                  {draft ? (
                    <>
                      <Field label="구성안 편집">
                        <textarea
                          rows={16}
                          maxLength={12000}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                      </Field>
                      <div className="button-row">
                        <button
                          className="button secondary"
                          onClick={() => void copy(draft)}
                        >
                          문구 복사
                        </button>
                        <button
                          className="button primary"
                          disabled={readOnly || !draft.trim()}
                          onClick={() =>
                            act(() => {
                              if (
                                !studioProduct.trim() ||
                                !studioBusiness.trim()
                              )
                                throw new Error(
                                  "제품과 제공자 이름을 입력해 주세요.",
                                );
                              return persist(
                                {
                                  ...workspace,
                                  assets: [
                                    {
                                      ...base(),
                                      title: `${studioProduct.trim()} · ${studioChannel} 초안`,
                                      business: studioBusiness.trim(),
                                      channel: studioChannel,
                                      content: draft,
                                      url: "",
                                      usage:
                                        "초안: 게시 전 원본 자료의 권리·출처·사용 범위를 확인하세요.",
                                    },
                                    ...workspace.assets,
                                  ],
                                },
                                "콘텐츠 자료실에 저장했습니다.",
                              );
                            })
                          }
                        >
                          자료실에 저장
                        </button>
                      </div>
                    </>
                  ) : (
                    <Empty title="어떤 이야기를 들려줄까요?">
                      제품 정보를 입력하면 편집할 수 있는 초안이 나타납니다.
                    </Empty>
                  )}
                </section>
              </div>
              <section className="panel link-tool">
                <h2>나만의 홍보 링크</h2>
                <p className="muted">
                  목적지 주소에 홍보자·제안별 UTM 정보를 붙입니다. 클릭 집계와
                  전환 측정은 아직 연결되지 않았습니다.
                </p>
                {hasRelations ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      act(() => {
                        const ids = relation(f),
                          p = workspace.proposals.find(
                            (p) => p.id === ids.proposalId,
                          )!,
                          c = workspace.creators.find(
                            (c) => c.id === ids.creatorId,
                          )!;
                        setGeneratedLink(
                          trackingLink(p.destination, c.id, p.id, c.channel),
                        );
                      });
                    }}
                  >
                    <div className="inline-fields">
                      {relations}
                      <button className="button secondary" type="submit">
                        홍보 링크 만들기
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="hint">
                    먼저 <a href="#proposals">홍보 제안</a>과{" "}
                    <a href="#creators">홍보자</a>를 등록해 주세요.
                  </p>
                )}
                {generatedLink && (
                  <>
                    <Field label="생성한 홍보 링크">
                      <textarea readOnly value={generatedLink} rows={3} />
                    </Field>
                    <button
                      className="button secondary"
                      onClick={() => void copy(generatedLink)}
                    >
                      링크 복사
                    </button>
                  </>
                )}
              </section>
            </>
          )}

          {page === "activities" && (
            <>
              <ActivityImporter
                workspace={workspace}
                disabled={readOnly}
                onSave={(w) => persist(w)}
              />
              <div className="split">
                <section className="record-list" aria-label="활동 목록">
                  {workspace.activities.length ? (
                    workspace.activities.map((a) => (
                      <article className="panel record" key={a.id}>
                        <span className="pill">직접 등록</span>
                        <h2>
                          {
                            workspace.proposals.find(
                              (p) => p.id === a.proposalId,
                            )?.title
                          }
                        </h2>
                        <p>
                          {
                            workspace.creators.find((c) => c.id === a.creatorId)
                              ?.name
                          }{" "}
                          · 게시일 {a.publishedAt}
                        </p>
                        <External href={a.url}>게시물 보기</External>
                        {recordControls("activities", a.id)}
                        <p className="metric">
                          {a.views === null
                            ? "조회수 미입력"
                            : `조회수 ${a.views.toLocaleString()}회`}
                          <span>
                            {a.metrics?.source === "import"
                              ? "CSV로 가져온 지표 · 자동 검증하지 않은 정보"
                              : "홍보자 입력 · 자동 검증하지 않은 정보"}
                          </span>
                          {a.metrics && (
                            <span>
                              좋아요 {a.metrics.likes ?? "미입력"} · 댓글{" "}
                              {a.metrics.comments ?? "미입력"} · 공유{" "}
                              {a.metrics.shares ?? "미입력"}
                            </span>
                          )}
                        </p>
                      </article>
                    ))
                  ) : (
                    <Empty title="게시한 콘텐츠를 기록해 보세요">
                      게시물 주소와 확인한 결과를 모을 수 있습니다.
                    </Empty>
                  )}
                </section>
                <FormPanel
                  title="홍보 활동 기록"
                  permissionReadOnly={remote?.role === "viewer"}
                  disabled={readOnly || !hasRelations}
                  onSubmit={submit((f) =>
                    persist({
                      ...workspace,
                      activities: [
                        {
                          ...base(),
                          ...relation(f),
                          url: webUrl(required(f, "url")),
                          publishedAt: calendarDate(required(f, "publishedAt")),
                          assetId: text(f, "assetId") || null,
                          metrics: {
                            likes: text(f, "likes")
                              ? integer(text(f, "likes"))
                              : null,
                            comments: text(f, "comments")
                              ? integer(text(f, "comments"))
                              : null,
                            shares: text(f, "shares")
                              ? integer(text(f, "shares"))
                              : null,
                            source: "manual",
                          },
                          views: text(f, "views")
                            ? integer(text(f, "views"))
                            : null,
                        },
                        ...workspace.activities,
                      ],
                    }),
                  )}
                >
                  {!hasRelations && (
                    <p className="hint">
                      홍보 제안과 홍보자를 먼저 등록해 주세요.
                    </p>
                  )}
                  {relations}
                  <Field label="게시물 주소">
                    <input
                      name="url"
                      type="url"
                      required
                      placeholder="https://"
                    />
                  </Field>
                  <Field label="게시일">
                    <input name="publishedAt" type="date" required />
                  </Field>
                  <Field label="연결 콘텐츠 (선택)">
                    <select name="assetId">
                      <option value="">연결 안 함</option>
                      {workspace.assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="inline-fields">
                    {[
                      ["likes", "좋아요"],
                      ["comments", "댓글"],
                      ["shares", "공유"],
                    ].map(([name, title]) => (
                      <Field key={name} label={`직접 확인한 ${title} (선택)`}>
                        <input name={name} type="number" min={0} step={1} />
                      </Field>
                    ))}
                  </div>
                  <Field label="직접 확인한 조회수 (선택)">
                    <input name="views" type="number" min={0} step={1} />
                  </Field>
                  <p className="hint">
                    기록한 수치는 직접 입력한 정보로 표시됩니다. SNS 자동
                    수집·전환 측정은 연결되지 않았습니다.
                  </p>
                </FormPanel>
              </div>
            </>
          )}

          {page === "reports" && <PerformanceReports workspace={workspace} />}
          {page === "settlements" && (
            <>
              <PaymentImporter
                workspace={workspace}
                disabled={settlementDisabled}
                onSave={(w) => persist(w)}
              />
              <div className="inline-fields">
                <Field label="정산 등록 월">
                  <input
                    type="month"
                    value={settlementMonth}
                    onChange={(e) => setSettlementMonth(e.target.value)}
                  />
                </Field>
                <Field label="정산 상태 필터">
                  <select
                    value={settlementStatus}
                    onChange={(e) => setSettlementStatus(e.target.value)}
                  >
                    <option value="">전체</option>
                    <option value="recorded">미지급 기록</option>
                    <option value="paid">외부 지급 기록</option>
                  </select>
                </Field>
              </div>
              <div className="settlement-summary">
                <div>
                  <span>미지급으로 등록한 금액</span>
                  <strong>{money(pending)}</strong>
                </div>
                <button
                  className="button secondary"
                  disabled={!workspace.settlements.length}
                  onClick={() =>
                    act(() =>
                      download(
                        "partner-settlements.csv",
                        settlementCsv({
                          ...workspace,
                          settlements: shownSettlements,
                        }),
                        "text/csv;charset=utf-8",
                      ),
                    )
                  }
                >
                  정산 명세 CSV ↓
                </button>
              </div>
              <p className="hint settlement-note">
                당사자가 정한 금액을 기록하는 도구입니다. O4O가 보상을
                결정하거나 지급을 보증하지 않습니다. 실제 송금·원천징수·세금
                처리는 수행하지 않습니다.
              </p>
              <div className="split">
                <section className="record-list" aria-label="정산 목록">
                  {shownSettlements.length ? (
                    shownSettlements.map((s) => (
                      <article className="panel record" key={s.id}>
                        <div className="record-top">
                          <span
                            className={`pill ${s.status === "paid" ? "paid" : ""}`}
                          >
                            {s.status === "paid"
                              ? "외부 지급 기록됨"
                              : "미지급 기록"}
                          </span>
                          <strong>{money(s.amount)}</strong>
                        </div>
                        <h2>
                          {
                            workspace.proposals.find(
                              (p) => p.id === s.proposalId,
                            )?.title
                          }
                        </h2>
                        <p>
                          {
                            workspace.creators.find((c) => c.id === s.creatorId)
                              ?.name
                          }{" "}
                          · {s.memo}
                        </p>
                        {s.paidAt ? (
                          <p className="hint">
                            지급 기록 시각:{" "}
                            {new Date(s.paidAt).toLocaleString("ko-KR")} ·
                            이용자 직접 기록
                          </p>
                        ) : (
                          <button
                            className="button secondary"
                            disabled={settlementDisabled}
                            onClick={() =>
                              act(() => {
                                if (
                                  window.confirm(
                                    "외부에서 실제 지급한 내역을 기록할까요? 이 버튼은 송금하지 않습니다.",
                                  )
                                )
                                  return persist(
                                    {
                                      ...workspace,
                                      settlements: workspace.settlements.map(
                                        (row) =>
                                          row.id === s.id
                                            ? {
                                                ...row,
                                                status: "paid",
                                                paidAt:
                                                  new Date().toISOString(),
                                              }
                                            : row,
                                      ),
                                    },
                                    "외부 지급 내역을 기록했습니다. 실제 송금은 수행하지 않았습니다.",
                                  );
                              })
                            }
                          >
                            외부 지급 내역 기록
                          </button>
                        )}
                        <p className="hint">
                          {s.dueDate ? `지급 예정일: ${s.dueDate}` : ""}
                          {s.externalReference
                            ? ` · 외부 참조: ${s.externalReference}`
                            : ""}
                        </p>
                        {recordControls("settlements", s.id)}
                      </article>
                    ))
                  ) : (
                    <Empty title="정산 내역을 정리해 보세요">
                      외부에서 협의한 지급 금액도 기록할 수 있습니다.
                    </Empty>
                  )}
                </section>
                <FormPanel
                  title="지급 내역 등록"
                  permissionReadOnly={!!remote && remote.role !== "owner"}
                  disabled={settlementDisabled || !hasRelations}
                  onSubmit={submit((f) =>
                    persist({
                      ...workspace,
                      settlements: [
                        {
                          ...base(),
                          ...relation(f),
                          memo: required(f, "memo"),
                          amount: integer(required(f, "amount"), 1),
                          status: "recorded",
                          paidAt: null,
                          dueDate: text(f, "dueDate")
                            ? validCalendarDate(text(f, "dueDate"))
                            : null,
                          externalReference: text(f, "externalReference"),
                        },
                        ...workspace.settlements,
                      ],
                    }),
                  )}
                >
                  {!hasRelations && (
                    <p className="hint">
                      홍보 제안과 홍보자를 먼저 등록해 주세요.
                    </p>
                  )}
                  {relations}
                  <Field label="지급 내역 설명">
                    <input
                      name="memo"
                      required
                      maxLength={250}
                      placeholder="예: 콘텐츠 제작 활동비"
                    />
                  </Field>
                  <Field label="지급 예정일 (선택)">
                    <input name="dueDate" type="date" />
                  </Field>
                  <Field label="외부 지급 참조 (선택)">
                    <input name="externalReference" maxLength={250} />
                  </Field>
                  <Field label="당사자가 정한 금액 (원)">
                    <input
                      name="amount"
                      type="number"
                      required
                      min={1}
                      max={Number.MAX_SAFE_INTEGER}
                      step={1}
                    />
                  </Field>
                  <p className="hint">
                    등록은 합의·계약 체결이나 지급 확정을 뜻하지 않습니다.
                    미지급 내역으로 저장됩니다.
                  </p>
                </FormPanel>
              </div>
            </>
          )}

          <footer>
            <span>o4o partner.</span>
            <p>사업자와 크리에이터를 위한 홍보 지원 서비스</p>
            <span>
              {remote
                ? "서버 공동공간 · 실제 송금은 별도 처리"
                : "브라우저 로컬 저장"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
