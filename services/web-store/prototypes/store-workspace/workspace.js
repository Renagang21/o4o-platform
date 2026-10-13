"use strict";
// Standalone planning prototype: no API, storage, credentials, or AI calls.
const labels = {
  home: "내 매장 홈",
  commerce: "상품·거래",
  studio: "콘텐츠 작업실",
  use: "매장에서 활용",
};
const materialSeed = [
  {
    id: "welcome",
    title: "매장 이용 안내",
    source: "매장 직접 작성",
    body: "필요한 상품과 안내 자료를 직원에게 문의해 주세요.\n상담이 필요하시면 상담 공간으로 안내해 드립니다.",
  },
  {
    id: "campaign",
    title: "계절 상품 안내",
    source: "공급자 자료에서 가져온 독립 사본",
    body: "계절 상품에 대한 안내 자료입니다.\n상품별 설명과 사용 시 확인할 사항을 살펴보세요.",
  },
  {
    id: "service",
    title: "상담 공간 안내",
    source: "매장 직접 작성",
    body: "상담 공간에서 필요한 정보를 확인하세요.\n언어 지원 여부는 직원에게 문의해 주세요.",
  },
];
const sourceMaterial = {
  id: "public-guide",
  title: "상품 안내 참고 자료",
  source: "공급자 공개 자료",
  body: "상품 안내를 준비할 때 참고하는 예시 자료입니다.",
};
const formats = ["QR", "사이니지", "태블릿", "POP"];
const targets = {
  QR: ["입구 안내", "상품 진열대"],
  사이니지: ["입구 TV", "상담 공간 TV"],
  태블릿: ["상담 태블릿", "카운터 태블릿"],
  POP: ["카운터", "상품 진열대"],
};
const state = {
  view: "home",
  studioTab: "library",
  commerceTab: "products",
  useTab: "ready",
  query: "",
  materials: materialSeed.map((item) => ({ ...item })),
  selected: "welcome",
  draft: {
    sourceId: "welcome",
    title: "매장 이용 안내",
    body: materialSeed[0].body,
    format: "QR",
    language: "한국어",
  },
  results: [
    {
      id: "result-1",
      sourceId: "welcome",
      title: "매장 이용 안내",
      body: materialSeed[0].body,
      format: "QR",
      language: "한국어",
    },
  ],
  savedId: null,
  selectedResult: "result-1",
  placements: [],
  target: "",
  resultNotice: "",
};
const main = document.querySelector("#workspace");
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const button = (text, action, primary = false, extra = "") =>
  `<button type="button" data-action="${action}" class="${primary ? "primary" : ""}" ${extra}>${text}</button>`;
const source = () => state.materials.find((item) => item.id === state.selected);
const result = () =>
  state.results.find((item) => item.id === state.selectedResult);
const title = (heading, description) =>
  `<section class="page-heading"><div><span class="eyebrow">${labels[state.view]}</span><h1>${heading}</h1><p class="muted">${description}</p></div><button type="button" class="ai-entry" data-action="ai">AI와 함께 ${state.view === "studio" ? "만들기" : state.view === "use" ? "활용하기" : state.view === "commerce" ? "살펴보기" : "정리하기"}</button></section>`;
const subnav = (items, key) =>
  `<nav class="subnav" aria-label="${labels[state.view]} 하위 업무">${items.map(([id, label]) => `<button type="button" data-sub="${key}" data-value="${id}" aria-pressed="${state[key] === id}">${label}</button>`).join("")}</nav>`;
function homeView() {
  return (
    title(
      "오늘의 매장 업무",
      "진행할 업무를 고르고, 준비된 자료를 매장에서 활용하세요.",
    ) +
    `<div class="grid"><section class="card summary"><span class="number">${state.materials.length}</span><div><h3>내 자료함</h3><span class="caption">보관 중인 예시 자료</span></div></section><section class="card summary"><span class="number">${state.results.length}</span><div><h3>준비된 결과물</h3><span class="caption">제작 저장과 적용은 별도입니다</span></div></section><section class="card summary"><span class="number">${state.placements.length}</span><div><h3>활용 배치</h3><span class="caption">이 초안에서 적용한 예시</span></div></section></div>` +
    `<section class="section card"><h2>이어서 할 일</h2><div class="task-list"><div class="task-row"><div><h3>매장 안내 자료 준비</h3><p class="muted">자료를 골라 필요한 형태로 만들어 보세요.</p></div>${button("작업실에서 만들기", "start-studio", true)}</div><div class="task-row"><div><h3>완성된 자료를 현장에 적용</h3><p class="muted">자료와 사용할 위치를 확인합니다.</p></div>${button("매장에서 활용하기", "start-use")}</div></div></section>` +
    `<section class="section"><h2>주요 업무</h2><div class="grid"><div class="card"><h3>상품·거래</h3><p class="muted">취급 상품과 공급·주문 업무</p>${button("상품 살펴보기", "start-commerce")}</div><div class="card"><h3>콘텐츠 작업실</h3><p class="muted">자료 보관부터 제작·미리보기까지</p>${button("내 자료함 열기", "start-studio")}</div><div class="card"><h3>매장에서 활용</h3><p class="muted">준비한 자료의 배치·교체와 상담</p>${button("활용 화면 열기", "start-use")}</div></div></section><p class="support-note">직원 초대·수락·경영자 최종 승인·접근 해제는 My Home에서 관리합니다. 기기 상태와 거래 수치는 실제 관측 자료가 있을 때 표시합니다.</p>`
  );
}
function commerceView() {
  let body;
  if (state.commerceTab === "products")
    body = `<div class="grid"><section class="card"><span class="tag">예시 취급 상품</span><div class="tile-art">상품 A</div><h2>예시 상품 A</h2><p class="muted">상품 정보에서 설명 자료 제작으로 이어집니다.</p>${button("이 상품의 안내 자료 만들기", "product-studio", true)}</section><section class="card"><span class="tag">공급 상품</span><h2>공급 상품 탐색</h2><p class="muted">사업별 거래 조건과 공급자를 확인합니다.</p>${button("공급·주문 흐름 보기", "supply")}</section><section class="card"><span class="tag">외부 판매채널</span><h2>연결·조건 설정</h2><p class="muted">온라인 판매의 원천 주문·결제는 외부 채널이 담당합니다.</p>${button("채널 설정 배치 보기", "channels")}</section></div>`;
  else if (state.commerceTab === "supply")
    body = `<section class="card"><h2>공급·주문 업무</h2><div class="step-strip"><span>공급 상품</span><span>거래 조건 확인</span><span>장바구니·결제</span><span>주문 내역</span></div><p>공급자→매장 B2B 업무를 이 공간에 배치합니다. 사업별 원장·권한·서비스 문맥은 유지합니다.</p><p class="caption">화면 배치 시연입니다. 주문 생성·결제 기능은 실행하지 않습니다.</p></section>`;
  else
    body = `<section class="card"><h2>외부 판매채널 설정</h2><p>기존 판매 설정과 채널 상품 관리의 진입을 이곳에 둡니다.</p><p class="muted">사이니지·태블릿은 현장 활용에서 관리합니다. 은퇴한 O4O 소비자 주문·결제를 복구하는 배치가 아닙니다.</p></section>`;
  return (
    title(
      "상품을 고르고 거래를 준비하세요",
      "상품 정보는 콘텐츠 제작으로, 거래 업무는 기존 사업별 흐름으로 연결합니다.",
    ) +
    subnav(
      [
        ["products", "내 매장 상품"],
        ["supply", "공급·주문"],
        ["channels", "외부 판매채널"],
      ],
      "commerceTab",
    ) +
    body
  );
}
function libraryView() {
  const list = state.materials.filter((item) =>
    `${item.title} ${item.source}`.includes(state.query),
  );
  return `<div class="search"><label class="field" style="width:100%;margin:0">자료 검색<input id="material-search" type="search" value="${escape(state.query)}" placeholder="제목 또는 출처"></label></div><div id="material-list" class="grid">${materialCards(list)}</div><p class="support-note">내 자료함에는 콘텐츠와 파일·참고 자료를 함께 탐색할 진입을 둡니다. 원본 탐색과 매장 소유 사본은 구분합니다.</p>`;
}
function materialCards(list) {
  return list.length
    ? list
        .map(
          (item) =>
            `<article class="card ${state.selected === item.id ? "selected" : ""}"><span class="tag">${escape(item.source)}</span><h2>${escape(item.title)}</h2><p class="muted">${escape(item.body)}</p><div class="actions">${button("이 자료로 제작", "make", true, `data-id="${escape(item.id)}"`)}</div></article>`,
        )
        .join("")
    : `<div class="empty">검색에 맞는 자료가 없습니다. 다른 검색어를 입력해 주세요.</div>`;
}
function sourcesView() {
  const copied = state.materials.some(
    (item) => item.id === "copied-public-guide",
  );
  return `<section class="card"><span class="tag">이용 가능한 원본 · 예시</span><h2>${sourceMaterial.title}</h2><p>공급자 공개 자료와 이용 권한이 있는 사업 제공 자료를 이곳에서 탐색합니다.</p><p class="muted">가져온 자료는 내 매장 소유의 독립 사본이 됩니다. 원본 변경이 자동 반영되지 않습니다.</p>${button(copied ? "가져온 자료로 제작" : "내 자료함에 가져오기", "copy", true)}</section>`;
}
function makerView() {
  const draft = state.draft;
  const selectedSource = state.materials.find(
    (item) => item.id === draft.sourceId,
  );
  return `<div class="step-strip"><span>자료 선택</span><span class="current">제작·미리보기</span><span>저장</span><span>매장에서 활용</span></div><div class="two-col"><section class="card"><h2>활용할 형태로 만들기</h2><p class="caption">선택 자료: ${escape(selectedSource?.title ?? "선택 없음")} · ${escape(selectedSource?.source ?? "")}</p><form id="maker-form"><label class="field">제목<input id="draft-title" required maxlength="120" value="${escape(draft.title)}"></label><label class="field">활용 형태<select id="draft-format">${formats.map((format) => `<option ${draft.format === format ? "selected" : ""}>${format}</option>`).join("")}</select></label><label class="field">자료 언어<select id="draft-language"><option ${draft.language === "한국어" ? "selected" : ""}>한국어</option><option ${draft.language === "English" ? "selected" : ""}>English</option></select></label><label class="field">안내 내용<textarea id="draft-body" required maxlength="4000">${escape(draft.body)}</textarea></label><p class="caption">언어 선택은 자료의 언어 표시입니다. 자동 번역하지 않습니다. AI 작성·번역은 공통 AI 연결 후 제공할 기능입니다.</p><div class="actions"><button type="submit" class="primary">초안 저장</button>${button("저장한 자료 활용하기", "saved-use", false, state.savedId ? "" : "disabled")}</div><p id="save-state" class="caption">${state.savedId ? "예시 초안을 저장했습니다. 실제 매장 자료는 변경되지 않습니다." : "저장한 다음 활용 공간으로 이동할 수 있습니다."}</p></form></section><section class="card"><h2>미리보기</h2><p class="caption">본문과 형태를 확인하는 화면 배치 예시입니다. 실제 매체 렌더러·QR 코드·인쇄 파일은 아닙니다.</p><div class="preview"><div class="preview-sheet"><div id="preview-meta" class="preview-meta">${escape(draft.format)} · ${escape(draft.language)}</div><h3 id="preview-title">${escape(draft.title)}</h3><p id="preview-body">${escape(draft.body)}</p></div></div><p class="support-note">폼과 미리보기는 PC에서 나란히, 모바일 웹에서는 위아래로 배치합니다. 제작 저장은 현장 적용과 별도입니다.</p></section></div>`;
}
function studioView() {
  return (
    title(
      "자료를 바탕으로 매장 콘텐츠를 만드세요",
      "보관·가져오기·제작을 한 공간에서 이어갑니다.",
    ) +
    subnav(
      [
        ["library", "내 자료함"],
        ["sources", "자료 가져오기"],
        ["make", "제작·편집"],
      ],
      "studioTab",
    ) +
    (state.studioTab === "sources"
      ? sourcesView()
      : state.studioTab === "make"
        ? makerView()
        : libraryView())
  );
}
function useView() {
  let body;
  if (state.useTab === "placements")
    body = `<section class="card"><h2>현재 활용 배치 · 예시</h2>${state.placements.length ? state.placements.map((item) => `<div class="task-row"><div><span class="tag">${escape(item.format)}</span><h3>${escape(item.title)}</h3><p>${escape(item.target)}</p><p class="caption">예시 배치입니다. 실제 기기 재생·게시 상태는 확인하지 않았습니다.</p></div>${button("작업실에서 수정", "edit", false, `data-id="${escape(item.resultId)}"`)}</div>`).join("") : '<div class="empty">이 초안에서 적용한 자료가 없습니다. 준비된 자료를 골라 배치를 확인해 보세요.</div>'}</section>`;
  else if (state.useTab === "consultation")
    body = `<section class="card"><span class="tag amber">향후 기획</span><h2>한국어·다국어 상담</h2><p>직원 보조 상담과 소비자 직접 상담을 구분하고, 각 대상에게 허용된 매장 자료만 사용합니다.</p><div class="actions"><button type="button" disabled>직원 상담 도우미 · 준비 중</button><button type="button" disabled>소비자 상담 · 준비 중</button></div><p class="caption">현재 기능인 상담 요청의 진입도 활용 공간에 배치할 예정입니다. 이 초안에는 실제 상담·요청 기능이 연결되지 않았습니다.</p></section>`;
  else {
    const item = result();
    body = `<div class="two-col"><section class="card"><h2>준비된 자료 선택</h2><p class="muted">복잡한 제작 설정을 거치지 않고 사용할 결과물을 선택합니다.</p><div class="task-list">${state.results.map((entry) => `<div class="task-row"><div><span class="tag">${escape(entry.format)} · ${escape(entry.language)}</span><h3>${escape(entry.title)}</h3></div><button type="button" data-action="select-result" data-id="${escape(entry.id)}" aria-pressed="${entry.id === state.selectedResult}">${entry.id === state.selectedResult ? "선택됨" : "선택"}</button></div>`).join("")}</div></section><section class="card"><h2>어디에서 사용할까요?</h2>${item ? `<p class="context-box"><strong>${escape(item.title)}</strong><br>${escape(item.format)} · ${escape(item.language)}</p><label class="field">사용 위치<select id="target"><option value="">위치를 선택하세요</option>${targets[item.format].map((target) => `<option ${state.target === target ? "selected" : ""}>${target}</option>`).join("")}</select></label><p class="caption">실제 구현에서는 해당 매장의 접근 가능한 위치·기기를 조회하고, 게시·기기 적용·출력을 매체별로 처리합니다.</p><div class="actions">${button("예시 적용 확인", "apply", true)}${button("작업실에서 수정", "edit", false, `data-id="${escape(item.id)}"`)}</div>` : '<div class="empty">제작 결과물이 없습니다. 작업실에서 먼저 저장해 주세요.</div>'}</section></div><p class="support-note">QR 배치·출력, 사이니지 스케줄·재생, 태블릿 화면 적용을 이 공간에 묶습니다. 기능별 상세 설정은 선택한 대상에서 열고, 편집은 작업실로 연결합니다.</p>`;
  }
  return (
    title(
      "준비된 자료를 매장에서 사용하세요",
      "무엇을 만들었는지와 어디에 적용했는지를 구분해 확인합니다.",
    ) +
    subnav(
      [
        ["ready", "자료 적용"],
        ["placements", "활용 현황"],
        ["consultation", "상담"],
      ],
      "useTab",
    ) +
    (state.resultNotice
      ? `<p class="result-banner" role="status">${escape(state.resultNotice)}</p>`
      : "") +
    body
  );
}
function render(focus = false) {
  document.querySelectorAll("[data-view]").forEach((element) => {
    if (element.dataset.view === state.view)
      element.setAttribute("aria-current", "page");
    else element.removeAttribute("aria-current");
  });
  main.innerHTML = {
    home: homeView,
    commerce: commerceView,
    studio: studioView,
    use: useView,
  }[state.view]();
  if (focus) main.focus();
}
function navigate(view) {
  state.view = view;
  state.resultNotice = "";
  render(true);
}
function startMaker(material) {
  state.selected = material.id;
  state.draft = {
    sourceId: material.id,
    title: material.title,
    body: material.body,
    format: "QR",
    language: "한국어",
  };
  state.savedId = null;
  state.studioTab = "make";
  navigate("studio");
}
let noticeTimer;
function notice(message) {
  const element = document.querySelector("#notice");
  element.textContent = message;
  element.style.display = "block";
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    element.style.display = "none";
  }, 6500);
}
function assistant() {
  // Keep assistance in Korean and explicitly deterministic; no provider response.
  const suggestions = {
    home: "도움 예시: 오늘 할 일을 정리하고 필요한 상품·제작·활용 업무로 안내합니다.",
    commerce:
      "도움 예시: 선택 상품을 비교하고 안내 자료나 주문 준비로 연결합니다. 거래 실행은 기존 권한과 확인을 거칩니다.",
    studio:
      "도움 예시: 선택 자료를 짧은 안내문으로 정리하거나 목적·언어·매체에 맞게 제작을 돕습니다.",
    use: "도움 예시: 준비된 자료와 사용할 위치를 확인하고 적용 또는 상담에 필요한 자료를 찾습니다.",
  };
  const contextSource =
    state.view === "use"
      ? state.materials.find((item) => item.id === result()?.sourceId)
      : source();
  const context = `${labels[state.view]} · 예시 매장 · 승인 직원 · 선택 자료: ${contextSource?.title ?? "없음"}${state.view === "use" && result() ? ` · 결과물: ${result().title}` : ""}`;
  document.querySelector("#assistant-context").textContent = context;
  document.querySelector("#assistant-suggestion").textContent =
    suggestions[state.view];
  document.querySelector("#assistant").showModal();
}
document.addEventListener("click", (event) => {
  const control = event.target.closest("button");
  if (!control || control.disabled) return;
  if (control.dataset.view) return navigate(control.dataset.view);
  if (control.dataset.info) return notice(control.dataset.info);
  if (control.dataset.sub) {
    state[control.dataset.sub] = control.dataset.value;
    state.resultNotice = "";
    render(true);
    return;
  }
  const action = control.dataset.action;
  if (action === "ai") return assistant();
  if (action === "start-studio") {
    state.studioTab = "library";
    return navigate("studio");
  }
  if (action === "start-use") {
    state.useTab = "ready";
    return navigate("use");
  }
  if (action === "start-commerce") return navigate("commerce");
  if (action === "supply" || action === "channels") {
    state.commerceTab = action;
    render(true);
    return;
  }
  if (action === "make")
    return startMaker(
      state.materials.find((item) => item.id === control.dataset.id),
    );
  if (action === "product-studio") {
    let material = state.materials.find((item) => item.id === "product-a");
    if (!state.materials.some((item) => item.id === "product-a")) {
      material = {
        id: "product-a",
        title: "예시 상품 A 안내",
        source: "상품에서 제작 시작 · 예시",
        body: "예시 상품 A의 안내 내용을 작성해 주세요.",
      };
      state.materials.push(material);
    }
    return startMaker(material);
  }
  if (action === "copy") {
    const id = "copied-public-guide";
    if (state.materials.some((item) => item.id === id))
      return startMaker(state.materials.find((item) => item.id === id));
    state.materials.push({
      ...sourceMaterial,
      id,
      source: "공급자 자료에서 가져온 독립 사본",
    });
    state.selected = id;
    state.studioTab = "library";
    render(true);
    notice(
      "예시 자료를 내 자료함에 가져왔습니다. 실제 복사 요청은 실행하지 않았습니다.",
    );
    return;
  }
  if (action === "select-result") {
    state.selectedResult = control.dataset.id;
    state.target = "";
    state.resultNotice = "";
    render(true);
    return;
  }
  if (action === "saved-use") {
    state.selectedResult = state.savedId;
    state.target = "";
    state.useTab = "ready";
    return navigate("use");
  }
  if (action === "edit") {
    const entry = state.results.find((item) => item.id === control.dataset.id);
    state.selected = entry.sourceId;
    state.draft = { ...entry };
    state.savedId = entry.id;
    state.studioTab = "make";
    return navigate("studio");
  }
  if (action === "apply") {
    const entry = result();
    if (!entry || !targets[entry.format].includes(state.target))
      return notice("사용할 위치를 먼저 선택해 주세요.");
    const placement = {
      resultId: entry.id,
      title: entry.title,
      format: entry.format,
      target: state.target,
    };
    const index = state.placements.findIndex(
      (item) => item.format === entry.format && item.target === state.target,
    );
    if (index < 0) state.placements.push(placement);
    else state.placements[index] = placement;
    state.resultNotice = `${entry.title} → ${state.target}: 예시 적용을 확인했습니다. 실제 게시·기기 변경·인쇄는 실행하지 않았습니다.`;
    render(true);
  }
});
document.addEventListener("input", (event) => {
  const id = event.target.id;
  if (id === "material-search") {
    state.query = event.target.value;
    document.querySelector("#material-list").innerHTML = materialCards(
      state.materials.filter((item) =>
        `${item.title} ${item.source}`.includes(state.query),
      ),
    );
    return;
  }
  const fields = {
    "draft-title": "title",
    "draft-body": "body",
    "draft-format": "format",
    "draft-language": "language",
  };
  if (!fields[id]) return;
  state.draft[fields[id]] = event.target.value;
  state.savedId = null;
  document.querySelector("#preview-title").textContent = state.draft.title;
  document.querySelector("#preview-body").textContent = state.draft.body;
  document.querySelector("#preview-meta").textContent =
    `${state.draft.format} · ${state.draft.language}`;
  document.querySelector("[data-action=saved-use]").disabled = true;
  document.querySelector("#save-state").textContent =
    "변경 내용을 저장한 다음 활용할 수 있습니다.";
});
document.addEventListener("change", (event) => {
  if (event.target.id === "target") state.target = event.target.value;
});
document.addEventListener("submit", (event) => {
  if (event.target.id !== "maker-form") return;
  event.preventDefault();
  if (!state.draft.title.trim() || !state.draft.body.trim())
    return notice("제목과 안내 내용을 입력해 주세요.");
  const id = state.draft.id ?? `result-${state.results.length + 1}`;
  const entry = {
    ...state.draft,
    id,
    title: state.draft.title.trim(),
    body: state.draft.body.trim(),
  };
  const index = state.results.findIndex((item) => item.id === id);
  if (index < 0) state.results.push(entry);
  else state.results[index] = entry;
  state.draft = { ...entry };
  state.savedId = id;
  state.selectedResult = id;
  render(true);
  notice("예시 초안을 저장했습니다. 실제 콘텐츠 저장은 실행하지 않았습니다.");
});
document
  .querySelector("#close-assistant")
  .addEventListener("click", () =>
    document.querySelector("#assistant").close(),
  );
render();
