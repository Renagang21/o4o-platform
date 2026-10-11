import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import termsSource from '../../../../../docs/design/DESIGN-NETURE-ACCOUNT-TERMS-V2.md?raw';
import privacySource from '../../../../../docs/design/DESIGN-NETURE-ACCOUNT-PRIVACY-V2.md?raw';
import serviceSource from '../../../../../docs/design/DESIGN-NETURE-SERVICE-POLICY-BODIES-V2.md?raw';
import { api } from '../../lib/apiClient';

/** A public notice is separate from the effective policy rows and signup reference. */
function body(source: string, internalHeading: string) {
  return source.split(internalHeading)[0].split('\n').filter(line => !/^>( |$)|^# /.test(line))
    .map(line => line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')).join('\n').trim();
}
export const ACCOUNT_POLICY_NOTICE_DATE = '2026-10-11';
export const ACCOUNT_POLICY_EFFECTIVE_DATE = '2026-11-13';
export default function AccountPolicyNoticePage() {
  const [profile, setProfile] = useState<{ privacyOfficerName?: string; privacyOfficerEmail?: string; privacyOfficerPhone?: string } | null>(null);
  useEffect(() => { let alive = true; api.get('/public/services/neture/legal-profile').then((r: { data: { data: typeof profile } }) => { if (alive) setProfile(r.data.data); }).catch(() => {}); return () => { alive = false; }; }, []);
  const documents = [{ title: 'Neture 계정 이용약관 개정안', content: body(termsSource, '## 부칙 및 게시 전 대조') }, { title: 'Neture 계정 개인정보 처리방침 개정안', content: body(privacySource, '## 9. 게시 대조 기록') }, { title: '서비스별 이용약관·개인정보 안내 개정안', content: body(serviceSource, '## 내부 게시·적용 대조') }];
  return <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800">
    <Link to="/notices" className="text-blue-700">공지사항</Link>
    <h1 className="mt-5 text-3xl font-semibold">계정 이용약관·개인정보 처리방침 개정 공고</h1>
    <p className="mt-4">공고일 {ACCOUNT_POLICY_NOTICE_DATE} · 시행 예정일 {ACCOUNT_POLICY_EFFECTIVE_DATE} (한국 시간)</p>
    <p className="mt-4">Neture 공통 계정과 서비스별 가입·승인을 구분하고, Google·카카오 로그인과 회원이 요청한 로그인 수단 연결, 개인정보 처리 항목을 현재 제공 기능에 맞춰 안내합니다.</p>
    <ul className="mt-4 list-disc space-y-2 pl-6"><li>공통 계정은 neture.co.kr에서 관리합니다. 계정 가입이 서비스 승인이나 업무 권한을 만들지 않습니다.</li><li>각 서비스의 신청 조건과 추가 개인정보는 해당 서비스 신청 때 확인합니다.</li><li>이메일 주소가 같다는 이유로 계정을 자동 연결하지 않습니다.</li><li>현재 보유기간과 클라우드·메일 처리자 안내를 유지합니다.</li></ul>
    <p className="mt-4">서비스별 개정안도 아래에서 확인할 수 있습니다. 해당 서비스 신청에 필요한 내용만 적용하며, 현재 정책의 과거 기록은 보존합니다.</p>
    <p className="mt-5 rounded-lg bg-blue-50 p-4">30일 이상 공고 후 시행합니다. 시행 전에는 현재 공개 정책이 적용됩니다. 새 정책 적용 시 회원에게 명시적 동의를 요청하며, 과거 동의를 새 버전 동의로 바꾸지 않습니다.</p>
    <p className="mt-4"><Link to="/terms" className="text-blue-700">현재 이용약관</Link> · <Link to="/privacy" className="text-blue-700">현재 개인정보 처리방침</Link> · <Link to="/contact" className="text-blue-700">문의·의견 보내기</Link></p>
    {documents.map(document => <section key={document.title} className="mt-8"><h2 className="text-xl font-semibold">{document.title}</h2><div className="mt-4 break-words rounded-lg border bg-white p-5 leading-8"><NoticeBody content={document.content} /></div></section>)}
    <section className="mt-8 rounded-lg border p-5"><h2 className="font-semibold">개인정보 문의창구</h2>{profile?.privacyOfficerName && <p className="mt-3">개인정보 보호책임자: {profile.privacyOfficerName}</p>}{profile?.privacyOfficerEmail && <p>이메일: <a href={`mailto:${profile.privacyOfficerEmail}`}>{profile.privacyOfficerEmail}</a></p>}{profile?.privacyOfficerPhone && <p>전화: {profile.privacyOfficerPhone}</p>}<p className="mt-3"><Link to="/contact" className="text-blue-700">Neture 문의창구</Link>를 통해 권리 행사와 개정 의견을 접수할 수 있습니다.</p></section>
  </main>;
}

/** Render the limited headings, tables and paragraphs in the reviewed notice sources. */
function NoticeBody({ content }: { content: string }) {
  return <>{content.split(/\n\s*\n/).map((block, index) => {
    if (/^#{2,4} /.test(block)) return <h3 key={index} className="mb-3 mt-6 text-lg font-semibold">{block.replace(/^#{2,4} /, '')}</h3>;
    if (block.startsWith('|')) {
      const rows = block.split('\n').filter(line => !/^\|[ :|-]+\|$/.test(line)).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
      return <div key={index} className="my-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{rows[0]?.map((cell, i) => <th key={i} className="border bg-slate-50 p-2">{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i} className="border p-2 align-top">{cell}</td>)}</tr>)}</tbody></table></div>;
    }
    return <p key={index} className="mb-4 whitespace-pre-line">{block}</p>;
  })}</>;
}
