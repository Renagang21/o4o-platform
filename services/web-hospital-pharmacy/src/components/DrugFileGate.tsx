/**
 * Hospital Pharmacy — 원내 약품 파일 연결 게이트(무로그인)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE §2·§6·§13·§14
 *
 * 개인 로그인 · 계정 · 연결 코드는 없다. 이 게이트는 "사용자가 고른 원내 약품 파일을 읽을 수 있는가"만 다룬다.
 * 파일을 읽을 수 있으면(ready) 자식(홈·병동·원내 약품 파일)을 그대로 렌더한다.
 */
import type { ReactNode } from 'react';
import { useLocalDrugs } from '../contexts/LocalDrugContext';
import { SUPPORTED_BROWSER_NOTICE } from '../lib/browserSupport';
import { BRAND } from '../config/service';

export default function DrugFileGate({ children }: { children: ReactNode }) {
  const { status, fileName, error, connect, allowAccess, reload } = useLocalDrugs();

  if (status === 'ready') return <>{children}</>;

  if (status === 'checking' || status === 'loading') {
    return (
      <div className="tool">
        <p className="muted">{status === 'loading' ? `${fileName ?? '원내 약품 파일'} 을(를) 읽는 중입니다…` : '원내 약품 파일 연결을 확인하는 중입니다…'}</p>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="tool">
        <h1>{BRAND.name}</h1>
        <div className="notice">
          {SUPPORTED_BROWSER_NOTICE}
          <br />
          지금 브라우저에서는 원내 약품 파일을 연결할 수 없습니다. Chrome 또는 Edge 로 이 주소를 열어 주세요.
        </div>
      </div>
    );
  }

  if (status === 'needs-permission') {
    return (
      <div className="tool">
        <h1>{BRAND.name}</h1>
        <p className="muted">
          원내 약품 파일{fileName ? <> <b>{fileName}</b></> : null} 이 연결돼 있습니다. 이 파일을 다시 읽으려면 권한이 필요합니다.
          아래 버튼을 누르고 권한 창에서 허용해 주세요. 권한 창에 &ldquo;방문할 때마다 허용&rdquo; 이 보이면 그것을 고르면 다음부터는 묻지 않습니다.
        </p>
        <div className="row">
          <button className="btn" onClick={() => void allowAccess()}>원내 약품 파일 읽기 허용</button>
          <button className="btn ghost" onClick={() => void connect()}>다른 파일 선택</button>
        </div>
        {error && <div className="err">{error}</div>}
      </div>
    );
  }

  if (status === 'unreadable') {
    return (
      <div className="tool">
        <h1>{BRAND.name}</h1>
        <div className="err">
          연결했던 파일{fileName ? <> <b>{fileName}</b></> : null} 을(를) 읽을 수 없습니다.
          <br />
          파일 위치가 변경되었거나 삭제됐을 수 있습니다.
        </div>
        <div className="row">
          <button className="btn" onClick={() => void connect()}>다른 파일 선택</button>
          <button className="btn ghost" onClick={() => void reload()}>다시 확인</button>
        </div>
        {error && <div className="err">{error}</div>}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="tool">
        <h1>{BRAND.name}</h1>
        <div className="err">{error ?? '원내 약품 파일을 읽지 못했습니다.'}</div>
        <div className="row">
          <button className="btn" onClick={() => void reload()}>다시 읽기</button>
          <button className="btn ghost" onClick={() => void connect()}>다른 파일 선택</button>
        </div>
      </div>
    );
  }

  // unconnected — 최초 1회 연결(§2)
  return (
    <div className="tool">
      <h1>{BRAND.name}</h1>
      <p className="muted">{SUPPORTED_BROWSER_NOTICE}</p>
      <div className="panel">
        <p style={{ marginTop: 0, lineHeight: 1.6 }}>
          원내 약품 파일을 연결해 주세요.
          <br />
          원내 약품 목록 Excel(.xlsx · .xls) 또는 CSV 파일 하나를 직접 고르면 됩니다. 파일 이름은 상관없습니다.
        </p>
        <button className="btn" onClick={() => void connect()}>원내 약품 파일 연결</button>
        {error && <div className="err">{error}</div>}
      </div>
      <p className="muted">
        파일은 이 PC 에서만 읽습니다. 서버로 올리지 않고, 브라우저에 약품 목록을 따로 저장하지도 않습니다. 같은 파일을 새 내용으로
        저장하면 자동으로 다시 읽고, 다른 파일을 쓰려면 [파일 변경] 으로 고르면 됩니다. 환자 정보는 다루지 않습니다.
      </p>
    </div>
  );
}
