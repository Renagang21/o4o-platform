import { initialHomePresentation, type HomeSurface } from '@o4o/types';

/** Presentation only. The business key selects a visual identity, never an access scope. */
export type HeroIdentity = HomeSurface | 'drugstore';
export const heroIdentity = (surface: HomeSurface, businessKey?: string): HeroIdentity =>
  surface === 'pharmacy' && businessKey === 'drugstore' ? 'drugstore' : surface;

export function initialIdentityPresentation(surface: HomeSurface, businessKey?: string) {
  const config = initialHomePresentation(surface);
  if (heroIdentity(surface, businessKey) !== 'drugstore') {
    const copy: Partial<Record<HomeSurface, { title?: string; description?: string; secondTitle?: string }>> = {
      supplier: { secondTitle: '제품의 특징을 매장에 전하세요' },
      funding: { title: '새로운 제품, 참여 조건부터 살펴보세요', description: '제품 소개와 사업별 참여 조건을 확인하고, 나에게 맞는 유통 기회를 검토하세요.' },
      community: { title: '현장의 질문에, 서로의 경험으로', description: '궁금한 점을 묻고, 현장에서 얻은 경험과 도움이 되는 자료를 나누세요.' },
      carepharm: { title: '관리 자료를 나누고, 약국의 협업을 잇습니다' },
      lecture: { title: '배운 지식을, 현장에서 쓰는 힘으로' },
    };
    const text = copy[surface];
    if (!text) return config;
    return { ...config, slides: config.slides.map((item, index) => ({
      ...item, title: index === 0 ? text.title ?? item.title : text.secondTitle ?? item.title,
      description: index === 0 ? text.description ?? item.description : item.description,
    })) };
  }
  return {
    ...config,
    slides: config.slides.map((item, index) => ({
      ...item, eyebrow: '드럭스토어형 약국',
      title: index === 0 ? '사업 소식과 제품 자료, 가입 약국과 함께' : '필요한 사업 자료를 내 약국에서',
      description: index === 0 ? '드럭스토어형 약국 사업자의 운영 소식과 제품 자료를 확인하고 가입 약국의 활동을 이어가세요.' : '공유된 자료와 참여 조건을 확인하고, 이용 가능한 업무는 내 약국에서 이어갑니다.',
    })),
    promotions: config.promotions.map(item => ({...item, eyebrow:'드럭스토어형 약국', title:'드럭스토어형 약국 사업 안내', description:'사업 소식과 제품·운영 자료를 공유하는 가입 약국의 공동공간'})),
  };
}

export const HERO_DESIGN: Record<HeroIdentity, { name: string; guidance: string; image: string }> = {
  neture: { name: '서비스 연결', guidance: '여러 서비스 중 무엇을 찾고 어떤 업무를 이어갈 수 있는지 한 문장으로 알려 주세요.', image: '서비스 연결을 보여주는 이미지나 대표 서비스 화면' },
  supplier: { name: '제품과 공급', guidance: '제품의 특징, 제공할 콘텐츠, 매장과의 협업 내용을 구체적으로 소개해 주세요.', image: '제품 패키지·활용 장면·공급 콘텐츠 이미지' },
  funding: { name: '제품과 참여 조건', guidance: '소개할 제품과 확인할 참여 조건을 명확히 적어 주세요. 실제 모집 상태는 사업 상세에서 확인하도록 연결하세요.', image: '제품과 사용 맥락이 보이는 프로젝트 이미지' },
  lecture: { name: '강의와 학습', guidance: '배울 주제와 대상, 학습 후 활용할 업무를 소개하고 실제 강의로 연결해 주세요.', image: '강의 표지·수업 자료·학습 주제 이미지' },
  community: { name: '질문과 경험', guidance: '함께 나눌 질문·경험·자료를 소개해 주세요. 공개할 수 있는 콘텐츠만 사용하세요.', image: '대화·현장 활동·관심 주제를 보여주는 이미지' },
  carepharm: { name: '관리 자료와 약국 협업', guidance: '사업 소식과 약국이 활용할 관리 자료를 소개해 주세요. 환자 정보나 확인되지 않은 건강 성과는 넣지 마세요.', image: '관리 자료·교육·약국 협업 이미지' },
  pharmacy: { name: '본부와 가입 약국', guidance: '가입 약국에 필요한 본부 소식과 사업 자료를 소개해 주세요. 게시한 내용만 공동공간에 표시됩니다.', image: '본부의 실제 사업 소식·공유 자료 이미지' },
  drugstore: { name: '드럭스토어형 약국 협력사업', guidance: '이 사업의 운영 소식과 제품 자료를 소개해 주세요. 실제 운영 정보는 해당 사업의 담당 범위에서 확인하세요.', image: '사업 운영 현장·제품·활용 자료 이미지' },
  pharmcoop: { name: '협동조합의 연결', guidance: '연합회의 소식과 협동조합 공동 활동을 소개해 주세요. 개별 조합 소식은 각 조합에서 관리합니다.', image: '연합회 공동 활동·협동조합 협력 이미지' },
  cooperative: { name: '우리 조합의 소식', guidance: '우리 조합의 소식과 참여 안내를 소개해 주세요. 공개 가능한 내용만 게시합니다.', image: '우리 조합의 활동·참여 안내 이미지' },
  branch: { name: '지역 회원의 소식', guidance: '우리 분회의 공지·행사·자료를 소개하고 실제 일정이나 게시글로 연결해 주세요.', image: '지역 회원 활동·행사 안내 이미지' },
};

/** Decorative, illustrative content only: no invented metrics, members, products or outcomes. */
export function HeroArtwork({ identity }: { identity: HeroIdentity }) {
  return <div className={`home-hero-visual home-hero-visual-${identity}`} aria-hidden="true">
    <svg viewBox="0 0 400 280" fill="none" focusable="false">
      {identity === 'neture' ? <>
        <path d="M94 67L202 140L311 55M202 140L328 218M202 140L72 219" className="hero-art-line" />
        <circle cx="202" cy="140" r="53" className="hero-art-primary" /><text x="202" y="148" textAnchor="middle" className="hero-art-on-primary hero-art-large">O4O</text>
        {[[94,67,'AI'],[311,55,'서비스'],[328,218,'내 매장'],[72,219,'My Home']].map(([x,y,label])=><g key={String(label)}><circle cx={x} cy={y} r="38" className="hero-art-paper"/><text x={x} y={Number(y)+5} textAnchor="middle" className={label==='My Home'?'hero-art-ink hero-art-small':'hero-art-ink'}>{label}</text></g>)}
      </> : identity === 'pharmcoop' || identity === 'cooperative' ? <>
        <path d="M90 65L200 145L310 65M200 145L90 225M200 145L310 225" className="hero-art-line" />
        <circle cx="200" cy="145" r="57" className="hero-art-primary" />
        <text x="200" y="151" textAnchor="middle" className="hero-art-on-primary">{identity === 'pharmcoop' ? '연합회' : '우리 조합'}</text>
        {[[90,65],[310,65],[90,225],[310,225]].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="37" className="hero-art-paper" /><text x={x} y={y+5} textAnchor="middle" className="hero-art-ink">{identity === 'pharmcoop' ? '협동조합' : '조합원'}</text></g>)}
      </> : identity === 'supplier' ? <>
        <rect x="27" y="40" width="230" height="194" rx="20" className="hero-art-paper"/>
        <rect x="50" y="64" width="83" height="96" rx="12" className="hero-art-soft"/><path d="M73 90H110V137H73zM82 80H101V91H82z" className="hero-art-primary"/>
        <path d="M154 83H230M154 103H210M154 135H221M51 186H226M51 207H172" className="hero-art-line"/>
        <rect x="236" y="153" width="138" height="88" rx="16" className="hero-art-primary"/><text x="305" y="190" textAnchor="middle" className="hero-art-on-primary">제품 · 콘텐츠</text><text x="305" y="215" textAnchor="middle" className="hero-art-on-primary">매장과 연결</text>
      </> : identity === 'funding' ? <>
        <rect x="49" y="30" width="283" height="180" rx="20" transform="rotate(-5 49 30)" className="hero-art-soft"/>
        <rect x="64" y="49" width="283" height="180" rx="20" className="hero-art-paper"/>
        <rect x="85" y="72" width="78" height="89" rx="12" className="hero-art-primary"/><path d="M104 94L124 84L145 94V136L124 147L104 136z" className="hero-art-light-line"/>
        <text x="183" y="94" className="hero-art-ink">새로운 제품</text><path d="M183 114H318M183 133H284" className="hero-art-line"/>
        <rect x="84" y="183" width="244" height="56" rx="12" className="hero-art-primary"/><text x="206" y="217" textAnchor="middle" className="hero-art-on-primary">제품 소개 → 참여 조건 확인</text>
      </> : identity === 'lecture' ? <>
        <rect x="35" y="41" width="262" height="176" rx="18" className="hero-art-paper"/><rect x="51" y="57" width="230" height="133" rx="12" className="hero-art-primary"/>
        <path d="M151 94L190 121L151 148z" className="hero-art-play"/><path d="M67 203H170" className="hero-art-line"/>
        <rect x="216" y="158" width="145" height="90" rx="14" className="hero-art-soft"/><text x="288" y="190" textAnchor="middle" className="hero-art-ink">배운 내용을</text><text x="288" y="217" textAnchor="middle" className="hero-art-ink">현장 업무로</text>
      </> : identity === 'community' ? <>
        <path d="M38 46H269Q287 46 287 64V133Q287 151 269 151H91L60 178V151H38Q20 151 20 133V64Q20 46 38 46z" className="hero-art-paper"/>
        <text x="63" y="88" className="hero-art-ink hero-art-large">어떻게 하세요?</text><path d="M62 115H235" className="hero-art-line"/>
        <path d="M161 156H362Q380 156 380 174V232Q380 250 362 250H333V270L307 250H161Q143 250 143 232V174Q143 156 161 156z" className="hero-art-primary"/>
        <text x="179" y="194" className="hero-art-on-primary">현장의 경험을</text><text x="179" y="221" className="hero-art-on-primary">함께 나눠요</text>
      </> : identity === 'carepharm' ? <>
        <circle cx="204" cy="138" r="105" className="hero-art-soft"/><path d="M62 152H115L137 116L165 170L192 132H260" className="hero-art-line"/>
        <rect x="245" y="63" width="117" height="139" rx="17" className="hero-art-paper"/><path d="M287 91H320M303 75V107" className="hero-art-line"/>
        <path d="M267 132H340M267 153H325M267 174H334" className="hero-art-line"/>
        <rect x="49" y="202" width="207" height="45" rx="22" className="hero-art-primary"/><text x="153" y="230" textAnchor="middle" className="hero-art-on-primary">관리 자료 · 약국 협업</text>
      </> : identity === 'branch' ? <>
        <rect x="45" y="39" width="260" height="202" rx="20" className="hero-art-paper"/><path d="M45 95H305" className="hero-art-line"/><path d="M100 24V57M250 24V57" className="hero-art-line"/>
        <text x="73" y="79" className="hero-art-ink">우리 분회 소식</text>
        {[0,1,2].map(row=>[0,1,2,3].map(col=><rect key={`${row}-${col}`} x={74+col*53} y={119+row*33} width="28" height="13" rx="5" className={(row+col)%3===0?'hero-art-primary':'hero-art-soft'}/>))}
        <rect x="227" y="175" width="151" height="67" rx="14" className="hero-art-primary"/><text x="302" y="216" textAnchor="middle" className="hero-art-on-primary">공지 · 행사 · 자료</text>
      </> : <>
        <rect x="49" y="55" width="235" height="165" rx="18" className="hero-art-paper"/><path d="M79 92H251M79 119H224M79 147H243" className="hero-art-line"/>
        <rect x="220" y="165" width="151" height="75" rx="14" className="hero-art-primary"/><text x="295" y="208" textAnchor="middle" className="hero-art-on-primary">{identity==='drugstore'?'사업 · 제품 소식':'본부 · 가입 약국'}</text>
      </>}
    </svg>
  </div>;
}
