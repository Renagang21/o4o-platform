/**
 * Hospital Pharmacy — 원내 약품 폴더 연결 게이트(무로그인)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION §3·§14·§17
 *
 * 개인 로그인 · 계정 · 연결 코드는 없다. 이 게이트는 "이 PC 의 원내 약품 파일을 읽을 수 있는가"만 다룬다.
 * 파일을 읽을 수 있으면(ready) 자식(홈·병동·원내 약품 파일)을 그대로 렌더한다.
 */
import type { ReactNode } from 'react';
import { useLocalDrugs } from '../contexts/LocalDrugContext';
import { HOSPITAL_DRUG_FILE_NAME } from '../lib/localDrugFile';
import { SUPPORTED_BROWSER_NOTICE } from '../lib/browserSupport';
import { BRAND } from '../config/service';

export default function FolderGate({ children }: { children: ReactNode }) {
  const { status, folderName, error, connect, allowAccess, reload } = useLocalDrugs();

  if (status === 'ready') return <>{children}</>;

  if (status === 'checking' || status === 'loading') {
    return (
      <div className="tool">
        <p className="muted">{status === 'loading' ? `${HOSPITAL_DRUG_FILE_NAME} 을(를) 읽는 중입니다…` : '원내 약품 파일 연결을 확인하는 중입니다…'}</p>
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
          지금 브라우저에서는 원내 약품 폴더를 연결할 수 없습니다. Chrome 또는 Edge 로 이 주소를 열어 주세요.
        </div>
      </div>
    );
  }

  if (status === 'needs-permission') {
    return (
      <div className="tool">
        <h1>{BRAND.name}</h1>
        <p className="muted">
          원내 약품 폴더{folderName ? <> (<b>{folderName}</b>)</> : null} 가 연결돼 있습니다. 브라우저가 이번 접속에서 파일 읽기를
          다시 확인합니다. 아래 버튼을 누르고 권한 창에서 허용해 주세요. 권한 창에 &ldquo;방문할 때마다 허용&rdquo; 이 보이면 그것을 고르면 다음부터는 묻지 않습니다.
        </p>
        <div className="row">
          <button className="btn" onClick={() => void allowAccess()}>원내 약품 파일 읽기 허용</button>
          <button className="btn ghost" onClick={() => void connect()}>다른 폴더 연결</button>
        </div>
        {error && <div className="err">{error}</div>}
      </div>
    );
  }

  if (status === 'file-missing') {
    return (
      <div className="tool">
        <h1>{BRAND.name}</h1>
        <div className="err">
          {HOSPITAL_DRUG_FILE_NAME} 파일을 찾지 못했습니다.
          <br />
          지정 폴더{folderName ? <> (<b>{folderName}</b>)</> : null} 에 같은 이름으로 저장해 주세요.
        </div>
        <div className="row">
          <button className="btn" onClick={() => void reload()}>다시 확인</button>
          <button className="btn ghost" onClick={() => void connect()}>다른 폴더 연결</button>
        </div>
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
          <button className="btn ghost" onClick={() => void connect()}>다른 폴더 연결</button>
        </div>
      </div>
    );
  }

  // unconnected — 최초 1회 연결(§14)
  return (
    <div className="tool">
      <h1>{BRAND.name}</h1>
      <p className="muted">{SUPPORTED_BROWSER_NOTICE}</p>
      <div className="panel">
        <p style={{ marginTop: 0, lineHeight: 1.6 }}>
          원내 약품 파일이 있는 폴더를 연결해 주세요.
          <br />
          파일명은 <b>{HOSPITAL_DRUG_FILE_NAME}</b> 여야 합니다. (예: C:\O4O\{HOSPITAL_DRUG_FILE_NAME})
        </p>
        <button className="btn" onClick={() => void connect()}>원내 약품 폴더 연결</button>
        {error && <div className="err">{error}</div>}
      </div>
      <p className="muted">
        파일은 이 PC 에서만 읽습니다. 서버로 올리지 않고, 브라우저에 약품 목록을 따로 저장하지도 않습니다. 새 목록은 같은 파일명으로
        덮어쓰면 자동으로 반영됩니다. 환자 정보는 다루지 않습니다.
      </p>
    </div>
  );
}
