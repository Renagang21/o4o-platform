import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { getService } from '../../config/service-catalog.js';

/** Presentation only: never used to decide scope, identity, or authority. */
export function invitationScopeLabel(role: string, serviceKey?: string): string {
  const business = /^neture:([^:]+)_(?:admin|operator)$/.exec(role)?.[1];
  const businessLabels: Record<string, string> = {
    pharmacy: '약국 협력사업',
    carepharm: 'CarePharm · 만성질환관리',
    drugstore: '드럭스토어형 약국',
    pharmcoop: '약국·약사 협동조합',
  };
  if (business && businessLabels[business]) return businessLabels[business];
  if (role.startsWith('cooperative:')) return '조합';
  const service = getService(serviceKey || resolveCanonicalServiceKey(role.split(':')[0]));
  return service?.nameKo || service?.name || 'O4O';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Pure rendering. No logging, persistence, tracking, or invitation URL mutation. */
export function buildOperatorInvitationMail(url: string, role: string, confirmation: boolean, centralDelegation = false) {
  const scope = invitationScopeLabel(role);
  const roleLabel = /(?:[:_])admin$/.test(role) ? '관리자' : '운영자';
  const title = `${scope} ${roleLabel} ${confirmation ? '지정 확인' : '초대'}`;
  const intro = confirmation
    ? `${scope} ${roleLabel} 지정 내용을 확인해 주세요.`
    : `${scope} ${roleLabel} 역할을 맡아 주실 분으로 초대되었습니다.`;
  const steps = [
    '아래 ‘운영자 초대 확인’ 버튼을 눌러 초대 화면을 여세요.',
    '기존 회원은 초대받은 계정으로 로그인하세요. 처음 이용한다면 이 메일을 받은 이메일 주소로 가입하세요. 이메일·비밀번호로 가입한 경우에는 가입 확인 메일의 이메일 인증도 완료해 주세요.',
    '로그인 후 초대 화면에서 대상 서비스와 역할, 수락할 계정을 확인하고 ‘이 계정으로 확인·수락’을 누르세요.',
  ];
  if (centralDelegation) steps.push('O4O 직영 운영 업무의 중앙 위임 초대입니다. 수락 후 https://admin.neture.co.kr/operations 에서 Google로 로그인하세요. 이메일·카카오 계정은 먼저 My Home 계정 설정에서 본인 확인을 거쳐 Google 계정을 연결하세요. 이메일 일치만으로 자동 연결되지 않습니다. 일반 서비스 역할이나 독립 사업 운영 권한과는 별개입니다.');
  const continuation = '가입이나 이메일 인증만으로 초대 수락이 완료되지는 않습니다. 가입·인증 후 초대 화면이 보이지 않으면 이 메일의 버튼을 다시 눌러 주세요.';
  const validity = '초대는 처음 발급한 날부터 7일 동안 유효하며, 재발송해도 만료일은 연장되지 않습니다. 여러 메일을 받았다면 가장 최근 메일의 링크를 이용해 주세요.';
  const privacy = '본인에게 온 초대 링크를 다른 사람에게 전달하지 마세요. 요청하지 않았거나 맡기로 하지 않은 역할이라면 수락하지 않아도 됩니다. 수락·취소·만료 시 초대용 이메일과 토큰을 파기하고, 권한 변경 최소 이력은 생성 후 달력 1년 보관합니다.';
  const text = [
    title, intro, '', ...steps.map((s, i) => `${i + 1}. ${s}`), '',
    '운영자 초대 확인:', url, '', continuation, '', validity, '', privacy,
  ].join('\n');
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f5f7fa;color:#1f2937;font-family:Arial,sans-serif;line-height:1.7">
<div style="max-width:600px;margin:24px auto;padding:28px;background:#fff;border:1px solid #e5e7eb;border-radius:12px">
<p style="color:#0f766e;font-weight:bold">O4O</p><h1 style="font-size:24px;line-height:1.4">${escapeHtml(title)}</h1>
<p>${escapeHtml(intro)}</p><ol style="padding-left:24px">${steps.map(s => `<li style="margin-bottom:12px">${escapeHtml(s)}</li>`).join('')}</ol>
<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold">운영자 초대 확인</a></p>
<p>${escapeHtml(continuation)}</p><p style="font-size:13px;color:#4b5563">버튼이 열리지 않으면 아래 주소 전체를 복사해 브라우저 주소창에 붙여 넣으세요.</p>
<p style="font-size:12px;overflow-wrap:anywhere;word-break:break-all"><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:13px;color:#4b5563">${escapeHtml(validity)}</p>
<p style="font-size:12px;color:#6b7280">${escapeHtml(privacy)}</p></div></body></html>`;
  return { subject: `[O4O] ${title} — 확인 후 수락해 주세요`, text, html };
}
