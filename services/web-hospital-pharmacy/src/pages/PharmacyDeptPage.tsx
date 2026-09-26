import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocalDrugs } from '../contexts/LocalDrugContext';
import { HOSPITAL_DRUG_FILE_NAME } from '../lib/localDrugFile';

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 원내 약품 파일 상태 — 연결된 실제 파일의 최종 수정 · 품목 수(§14). 파일은 올리지 않는다. */
export default function PharmacyDeptPage() {
  const { file, folderName, error, reload, connect } = useLocalDrugs();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <h1>원내 약품 파일</h1>
      <p className="muted">
        이 PC 의 지정 폴더에 있는 <b>{HOSPITAL_DRUG_FILE_NAME}</b> 을(를) 그대로 읽습니다. 새 목록을 받으면 같은 이름으로 덮어써 주세요 —
        화면으로 돌아오거나 조회할 때 자동으로 다시 읽습니다. 파일은 서버로 올라가지 않습니다.
      </p>

      <div className="panel">
        <h3>원내 약품 파일 연결됨</h3>
        {file && (
          <div className="ds">
            <div className="meta">
              <b>{file.fileName}</b>{folderName ? <> · 폴더 {folderName}</> : null}
              <br />
              최종 수정: {formatDateTime(file.lastModified)}
              <br />
              품목 수: {file.rows.length}
              {file.skipped > 0 ? <> · 제품명 없는 {file.skipped}행 제외</> : null}
              <br />
              구조 이해: {file.mappingReused ? '저장된 구조 재사용' : '새로 이해함'}
            </div>
            <div className="row" style={{ marginTop: 0 }}>
              <button className="btn ghost" disabled={busy} onClick={() => void run(reload)}>지금 다시 읽기</button>
              <button className="btn ghost" disabled={busy} onClick={() => void run(connect)}>다른 폴더 연결</button>
            </div>
          </div>
        )}
      </div>

      {file?.question && (
        <div className="notice">{file.question}<br />열 해석이 맞는지 확인하고, 필요하면 열 제목을 명확히 한 뒤 같은 이름으로 저장해 주세요.</div>
      )}
      {error && <div className="err">{error}</div>}

      <p className="muted" style={{ marginTop: 20 }}>
        <Link to="/ward">병동</Link> 에서 &ldquo;우리 원내에 … 있어?&rdquo;·&ldquo;같은 성분 원내약 있어?&rdquo; 로 원내 보유를 함께 확인할 수 있습니다.
      </p>
    </div>
  );
}
