import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HOSPITAL_DRUG_TARGET_SCHEMA,
  HOSPITAL_DRUG_FILE_ACCEPT,
  makeHospitalDrugDataset,
  normalizedRecordsToHospitalRows,
  type HospitalDrugDataset,
} from '@o4o/hospital-pharmacy-core';
import { loadDataset, saveDataset, clearDataset } from '../lib/localStore';
import { requestFileUnderstanding, AiRequestError } from '../lib/aiRequest';

export default function PharmacyDeptPage() {
  const [dataset, setDataset] = useState<HospitalDrugDataset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidenceQ, setConfidenceQ] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDataset(loadDataset()); }, []);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setConfidenceQ(null);
    setSummary(null);
    try {
      // 공통 GFU — 임의 표 파일 → 구조 이해. targetSchema 는 이 클라이언트가 주입한다(도메인 중립).
      const reply = await requestFileUnderstanding(file, HOSPITAL_DRUG_TARGET_SCHEMA);
      const { rows, total, skipped } = normalizedRecordsToHospitalRows(reply.records);
      if (rows.length === 0) {
        setError('이 파일에서 원내 약품 행을 찾지 못했습니다. 제품명 열이 있는 목록인지 확인해 주세요.');
        return;
      }
      const next = makeHospitalDrugDataset(file.name, rows);
      const saved = saveDataset(next);
      if (!saved.ok) {
        setError('원내 자료를 이 브라우저에 저장하지 못했습니다. 항목이 더 적은 파일로 시도해 주세요.');
        return;
      }
      setDataset(next);
      setSummary(`'${file.name}' 을(를) 원내 자료로 연결했습니다. 총 ${total}행 중 ${rows.length}건 등록${skipped > 0 ? ` · 제품명 없는 ${skipped}행 제외` : ''}.`);
      // 낮은 신뢰도 열이 있으면(전부가 아니라 낮은 항목만) 확인 문구를 노출한다.
      if (reply.question) setConfidenceQ(reply.question);
    } catch (err) {
      if (err instanceof AiRequestError && err.status === 401) {
        setError('로그인 세션이 확인되지 않습니다. 이 서비스에 다시 로그인한 뒤 파일을 올려 주세요.');
        return;
      }
      setError(err instanceof Error ? err.message : '파일을 이해하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function disconnect() {
    clearDataset();
    setDataset(null);
    setSummary(null);
    setConfidenceQ(null);
    setError(null);
  }

  return (
    <div className="tool">
      <h1>약제부 — 원내 목록 연결</h1>
      <p className="muted">
        원내 보유 목록 파일(xlsx·xls·csv)을 올리면 공통 파일 이해가 표 구조를 해석해 원내 데이터로 연결합니다.
        파일은 서버에 저장되지 않고, 결과는 이 브라우저에만 저장됩니다. 환자 정보는 올리지 마세요.
      </p>

      <div className="panel">
        <h3>현재 원내 자료</h3>
        {dataset ? (
          <div className="ds">
            <div className="meta">
              <b>{dataset.fileName}</b> · {dataset.count}건 · 연결 {new Date(dataset.connectedAt).toLocaleString('ko-KR')}
            </div>
            <button className="btn ghost" onClick={disconnect} disabled={busy}>연결 해제</button>
          </div>
        ) : (
          <div className="meta">아직 연결된 원내 자료가 없습니다.</div>
        )}
      </div>

      <div className="panel">
        <h3>{dataset ? '원내 목록 교체' : '원내 목록 올리기'}</h3>
        <input
          ref={fileRef}
          type="file"
          accept={HOSPITAL_DRUG_FILE_ACCEPT}
          disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
        />
        {busy && <div className="notice">파일을 이해하는 중입니다…</div>}
      </div>

      {summary && <div className="answer">{summary}</div>}
      {confidenceQ && <div className="notice">{confidenceQ}<br />열 해석이 맞는지 확인하고, 필요하면 열 제목을 명확히 한 파일로 다시 올려 주세요.</div>}
      {error && <div className="err">{error}</div>}

      <p className="muted" style={{ marginTop: 20 }}>
        연결 후 <Link to="/ward">병동</Link> 에서 "우리 원내에 … 있어?"·"같은 성분 원내약 있어?" 로 원내 보유를 함께 확인할 수 있습니다.
      </p>
    </div>
  );
}
