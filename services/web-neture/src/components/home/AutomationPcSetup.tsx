import { useEffect, useRef, useState } from 'react';
import LocalAgentCard from '../mypage/LocalAgentCard';
export default function AutomationPcSetup({ disabled, hasRequest, canContinue, onContinue, onClose }: Readonly<{
  disabled: boolean; hasRequest: boolean; canContinue: boolean; onContinue: () => void; onClose: () => void;
}>) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);
  const [checking, setChecking] = useState(false);
  // Guidance only. The server still chooses/authorizes the execution node.
  const isWindows = typeof navigator !== 'undefined' && (/Win/i.test(navigator.platform) || /Windows/i.test(navigator.userAgent));
  return <section ref={panel} tabIndex={-1} aria-label="자동화 PC 설치·연결 준비" className="mt-4 w-full max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm">
    <h3 className="font-semibold text-slate-900">자동화를 시작할 PC를 준비해 주세요</h3>
    <p>설치·실행·계정 연결을 이 화면에서 진행할 수 있습니다. 설치하는 동안 이 페이지를 열어 두면 작성한 요청과 첨부가 유지됩니다.</p>
    {isWindows ? <LocalAgentCard onBusyChange={setChecking} /> : <p className="rounded-lg bg-white p-3">
      업무를 실행할 Windows PC에서 같은 계정으로 O4O 메인에 접속한 뒤 ‘PC 연결 준비’를 눌러 설치·연결하세요.
      준비가 끝나면 이 기기로 돌아와 요청을 계속할 수 있습니다.
    </p>}
    {hasRequest && <button type="button" disabled={disabled || checking || !canContinue} onClick={onContinue} className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50">설치·연결 후 요청 계속</button>}
    <button type="button" disabled={disabled || checking} onClick={onClose} className="ml-2 rounded-lg border px-3 py-2 disabled:opacity-50">준비 화면 닫기</button>
    <p className="text-xs text-slate-500">다운로드만으로 설치·연결이 완료되지는 않습니다. 요청 계속은 PC의 실행 상태와 권한을 서버에서 다시 확인한 뒤 진행합니다.</p>
  </section>;
}
