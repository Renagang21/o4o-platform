import { useEffect, useRef, useState } from "react";
import {
  HOME_SURFACE_INFO,
  parseHomePresentation,
  type HomeMessage,
  type HomePresentation,
  type HomePresentationState,
  type HomeSurface,
} from "@o4o/types";
import {
  HomeHeroView,
  HomePromotionView,
  homePresentationManagePath,
  type HomePresentationClient,
} from "./HomePresentation";

import { HERO_DESIGN, heroIdentity, initialIdentityPresentation } from "./HomeHeroIdentity";

export interface HomePresentationEditorProps {
  surface: HomeSurface;
  client: HomePresentationClient;
  branchSlug?: string;
  businessKey?: string;
  heading?: "h1" | "h2";
}
export function HomePresentationEditor({
  surface,
  client,
  branchSlug,
  businessKey,
  heading = "h1",
}: HomePresentationEditorProps) {
  const Heading = heading;
  const design = HERO_DESIGN[heroIdentity(surface, businessKey)];
  const serviceName = surface === "pharmacy" && businessKey === "megapharm" ? "메가팜 · 창고형약국" : HOME_SURFACE_INFO[surface].name;
  const endpoint = homePresentationManagePath(surface, branchSlug, businessKey);
  const [config, setConfig] = useState<HomePresentation>(() =>
    initialIdentityPresentation(surface, businessKey),
  );
  const [revision, setRevision] = useState(0);
  const [published, setPublished] = useState<HomePresentation | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0),
    [previewPublished, setPreviewPublished] = useState(false);
  const writing = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    let active = true;
    const scopeGeneration = ++generation.current;
    setLoading(true);
    setBusy(false);
    writing.current = false;
    setLoadError(false);
    setError("");
    setNotice("");
    setDirty(false);
    void Promise.resolve()
      .then(() => client.get(endpoint))
      .then((response) => {
        const state = response.data.data as HomePresentationState;
        if (
          response.data.success !== true ||
          !Number.isSafeInteger(state?.revision) ||
          state.revision < 0
        )
          throw new Error("INVALID_RESPONSE");
        const draft = state.draft
          ? parseHomePresentation(state.draft)
          : initialIdentityPresentation(surface, businessKey);
        const live = state.published
          ? parseHomePresentation(state.published)
          : null;
        if (active) {
          setConfig(draft);
          setPublished(live);
          setRevision(state.revision);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          setError("홈 화면 구성을 불러오지 못했습니다. 다시 시도해 주세요.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      generation.current = scopeGeneration + 1;
    };
  }, [client, endpoint, retry, surface, businessKey]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (next: HomePresentation) => {
    setConfig(next);
    setDirty(true);
    setNotice("");
    setPreviewPublished(false);
  };
  const save = async (publish: boolean) => {
    if (writing.current || loading || loadError) return;
    let document: HomePresentation;
    try {
      document = parseHomePresentation(config);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    writing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const version = generation.current;
    try {
      const response = await client.put(endpoint, {
        config: document,
        revision,
        publish,
      });
      const state = response.data.data as HomePresentationState;
      if (response.data.success !== true || state?.revision !== revision + 1)
        throw new Error("INVALID_RESPONSE");
      if (generation.current !== version) return;
      setRevision(state.revision);
      setPublished(state.published);
      setDirty(false);
      setNotice(
        publish
          ? "공개 화면에 반영했습니다."
          : "초안을 저장했습니다. 공개 화면은 바뀌지 않았습니다.",
      );
    } catch (failure) {
      if (generation.current !== version) return;
      const conflict =
        (failure as { response?: { status?: number } }).response?.status ===
        409;
      setError(
        conflict
          ? "다른 운영자가 수정했습니다. 현재 입력은 보존했습니다. 다시 불러온 뒤 변경 내용을 확인해 주세요."
          : "저장하지 못했습니다. 입력은 보존했습니다. 다시 시도해 주세요.",
      );
    } finally {
      if (generation.current === version) {
        writing.current = false;
        setBusy(false);
      }
    }
  };
  const update = (
    section: "slides" | "promotions",
    id: string,
    patch: Partial<HomeMessage>,
  ) =>
    change({
      ...config,
      [section]: config[section].map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  const shift = (
    section: "slides" | "promotions",
    index: number,
    amount: number,
  ) => {
    const items = [...config[section]],
      target = index + amount;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    change({ ...config, [section]: items });
  };
  const newMessage = (section: "slides" | "promotions") =>
    change({
      ...config,
      [section]: [
        ...config[section],
        {
          ...initialIdentityPresentation(surface, businessKey).slides[0],
          id: crypto.randomUUID(),
          title: "새 안내",
          description: "",
          linkUrl: "",
          linkText: "",
        },
      ],
    });
  const preview = previewPublished ? published : config;
  return (
    <section
      className="home-presentation home-editor"
      aria-label={`${serviceName} 홈 편집`}
    >
      <header>
        <p className="home-editor-eyebrow">HOME CONTENT</p>
        <Heading>{surface === "carepharm" ? "Hero · 공개 공지 관리" : "Hero · 광고 관리"}</Heading>
        <p>
          {serviceName} ·{" "}
          {HOME_SURFACE_INFO[surface].purpose}
        </p>
      </header>
      <p className="home-editor-help">
        이곳의 안내는 공개 콘텐츠입니다. 회원 전용 자료와 개인정보는 넣지
        마세요. Hero는 서비스 안내 최대 3개입니다. {surface === "carepharm" ? "공지·안내 목록에는 현재 게시 기간에 해당하는 항목을 모두 표시합니다." : "홍보 영역은 현재 게시 기간에 해당하는 첫 번째 항목을 보여줍니다."} 광고는 광고주를 표시하며, 초기
        콘텐츠는 자체 서비스 안내입니다.
      </p>
      <aside className="home-editor-design-guide" aria-label="이 서비스의 Hero 제작 안내">
        <h2>{design.name} 디자인</h2>
        <p>{design.guidance}</p>
        <p>권장 이미지: {design.image}. 가로형 이미지를 사용하고, 중요한 내용은 가운데에 배치해 주세요. 이미지가 없으면 서비스 전용 그래픽이 표시됩니다.</p>
      </aside>
      {loading && <p role="status">홈 화면 구성을 불러오고 있습니다…</p>}
      {error && (
        <p role="alert" className="home-editor-error">
          {error}
        </p>
      )}
      <div className="home-editor-toolbar">
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("저장하지 않은 입력을 버리고 다시 불러올까요?")
            )
              setRetry((n) => n + 1);
          }}
        >
          다시 불러오기
        </button>
        <button
          type="button"
          disabled={loading || loadError || busy}
          onClick={() => void save(false)}
        >
          초안 저장
        </button>
        <button
          type="button"
          className="home-editor-publish"
          disabled={loading || loadError || busy}
          onClick={() => void save(true)}
        >
          {busy ? "저장 중…" : "공개 반영"}
        </button>
        <span>
          {dirty ? "저장하지 않은 변경 있음" : `저장 버전 ${revision}`}
        </span>
      </div>
      {notice && (
        <p role="status" className="home-editor-notice">
          {notice}
        </p>
      )}
      {!loading && !loadError && (
        <>
          <fieldset disabled={busy} className="home-editor-master">
            <label>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) =>
                  change({ ...config, enabled: event.target.checked })
                }
              />{" "}
              {surface === "carepharm" ? "Hero·공개 공지 노출 사용" : "Hero·홍보 노출 사용"}
            </label>
            <p>
              끄고 공개 반영하면 홍보를 숨깁니다. 서비스의 기본 제목과 업무
              진입은 유지됩니다.
            </p>
          </fieldset>
          {(["slides", "promotions"] as const).map((section) => (
            <section
              key={section}
              className="home-editor-section"
              aria-label={
                section === "slides"
                  ? "Hero 안내 편집"
                  : "광고·서비스 안내 편집"
              }
            >
              <div className="home-editor-section-heading">
                <h2>
                  {section === "slides"
                    ? "Hero 슬라이드"
                    : surface === "carepharm" ? "공개 공지 · 안내" : "광고 · 서비스 안내"}
                </h2>
                <button
                  type="button"
                  disabled={busy || config[section].length >= 3}
                  onClick={() => newMessage(section)}
                >
                  항목 추가
                </button>
              </div>
              {config[section].map((item, index) => (
                <fieldset
                  key={item.id}
                  disabled={busy}
                  className="home-editor-item"
                >
                  <legend>
                    {index + 1}. {item.title || "새 안내"}
                  </legend>
                  <div className="home-editor-item-tools">
                    <label>
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) =>
                          update(section, item.id, {
                            enabled: event.target.checked,
                          })
                        }
                      />{" "}
                      공개 대상
                    </label>
                    <button
                      type="button"
                      aria-label={`${index + 1}번 ${section === "slides" ? "Hero" : "홍보"} 위로`}
                      disabled={index === 0}
                      onClick={() => shift(section, index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${index + 1}번 ${section === "slides" ? "Hero" : "홍보"} 아래로`}
                      disabled={index === config[section].length - 1}
                      onClick={() => shift(section, index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        change({
                          ...config,
                          [section]: config[section].filter(
                            (row) => row.id !== item.id,
                          ),
                        })
                      }
                    >
                      삭제
                    </button>
                  </div>
                  <div className="home-editor-grid">
                    <Field
                      label="짧은 머리말"
                      value={item.eyebrow}
                      maxLength={60}
                      onChange={(eyebrow) =>
                        update(section, item.id, { eyebrow })
                      }
                    />
                    <Field
                      label="제목"
                      value={item.title}
                      maxLength={120}
                      onChange={(title) => update(section, item.id, { title })}
                    />
                    <label className="home-editor-wide">
                      설명
                      <textarea
                        value={item.description}
                        maxLength={400}
                        rows={3}
                        onChange={(event) =>
                          update(section, item.id, {
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                    <Field
                      label="이미지 주소 (선택)"
                      value={item.imageUrl}
                      maxLength={1000}
                      onChange={(imageUrl) =>
                        update(section, item.id, { imageUrl })
                      }
                    />
                    <Field
                      label="연결 주소 (선택)"
                      value={item.linkUrl}
                      maxLength={1000}
                      onChange={(linkUrl) =>
                        update(section, item.id, { linkUrl })
                      }
                    />
                    <Field
                      label="버튼 문구"
                      value={item.linkText}
                      maxLength={40}
                      onChange={(linkText) =>
                        update(section, item.id, { linkText })
                      }
                    />
                    {section === "promotions" && (
                      <>
                        <label>
                          콘텐츠 종류
                          <select
                            value={item.kind}
                            onChange={(event) =>
                              update(section, item.id, {
                                kind: event.target.value as HomeMessage["kind"],
                              })
                            }
                          >
                            <option value="service">서비스 안내</option>
                            <option value="advertisement">광고</option>
                          </select>
                        </label>
                        <Field
                          label="광고주 (광고 시 필수)"
                          value={item.sponsor}
                          maxLength={100}
                          onChange={(sponsor) =>
                            update(section, item.id, { sponsor })
                          }
                        />
                      </>
                    )}
                    <TimeField
                      label="게시 시작 (내 기기 시간)"
                      value={item.startsAt}
                      onChange={(startsAt) =>
                        update(section, item.id, { startsAt })
                      }
                    />
                    <TimeField
                      label="게시 종료 (내 기기 시간)"
                      value={item.endsAt}
                      onChange={(endsAt) =>
                        update(section, item.id, { endsAt })
                      }
                    />
                  </div>
                </fieldset>
              ))}
            </section>
          ))}
          <section
            className="home-editor-preview"
            aria-label="홈 화면 미리보기"
          >
            <div className="home-editor-section-heading">
              <h2>
                {previewPublished ? "공개본 미리보기" : "편집 중 미리보기"}
              </h2>
              <button
                type="button"
                onClick={() => setPreviewPublished((value) => !value)}
                disabled={!published}
              >
                {previewPublished ? "편집 중 보기" : "공개본 보기"}
              </button>
            </div>
            <p>
              게시 기간과 공개 대상 설정을 적용한 모습입니다. 링크를 누르면 해당
              주소로 이동합니다.
            </p>
            {preview && (
              <>
                <HomeHeroView
                  businessKey={businessKey}
                  key={`${surface}:${previewPublished}`}
                  surface={surface}
                  config={preview}
                  heading="h2"
                />
                {surface === "carepharm" ? preview.promotions.map(item => (
                  <HomePromotionView key={item.id} surface={surface} config={{ ...preview, promotions: [item] }} />
                )) : <HomePromotionView surface={surface} config={preview} />}
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
function Field({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const date = value ? new Date(value) : null;
  const local =
    date && Number.isFinite(date.getTime())
      ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16)
      : "";
  return (
    <label>
      {label}
      <input
        type="datetime-local"
        value={local}
        onChange={(event) =>
          onChange(
            event.target.value
              ? new Date(event.target.value).toISOString()
              : "",
          )
        }
      />
    </label>
  );
}
