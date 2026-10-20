import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  HOME_SURFACE_INFO,
  parseHomePresentation,
  safeHomeUrl,
  visibleHomePresentation,
  type HomeSurface,
  type HomePresentation,
} from "@o4o/types";
import "./home-presentation.css";
import { HeroArtwork, heroIdentity, initialIdentityPresentation } from "./HomeHeroIdentity";

export interface HomePresentationClient {
  get: (url: string) => Promise<{ data: { success: boolean; data: any } }>;
  put: (
    url: string,
    body: unknown,
  ) => Promise<{ data: { success: boolean; data: any } }>;
}
export function homePresentationPath(
  surface: HomeSurface,
  branchSlug?: string,
  businessKey?: string,
) {
  if (surface === "branch") {
    if (!branchSlug) throw new Error("분회를 먼저 선택해 주세요.");
    return `/kpa-branch/branches/${encodeURIComponent(branchSlug)}/home-presentation`;
  }
  return `/home-presentation/${surface}${surface === "pharmacy" && businessKey ? `/business/${encodeURIComponent(businessKey)}` : ""}`;
}
export function homePresentationManagePath(
  surface: HomeSurface,
  branchSlug?: string,
  businessKey?: string,
) {
  return surface === "branch"
    ? `/kpa-branch/branches/${encodeURIComponent(branchSlug ?? "")}/operator/home-presentation`
    : `${homePresentationPath(surface, branchSlug, businessKey)}/manage`;
}
interface PublicProps {
  surface: HomeSurface;
  client?: Pick<HomePresentationClient, "get">;
  branchSlug?: string;
  businessKey?: string;
}
function useHomePresentation({
  surface,
  client,
  branchSlug,
  businessKey,
}: PublicProps) {
  const [state, setState] = useState<{
    scope: string;
    document: HomePresentation | null;
    ready: boolean;
  }>({ scope: "", document: null, ready: false });
  const endpoint = homePresentationPath(surface, branchSlug, businessKey);
  useEffect(() => {
    let active = true;
    setState({ scope: endpoint, document: null, ready: false });
    if (typeof client?.get !== "function") return;
    let pending = false;
    const refresh = () => {
      if (pending) return;
      pending = true;
      void Promise.resolve()
        .then(() => client.get(endpoint))
        .then((response) => {
          if (response.data.success !== true)
            throw new Error("INVALID_RESPONSE");
          const document =
            response.data.data === null
              ? null
              : parseHomePresentation(response.data.data);
          if (active) setState({ scope: endpoint, document, ready: true });
        })
        .catch(() => {
          if (active)
            setState({ scope: endpoint, document: null, ready: false });
        })
        .finally(() => {
          pending = false;
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [client, endpoint]);
  const current =
    state.scope === endpoint ? state : { document: null, ready: false };
  return {
    config: current.document ?? initialIdentityPresentation(surface, businessKey),
    ready: current.ready,
    hasPublished: current.document !== null,
  };
}

interface HeroViewProps {
  surface: HomeSurface;
  businessKey?: string;
  config: HomePresentation;
  actions?: ReactNode;
  children?: ReactNode;
  heading?: "h1" | "h2";
  titleId?: string;
  fallbackTitle?: string;
  accent?: string;
  className?: string;
}
export function HomeHeroView({
  surface,
  businessKey,
  config,
  actions,
  children,
  heading = "h1",
  titleId,
  fallbackTitle,
  accent,
  className = "",
}: HeroViewProps) {
  const identity = heroIdentity(surface, businessKey);
  const identityName = identity === "megapharm" ? "메가팜 · 창고형약국" : HOME_SURFACE_INFO[surface].name;
  const [index, setIndex] = useState(0);
  const [, refreshSchedule] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => refreshSchedule((value) => value + 1),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const generatedId = useId();
  const id = titleId ?? generatedId;
  const items = visibleHomePresentation(config).slides;
  const activeIndex = Math.min(index, Math.max(items.length - 1, 0));
  const active = items[activeIndex];
  const Heading = heading;
  const move = (amount: number) =>
    setIndex((activeIndex + amount + items.length) % items.length);
  const style = {
    "--home-accent": accent ?? HOME_SURFACE_INFO[surface].accent,
    ...(accent ? { "--hero-primary": accent } : {}),
  } as CSSProperties;
  if (!active)
    return (
      <header className="home-presentation home-plain-title" style={style}>
        <Heading id={id}>
          {fallbackTitle ?? identityName}
        </Heading>
        {actions}
        {children}
      </header>
    );
  return (
    <section
      className={`home-presentation home-hero ${className}`}
      data-home-identity={identity}
      style={style}
      aria-labelledby={id}
      aria-roledescription={items.length > 1 ? "슬라이드" : undefined}
      onPointerDown={(event) => {
        if (event.pointerType === "touch")
          touch.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerCancel={() => {
        touch.current = null;
      }}
      onPointerUp={(event) => {
        const start = touch.current;
        touch.current = null;
        if (!start || items.length < 2) return;
        const dx = event.clientX - start.x,
          dy = event.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3)
          move(dx < 0 ? 1 : -1);
      }}
    >
      <div className="home-hero-main">
        <div className="home-hero-copy" aria-live="polite" aria-atomic="true">
          <p className="home-hero-eyebrow">
            {active.eyebrow || identityName}
          </p>
          <Heading id={id} className="home-hero-title">
            {active.title}
          </Heading>
          <p className="home-hero-description">{active.description}</p>
          {active.linkUrl && safeHomeUrl(active.linkUrl) && (
            <a className="home-hero-link" href={active.linkUrl}>
              {active.linkText} <span aria-hidden="true">↗</span>
            </a>
          )}
          {identity === "lecture" && actions && <div className="home-hero-actions">{actions}</div>}
        </div>
        {active.imageUrl && safeHomeUrl(active.imageUrl) ? (
          <img
            className="home-hero-image"
            src={active.imageUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <HeroArtwork identity={identity} />
        )}
      </div>
      {identity !== "lecture" && actions && <div className="home-hero-actions">{actions}</div>}
      {items.length > 1 && (
        <div className="home-hero-controls" aria-label="Hero 슬라이드 조작">
          <div className="home-hero-dots">
            {items.map((item, position) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${position + 1}번 안내 보기`}
                aria-pressed={position === activeIndex}
                onClick={() => setIndex(position)}
              >
                <span />
              </button>
            ))}
          </div>
          <span className="home-hero-count" aria-hidden="true">
            {activeIndex + 1} / {items.length}
          </span>
          <button type="button" aria-label="이전 안내" onClick={() => move(-1)}>
            ←
          </button>
          <button type="button" aria-label="다음 안내" onClick={() => move(1)}>
            →
          </button>
        </div>
      )}
      {children && <div className="home-hero-context">{children}</div>}
    </section>
  );
}
export function ServiceHomeHero(
  props: PublicProps &
    Omit<HeroViewProps, "config"> & {
      title?: readonly string[];
      description?: readonly string[];
      eyebrow?: ReactNode;
    },
) {
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const width = document.documentElement.clientWidth;
      if (!width) return;
      element.style.setProperty("--home-page-width", `${width}px`);
      element.style.setProperty(
        "--home-page-left",
        `${element.getBoundingClientRect().left}px`,
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(document.documentElement);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const { config: initial, hasPublished } = useHomePresentation(props);
  // Keep the service's established first headline and primary entry actions until an operator publishes.
  const config =
    !hasPublished && props.title
      ? {
          ...initial,
          slides: initial.slides.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  title: props.title!.join("\n"),
                  description: props.description?.join(" ") ?? item.description,
                  eyebrow:
                    typeof props.eyebrow === "string"
                      ? props.eyebrow
                      : item.eyebrow,
                }
              : item,
          ),
        }
      : initial;
  return (
    <div ref={frame} className="home-hero-frame">
      <HomeHeroView
        {...props}
        className={`home-hero-full ${props.className ?? ""}`}
        config={config}
        fallbackTitle={props.title?.join("\n")}
      />
    </div>
  );
}
export function HomePromotionView({
  surface,
  config,
}: {
  surface: HomeSurface;
  config: HomePresentation;
}) {
  const [, refreshSchedule] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => refreshSchedule((value) => value + 1),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const item = visibleHomePresentation(config).promotions[0];
  if (!item) return null;
  return (
    <aside
      className="home-presentation home-promotion"
      aria-label={item.kind === "advertisement" ? "광고" : "서비스 안내"}
      style={
        { "--home-accent": HOME_SURFACE_INFO[surface].accent } as CSSProperties
      }
    >
      {item.imageUrl && safeHomeUrl(item.imageUrl) && (
        <img src={item.imageUrl} alt="" loading="lazy" />
      )}
      <div className="home-promotion-copy">
        <p className="home-promotion-label">
          {item.kind === "advertisement"
            ? `광고 · ${item.sponsor}`
            : "서비스 안내"}
        </p>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
      {item.linkUrl && safeHomeUrl(item.linkUrl) && (
        <a href={item.linkUrl}>
          {item.linkText} <span aria-hidden="true">→</span>
        </a>
      )}
    </aside>
  );
}
export function ServiceHomePromotion(props: PublicProps & { publishedOnly?: boolean }) {
  const { config, ready, hasPublished } = useHomePresentation(props);
  return ready && (!props.publishedOnly || hasPublished) ? (
    <HomePromotionView surface={props.surface} config={config} />
  ) : null;
}
