import { BusinessHomeShowcase } from '@o4o/shared-space-ui';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  lazy,
  Suspense,
} from "react";
import type { PharmacyManagementClient } from "@o4o/operator-core-ui/modules/pharmacy-management";
const CooperativeBusinessOperator = lazy(
  () => import("./CooperativeBusinessOperator"),
);
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router-dom";
import {
  anonymousSession,
  canManageFederation,
  cooperativeAccess,
  storeWorkspaceUrl,
  validCooperativeSlug,
  type Cooperative,
  type SessionSnapshot,
} from "./domain";

interface AppContext {
  businessClient?: PharmacyManagementClient;
  cooperatives: readonly Cooperative[];
  session: SessionSnapshot;
  preview: boolean;
}
const Context = createContext<AppContext>({
  cooperatives: [],
  session: anonymousSession,
  preview: false,
});

function SiteLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { preview } = useContext(Context);
  return (
    <Link className={className} to={`${to}${preview ? "?preview=1" : ""}`}>
      {children}
    </Link>
  );
}

export function App({
  businessClient,
  cooperatives,
  session = anonymousSession,
  preview = false,
}: {
  businessClient?: PharmacyManagementClient;
  cooperatives: readonly Cooperative[];
  session?: SessionSnapshot;
  preview?: boolean;
}) {
  const context = useMemo(
    () => ({ cooperatives, session, preview, businessClient }),
    [cooperatives, session, preview, businessClient],
  );
  return (
    <Context.Provider value={context}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<FederationHome />} />
          <Route path="cooperatives" element={<Directory />} />
          <Route path="about" element={<FederationAbout />} />
          <Route path="operator" element={<FederationManagement />} />
          <Route path=":cooperativeSlug" element={<CooperativeLayout />}>
            <Route index element={<CooperativeHome />} />
            <Route path="membership" element={<Membership />} />
            <Route
              path="community"
              element={<MemberSection kind="community" />}
            />
            <Route
              path="materials"
              element={<MemberSection kind="materials" />}
            />
            <Route path="services" element={<Services />} />
            <Route path="operator" element={<CooperativeManagement />} />
            <Route
              path="operator/contents/new"
              element={<CooperativeManagement editor />}
            />
            <Route
              path="operator/contents/:id/edit"
              element={<CooperativeManagement editor />}
            />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Context.Provider>
  );
}

function Layout() {
  const { preview, session } = useContext(Context);
  const location = useLocation();
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a href="#main" className="skip-link">
        본문으로 이동
      </a>
      <div className="topline">
        <div className="container">
          약국의 협력, 조합의 자율, 함께 만드는 연결
        </div>
      </div>
      <header className="site-header">
        <div className="container header-row">
          <SiteLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ＋
            </span>
            <span>
              약국 협동조합<span className="brand-sub">연합회</span>
            </span>
          </SiteLink>
          <nav aria-label="연합회 메뉴">
            <SiteLink to="/">연합회 홈</SiteLink>
            <SiteLink to="/cooperatives">소속 협동조합</SiteLink>
            <SiteLink to="/about">연합회 소개</SiteLink>
            {canManageFederation(session) && (
              <SiteLink to="/operator">연합회 운영</SiteLink>
            )}
          </nav>
          <span className="account-status">
            {session.userId ? "로그인됨" : <><span>로그인 후 조합 이용</span>{" · "}<a href="https://neture.co.kr/signup">회원가입</a></>}
          </span>
        </div>
      </header>
      {preview && (
        <div role="status" className="preview-banner">
          구조 미리보기 · 예시 조합입니다. 가입·승인·게시물은 저장되지 않습니다.
        </div>
      )}
      <main id="main" className="container main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-row">
          <div>
            <strong>약국 협동조합 연합회</strong>
            <p>각 조합의 자율적인 운영을 연결합니다.</p>
          </div>
          <span>서비스 기본 구조 · 가입 접수 준비 중</span>
        </div>
      </footer>
    </>
  );
}

function FederationHome() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">함께하는 약국, 연결되는 협동조합</p>
          <h1>
            조합의 힘을 모아,
            <br />
            약국의 내일을 함께.
          </h1>
          <p className="hero-description">
            각 협동조합의 자율성을 지키며
            <br />더 나은 약국 경영과 협력의 기반을 만들어갑니다.
          </p>
          <div className="actions">
            <SiteLink className="button light" to="/cooperatives">
              소속 협동조합 찾기 <span aria-hidden="true">↗</span>
            </SiteLink>
            <SiteLink className="hero-link" to="/about">
              연합회 알아보기 →
            </SiteLink>
          </div>
        </div>
        <div
          className="hero-network"
          aria-label="연합회와 개별 협동조합의 연결"
        >
          <div className="network-center">
            협동조합
            <br />
            <strong>연합회</strong>
          </div>
          <div className="network-row">
            <span>협동조합</span>
            <span>협동조합</span>
            <span>협동조합</span>
          </div>
          <p>독립적으로 운영하고, 함께 연결됩니다.</p>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">우리의 운영 구조</p>
            <h2>각자의 역할에 집중하는 협력</h2>
          </div>
        </div>
        <div className="cards three">
          <InfoCard
            number="01"
            title="연합회"
            text="개별 협동조합의 가입과 소속을 관리하고, 연합회 공동 업무를 수행합니다."
          />
          <InfoCard
            number="02"
            title="개별 협동조합"
            text="조합의 기준에 따라 개인 조합원을 모집하고 회원·자료·서비스를 직접 운영합니다."
          />
          <InfoCard
            number="03"
            title="개인 조합원"
            text="약사와 비약사 모두 조합별 자격에 따라 참여하며, 여러 조합에 함께 가입할 수 있습니다."
          />
        </div>
      </section>
      <Directory compact />
      <section className="store-callout">
        <div>
          <p className="eyebrow">약국 경영자 공통 공간</p>
          <h2>조합 활동과 매장 업무를 연결합니다.</h2>
          <p>
            조합의 자료와 서비스를 활용하고, 실제 약국 업무는 기존 내 매장에서
            이어갑니다.
          </p>
        </div>
        <a className="button outline" href={storeWorkspaceUrl}>
          내 매장으로 이동 ↗
        </a>
      </section>
    </>
  );
}

function InfoCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="card">
      <span className="card-number">{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Directory({ compact = false }: { compact?: boolean }) {
  const { cooperatives } = useContext(Context);
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">소속 협동조합</p>
          {compact ? (
            <h2>함께하는 협동조합</h2>
          ) : (
            <h1>나에게 맞는 협동조합 찾기</h1>
          )}
          <p>
            가입 자격과 서비스는 조합별로 확인하세요. 여러 조합에 참여할 수
            있습니다.
          </p>
        </div>
        {compact && <SiteLink to="/cooperatives">전체 보기 →</SiteLink>}
      </div>
      {cooperatives.length ? (
        <div className="cards two">
          {cooperatives.map((cooperative) => (
            <article className="card coop-card" key={cooperative.id}>
              <span className="tag">협동조합</span>
              <h3>{cooperative.name}</h3>
              <p>{cooperative.introduction}</p>
              <SiteLink className="text-link" to={`/${cooperative.slug}`}>
                조합 공간 방문 →
              </SiteLink>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="등록된 협동조합이 없습니다."
          text="소속 협동조합 정보가 연결되면 이곳에서 확인할 수 있습니다."
        />
      )}
    </section>
  );
}

function FederationAbout() {
  return (
    <section className="section narrow">
      <p className="eyebrow">연합회 소개</p>
      <h1>조합의 자율을 바탕으로 연결합니다.</h1>
      <p className="lead">
        연합회는 개별 협동조합의 가입과 소속을 관리하며, 협동조합들이 함께
        수행할 연합회 업무를 담당합니다.
      </p>
      <div className="card">
        <h2>개별 조합이 직접 운영합니다</h2>
        <p>
          조합원 가입 자격, 회원관리, 게시판과 자료, 조합의 서비스는 각
          협동조합이 운영합니다.
        </p>
        <h2>조합원은 개인입니다</h2>
        <p>
          약사 여부와 가입 자격은 각 조합의 기준을 따릅니다. 한 사람이 여러
          조합에 가입할 수 있습니다.
        </p>
      </div>
      <Empty
        title="연합회 가입 절차 준비 중"
        text="조합의 가입 신청·심사 절차와 연합회 세부 업무는 추가 협의 후 연결합니다."
      />
    </section>
  );
}

function CooperativeLayout() {
  const { cooperativeSlug = "" } = useParams();
  const { cooperatives, preview } = useContext(Context);
  const cooperative = validCooperativeSlug(cooperativeSlug)
    ? cooperatives.find((row) => row.slug === cooperativeSlug)
    : undefined;
  if (!cooperative) return <NotFound />;
  const base = `/${cooperative.slug}`;
  return (
    <>
      <div className="breadcrumb">
        <SiteLink to="/cooperatives">소속 협동조합</SiteLink>
        <span aria-hidden="true">/</span>
        <span>{cooperative.name}</span>
      </div>
      <section className="coop-heading">
        <p className="eyebrow">개별 협동조합 공간</p>
        <h1>{cooperative.name}</h1>
        <p>{cooperative.introduction}</p>
      </section>
      <nav className="coop-nav" aria-label="협동조합 메뉴">
        {[
          ["", "조합 홈"],
          ["/membership", "가입·내 참여"],
          ["/community", "회원 게시판"],
          ["/materials", "조합 자료"],
          ["/services", "서비스"],
          ["/operator", "조합 운영"],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            end
            to={`${base}${path}${preview ? "?preview=1" : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={cooperative} />
    </>
  );
}

function CooperativeHome() {
  const cooperative = useOutletContext<Cooperative>();
  const { businessClient, session } = useContext(Context);
  const access = cooperativeAccess(session, cooperative.id);
  return (
    <section className="section">
      <div className="member-welcome">
        <div>
          <p className="eyebrow">경험을 나누고, 함께 성장하는 공간</p>
          <h2>조합의 소식과 필요한 자료를 한곳에서.</h2>
          <p>회원 활동은 조합에서, 약국 경영 업무는 내 매장에서 이어갑니다.</p>
        </div>
        <SiteLink className="button" to={`/${cooperative.slug}/membership`}>
          가입 자격 확인 →
        </SiteLink>
      </div>
      {businessClient && cooperative.businessKey && <BusinessHomeShowcase client={businessClient} businessKey={cooperative.businessKey} accountId={session.userId ?? undefined} cooperative operator={access.canManage} />}
      <div className="cards two">
        <div className="card">
          <h2>조합 공지</h2>
          <p>이 조합의 공지 데이터가 연결되면 표시합니다.</p>
        </div>
        <div className="card">
          <h2>회원들의 이야기</h2>
          <p>승인된 조합원과 소식을 나누는 게시판입니다.</p>
          <SiteLink className="text-link" to={`/${cooperative.slug}/community`}>
            게시판 이용 안내 →
          </SiteLink>
        </div>
      </div>
      <div className="card spaced">
        <h2>조합 자료</h2>
        <p>조합에서 제공하는 사업 자료와 약국 경영 지원 콘텐츠를 확인합니다.</p>
        <SiteLink className="text-link" to={`/${cooperative.slug}/materials`}>
          자료 이용 안내 →
        </SiteLink>
      </div>
    </section>
  );
}

function Membership() {
  const cooperative = useOutletContext<Cooperative>();
  const { session } = useContext(Context);
  const { status } = cooperativeAccess(session, cooperative.id);
  const statusLabels = {
    pending: "심사 대기",
    active: "가입 승인",
    rejected: "반려",
    suspended: "이용 정지",
    withdrawn: "탈퇴",
  };
  const emptyTitle = session.userId ? "미가입" : "로그인 후 가입 상태 확인";
  return (
    <section className="section narrow">
      <h2>가입 자격과 내 참여 상태</h2>
      <div className="card">
        <h3>이 조합의 가입 자격</h3>
        <p>{cooperative.eligibilityDescription}</p>
        <p>개인 자격으로 가입하며, 다른 조합 가입 여부와 별도로 심사합니다.</p>
      </div>
      <Empty
        title={status ? statusLabels[status] : emptyTitle}
        text="조합 가입과 약국 내 매장 자격은 별개입니다. 가입 신청의 실제 저장과 심사는 아직 연결되지 않았습니다."
      />
    </section>
  );
}

function MemberSection({ kind }: { kind: "community" | "materials" }) {
  const cooperative = useOutletContext<Cooperative>();
  const { session, businessClient } = useContext(Context);
  const access = cooperativeAccess(session, cooperative.id);
  const allowed = access.isMember || access.canManage;
  return (
    <section className="section">
      <h2>{kind === "community" ? "회원 게시판" : "조합 자료"}</h2>
      {kind === 'materials' && allowed && businessClient && cooperative.businessKey ?
        <BusinessHomeShowcase client={businessClient} businessKey={cooperative.businessKey} accountId={session.userId ?? undefined} cooperative operator={access.canManage} only="content" /> :
      <Empty
        title={
          allowed
            ? "데이터 연결 준비 중"
            : "이 조합의 참여 자격을 확인해야 합니다."
        }
        text={
          allowed
            ? "이 조합에 속한 게시글과 자료만 조회하도록 연결합니다."
            : "다른 조합의 가입·운영 자격으로 이 공간을 이용할 수 없습니다."
        }
      />}
      <SiteLink className="text-link" to={`/${cooperative.slug}/membership`}>
        가입·내 참여 확인 →
      </SiteLink>
    </section>
  );
}

function Services() {
  return (
    <section className="section">
      <h2>조합 서비스와 약국 경영지원</h2>
      <p className="lead">
        각 조합이 제공할 서비스를 직접 관리하고, 약국 경영자 공통 업무는 기존 내
        매장을 이용합니다.
      </p>
      <div className="cards three">
        <InfoCard
          number="01"
          title="제품·공급"
          text="제품 활용과 공급·발주 업무를 기존 내 매장에 연결합니다."
        />
        <InfoCard
          number="02"
          title="자료·콘텐츠"
          text="조합 자료, 블로그, POP, QR 등 약국 경영지원 기능을 활용합니다."
        />
        <InfoCard
          number="03"
          title="매장 운영"
          text="태블릿, 사이니지, 약국 정보 관리를 기존 내 매장에서 이어갑니다."
        />
      </div>
      <div className="store-callout">
        <div>
          <h3>내 매장 이용 자격은 별도로 확인합니다.</h3>
          <p>
            조합 가입만으로 매장 권한을 부여하지 않습니다. 약사이면서 약국
            경영자인 사람의 매장 이용 자격은 기존 서비스에서 확인합니다.
          </p>
        </div>
        <a className="button" href={storeWorkspaceUrl}>
          내 매장으로 이동 ↗
        </a>
      </div>
    </section>
  );
}

function FederationManagement() {
  const { session } = useContext(Context);
  return (
    <section className="section">
      <h1>연합회 운영</h1>
      <Empty
        title={
          canManageFederation(session)
            ? "조합 가입·소속 관리 연결 준비 중"
            : "연합회 운영 권한이 필요합니다."
        }
        text="개별 조합의 가입과 연합회 업무를 담당하는 공간입니다. 조합 운영 권한과 별도로 확인합니다."
      />
    </section>
  );
}

function CooperativeManagement({
  editor = false,
}: Readonly<{ editor?: boolean }>) {
  const cooperative = useOutletContext<Cooperative>();
  const { session, businessClient } = useContext(Context);
  const { canManage } = cooperativeAccess(session, cooperative.id);
  if (canManage && cooperative.businessKey && businessClient)
    return (
      <Suspense fallback={<p>업무 화면을 불러오고 있습니다…</p>}>
        <CooperativeBusinessOperator
          key={cooperative.id}
          businessKey={cooperative.businessKey}
          slug={cooperative.slug}
          client={businessClient}
          editor={editor}
        />
      </Suspense>
    );
  return (
    <section className="section">
      <h2>조합 운영</h2>
      {canManage ? (
        <div className="cards two">
          <InfoCard
            number="01"
            title="조합원 관리"
            text="이 조합의 개인 가입 신청·심사·회원 상태 관리를 연결할 공간입니다."
          />
          <InfoCard
            number="02"
            title="서비스 관리"
            text="이 조합의 공지·게시판·자료·서비스 관리를 연결할 공간입니다."
          />
        </div>
      ) : (
        <Empty
          title="이 조합의 운영 권한이 필요합니다."
          text="연합회 운영자나 다른 조합의 운영자라는 이유만으로 접근할 수 없습니다."
        />
      )}
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ◇
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function NotFound() {
  return (
    <section className="section narrow">
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>등록된 조합 주소와 메뉴를 확인해 주세요.</p>
      <SiteLink className="button" to="/cooperatives">
        협동조합 목록으로
      </SiteLink>
    </section>
  );
}
