/**
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §5·§13·§14 — 단일 요청 라우터 · 첨부 계약 (순수 계층)
 *
 * 고정하려는 것:
 *   - 사용자가 "질문 / 작업 수행" 을 고르지 않아도 서버가 결정론적으로 경로를 고른다(AI 호출 없음).
 *   - WO §13 의 예문이 명시된 경로로 간다: 일반 질문 → chat · 등재 사이트 위 일반 검색 업무 → work.
 *   - (§9) "원내" · "동일성분" 결합 요청은 composite 로 가로챈다 — raw browser work 이 아니다.
 *   - 열기 · 상태 · 로그인 문장은 home-chat 의 1-step 축(chat)에 남는다 — Work Agent 로 새지 않는다(회귀 금지 §10).
 *   - 모호하면 실행하지 않고 confirm 으로 되묻고, 확인(routeHint)이 오면 work.
 *   - runId(PHASE 1 same-run) 는 무조건 work.
 *   - 문서 · 표 첨부는 Work Agent 로 흐르지 않는다(chat).
 *   - 첨부 계약: 지원 형식 · 확장자 보정 · 크기 · 개수 · base64 형상, 그리고 사용자 오류 문구에 지원 목록이 들어간다.
 */

import {
  classifyUnifiedRequest,
  confirmWorkMessage,
  hasTaskIntent,
  isOpenOrActivateOnly,
  isStatusInquiry,
} from '../services/ai-tools/unified-request-router.js';
import {
  UNIFIED_ATTACHMENT_MAX_BYTES,
  UNIFIED_ATTACHMENT_MAX_COUNT,
  firstImageAttachment,
  resolveAttachmentMime,
  unifiedAttachmentErrorMessage,
  validateUnifiedAttachments,
} from '../services/ai-tools/unified-request-contract.js';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

describe('unified request router — 경로 판정', () => {
  it('WO §13 일반 질문 → chat (등재 대상 없음)', () => {
    for (const text of ['UDCA가 뭐야?', '우루사정 성분이 뭐야?', '비타민 D 하루 권장량 알려줘', '오늘 할 일 정리해줘']) {
      const d = classifyUnifiedRequest(text);
      expect(d.route).toBe('chat');
      expect(d.reason).toBe('no_registered_target');
      expect(d.target).toBeNull();
    }
  });

  // WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1 §9 — "동일성분" 결합 요청은 이제 raw browser work 이
  // 아니라 composite(web+local 내부 분해 → 하나의 답)로 간다. 아래 두 테스트가 그 경계를 고정한다.
  it('WO §9 동일성분 결합 요청 — "약학정보원에서 우루사정 동일성분 찾아줘" → composite (§13-A)', () => {
    const d = classifyUnifiedRequest('약학정보원에서 우루사정 동일성분 찾아줘.');
    expect(d.route).toBe('composite');
    expect(d.reason).toBe('hospital_drug_composite');
  });

  it('WO §13 웹 작업 — 등재 사이트 위 일반 검색 업무(결합 아님) → work (browser_site healthkr)', () => {
    const d = classifyUnifiedRequest('약학정보원에서 타이레놀 검색해줘.');
    expect(d.route).toBe('work');
    expect(d.reason).toBe('task_intent');
    expect(d.target).toEqual(expect.objectContaining({ targetType: 'browser_site', targetId: 'healthkr' }));
  });

  it('Windows 프로그램 업무 — "Doctors에서 반납대상 리스트가 무엇이 있는지 보여줘" → work (windows_app)', () => {
    const d = classifyUnifiedRequest('Doctors에서 반납대상 리스트가 무엇이 있는지 보여줘');
    expect(d.route).toBe('work');
    expect(d.target).toEqual(expect.objectContaining({ targetType: 'windows_app', targetId: 'windows.doctors' }));
  });

  it('열기 · 활성화만 있는 문장은 chat 에 남는다 (home-chat 1-step 축 회귀 금지)', () => {
    for (const text of ['네뚜레 열어줘', '약학정보원 접속해줘', '메모장 앞으로 가져와', '카카오톡 창 띄워 줘', 'open neture']) {
      const d = classifyUnifiedRequest(text);
      expect(d.route).toBe('chat');
      expect(d.reason).toBe('open_or_activate_only');
      expect(isOpenOrActivateOnly(text)).toBe(true);
    }
  });

  it('상태 조회 문장은 chat 에 남는다', () => {
    for (const text of ['메모장 열려 있어?', '닥터스 실행 중이야?', '네뚜레 켜져 있나?']) {
      const d = classifyUnifiedRequest(text);
      expect(d.route).toBe('chat');
      expect(d.reason).toBe('status_inquiry');
      expect(isStatusInquiry(text)).toBe(true);
    }
  });

  it('로그인 요청은 chat 으로 — 로그인 automation 은 존재하지 않는다', () => {
    const d = classifyUnifiedRequest('약학정보원에 로그인해서 우루사 찾아줘');
    expect(d.route).toBe('chat');
    expect(d.reason).toBe('login_guidance');
  });

  it('등재 대상은 있지만 업무인지 모호하면 confirm_work — 실행하지 않고 되묻는다', () => {
    const d = classifyUnifiedRequest('닥터스 반납');
    expect(d.route).toBe('confirm_work');
    expect(d.reason).toBe('ambiguous');
    expect(d.target?.targetType).toBe('windows_app');
    const msg = confirmWorkMessage(d.target!);
    expect(msg).toContain('프로그램');
    // 내부 용어 비노출(§4)
    expect(msg).not.toMatch(/Work Agent|Local Agent|Workflow/i);
  });

  it('confirm 뒤 routeHint:work 가 오면 work (user_confirmed)', () => {
    const d = classifyUnifiedRequest('닥터스 반납', { routeHint: 'work' });
    expect(d.route).toBe('work');
    expect(d.reason).toBe('user_confirmed');
  });

  it('routeHint 는 등재 대상이 없으면 힘이 없다 — 일반 질문을 work 로 밀어넣지 못한다', () => {
    const d = classifyUnifiedRequest('UDCA가 뭐야?', { routeHint: 'work' });
    expect(d.route).toBe('chat');
  });

  it('runId(PHASE 1 same-run 재개)가 있으면 무조건 work', () => {
    const d = classifyUnifiedRequest('네, 두 번째 항목이요', { runId: 'g_abc123' });
    expect(d.route).toBe('work');
    expect(d.reason).toBe('resume');
  });

  it('문서 · 표 첨부가 있으면 등재 대상 업무라도 chat (Work Agent 에 문서가 흐르지 않는다)', () => {
    const d = classifyUnifiedRequest('약학정보원에서 이 목록의 약을 찾아줘', { hasDocumentAttachment: true });
    expect(d.route).toBe('chat');
    expect(d.reason).toBe('document_attached');
  });

  it('업무 지시어 판정은 대상 이름을 업무로 오인하지 않는다', () => {
    expect(hasTaskIntent('약학정보원')).toBe(false);
    expect(hasTaskIntent('약학정보원에서 검색')).toBe(true);
    expect(hasTaskIntent('find UDCA on health.kr')).toBe(true);
  });
});

describe('unified attachment contract', () => {
  it('비어 있으면 ok · 빈 배열', () => {
    expect(validateUnifiedAttachments(undefined)).toEqual({ ok: true, attachments: [] });
    expect(validateUnifiedAttachments(null)).toEqual({ ok: true, attachments: [] });
  });

  it('지원 형식 — 이미지 · 문서 · 표를 하나의 진입점으로 받는다', () => {
    const r = validateUnifiedAttachments([
      { name: 'a.png', mimeType: 'image/png', base64: b64('x') },
      { name: 'manual.pdf', mimeType: 'application/pdf', base64: b64('x') },
      { name: 'memo.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', base64: b64('x') },
      { name: 'list.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: b64('x') },
      { name: 'data.csv', mimeType: 'text/csv', base64: b64('x') },
    ]);
    expect(r.ok).toBe(true);
    expect(r.attachments.map((a) => a.kind)).toEqual(['image', 'document', 'document', 'spreadsheet', 'spreadsheet']);
  });

  it('브라우저가 MIME 을 비우거나 엉뚱하게 보내도 확장자로 보정한다 (.md · .csv → application/vnd.ms-excel)', () => {
    expect(resolveAttachmentMime('notes.md', '')).toBe('text/markdown');
    expect(resolveAttachmentMime('list.csv', 'application/vnd.ms-excel')).toBe('text/csv');
    expect(resolveAttachmentMime('file.bin', 'application/octet-stream')).toBeNull();
    const r = validateUnifiedAttachments([{ name: 'notes.md', mimeType: '', base64: b64('# hi') }]);
    expect(r.ok).toBe(true);
    expect(r.attachments[0]).toEqual(expect.objectContaining({ kind: 'document', mimeType: 'text/markdown' }));
  });

  it('지원하지 않는 형식은 명확한 사용자 문구 + 지원 목록 (WO §14)', () => {
    const r = validateUnifiedAttachments([{ name: 'setup.exe', mimeType: 'application/x-msdownload', base64: b64('x') }]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ATTACHMENT_TYPE_UNSUPPORTED');
    const msg = unifiedAttachmentErrorMessage(r.error!, r.errorName);
    expect(msg).toContain('setup.exe');
    expect(msg).toContain('PDF');
    expect(msg).toContain('XLSX');
  });

  it('하나라도 틀리면 전체 거부 (부분 수용 없음)', () => {
    const r = validateUnifiedAttachments([
      { name: 'a.png', mimeType: 'image/png', base64: b64('x') },
      { name: 'bad.zip', mimeType: 'application/zip', base64: b64('x') },
    ]);
    expect(r.ok).toBe(false);
    expect(r.attachments).toEqual([]);
  });

  it('크기 · 개수 상한', () => {
    const big = 'A'.repeat(Math.ceil((UNIFIED_ATTACHMENT_MAX_BYTES + 1024) / 3) * 4);
    expect(validateUnifiedAttachments([{ name: 'big.pdf', mimeType: 'application/pdf', base64: big }]).error).toBe('ATTACHMENT_TOO_LARGE');
    const many = Array.from({ length: UNIFIED_ATTACHMENT_MAX_COUNT + 1 }, (_, i) => ({ name: `f${i}.txt`, mimeType: 'text/plain', base64: b64('x') }));
    expect(validateUnifiedAttachments(many).error).toBe('ATTACHMENT_TOO_MANY');
  });

  it('base64 형상 — data URL 접두사는 벗기고, base64 가 아니면 거부', () => {
    const ok = validateUnifiedAttachments([{ name: 'a.png', mimeType: 'image/png', base64: `data:image/png;base64,${b64('x')}` }]);
    expect(ok.ok).toBe(true);
    expect(ok.attachments[0].base64).toBe(b64('x'));
    expect(validateUnifiedAttachments([{ name: 'a.png', mimeType: 'image/png', base64: '!!not base64!!' }]).error).toBe('ATTACHMENT_INVALID');
  });

  it('파일명은 경로 · 제어문자를 제거한 표시 이름만 남긴다', () => {
    const r = validateUnifiedAttachments([{ name: 'C:\\Users\\me\\Desktop\\..\\secret\\x\u0000y.txt', mimeType: 'text/plain', base64: b64('x') }]);
    expect(r.ok).toBe(true);
    expect(r.attachments[0].name).toBe('xy.txt');
  });

  it('Work Agent 에는 첫 이미지 1장만 — 문서 · 표는 넘어가지 않는다', () => {
    const r = validateUnifiedAttachments([
      { name: 'm.pdf', mimeType: 'application/pdf', base64: b64('p') },
      { name: 'a.jpg', mimeType: 'image/jpeg', base64: b64('1') },
      { name: 'b.jpg', mimeType: 'image/jpeg', base64: b64('2') },
    ]);
    expect(firstImageAttachment(r.attachments)).toEqual({ mimeType: 'image/jpeg', base64: b64('1') });
    expect(firstImageAttachment(r.attachments.filter((a) => a.kind !== 'image'))).toBeUndefined();
  });
});
