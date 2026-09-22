import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  mentionsHospital,
  mentionsSameIngredient,
  extractProduct,
  extractStrength,
  queryLocalRows,
  matchLocalByResearchIngredients,
  renderLocalContextBlock,
  type HospitalDrugDataset,
} from '@o4o/hospital-pharmacy-core';
import { loadDataset } from '../lib/localStore';
import { sendHospitalRequest, AiRequestError } from '../lib/aiRequest';

// 화면-국소 질의 파싱: 조사(josa)·불용어를 떼어 2자 이상 needle 만 남긴다.
// 도메인 규칙(제품/함량/원내/동일성분)은 @o4o/hospital-pharmacy-core 가 소유하고, 여기서는 표시용 needle 만 만든다.
const STOPWORDS = new Set([
  '우리', '원내', '병원', '약국', '있어', '있나', '있나요', '있는지', '없어', '없나요',
  '같은', '동일', '성분', '대체', '대체약', '조사', '조사해', '조사해줘', '알려', '알려줘',
  '확인', '보유', '재고', '해줘', '해주세요', '뭐', '무엇', '어떤',
]);
function extractLocalNeedles(text: string): string[] {
  const out = new Set<string>();
  const product = extractProduct(text);
  if (product) out.add(product);
  for (const raw of text.split(/[\s,./·]+/)) {
    let t = raw.replace(/["'"'`]/g, '').trim();
    // 흔한 조사 어미 제거
    t = t.replace(/(은|는|이|가|을|를|에|의|과|와|도|만|랑|이랑|에서|에게)$/u, '');
    if (t.length >= 2 && !STOPWORDS.has(t)) out.add(t);
  }
  return [...out];
}

export default function WardPage() {
  const [dataset, setDataset] = useState<HospitalDrugDataset | null>(null);
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnect, setReconnect] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => { setDataset(loadDataset()); }, []);

  const submit = useCallback(async (text: string) => {
    if (!text || pending) return;
    setPending(true);
    setError(null);
    setReconnect(false);
    setQuestion(text);
    setAnswer(null);
    try {
      const sameIngredient = dataset ? mentionsSameIngredient(text) : false;
      const hospitalOnly = dataset ? mentionsHospital(text) && !sameIngredient : false;

      // ── 원내 보유 조회(local_only) — 브라우저 데이터로 완전히 답한다. 서버 불요(D2 Local-first). ──
      if (dataset && hospitalOnly) {
        const needles = extractLocalNeedles(text);
        const strength = extractStrength(text);
        const matches = queryLocalRows(dataset.rows, needles.length > 0 ? needles : [text], { limit: 50 });
        const label = needles.length > 0 ? needles.join(' · ') : text.trim();
        setInput('');
        setAnswer(`'${label}' 의 원내 보유 여부를 확인했습니다.\n\n${renderLocalContextBlock(matches, strength)}`);
        return;
      }

      // ── 그 밖 — 공통 Core 조사. 원내 데이터가 있으면 localSource='client'(서버 원내 조회 끔). ──
      const reply = await sendHospitalRequest({
        text,
        ...(dataset ? { localSource: 'client' as const } : {}),
      });
      setInput('');
      if (reply.kind === 'work') {
        setAnswer('이 요청은 화면 자동화(PC) 작업으로 판정되었습니다. PC 자동화 연결이 필요합니다.');
        return;
      }

      let text_answer = reply.message;
      // ── 동일성분(research_and_local) 결합 — 서버 조사 위에 원내 Context 를 브라우저에서 얹는다. ──
      if (dataset && sameIngredient) {
        const strength = extractStrength(text);
        const needles = extractLocalNeedles(text);
        const byTerms = needles.length > 0 ? queryLocalRows(dataset.rows, needles, { limit: 50 }) : [];
        const byIngredient = matchLocalByResearchIngredients(dataset.rows, text_answer, 50);
        const seen = new Set<string>();
        const merged = [...byTerms, ...byIngredient].filter((r) => {
          if (seen.has(r.product_name)) return false;
          seen.add(r.product_name);
          return true;
        });
        text_answer = `${text_answer}\n\n[원내 약품] 같은 성분 원내 보유 현황\n${renderLocalContextBlock(merged, strength)}`;
      }
      setAnswer(text_answer);
    } catch (err) {
      if (err instanceof AiRequestError && err.status === 401) {
        setReconnect(true);
        return;
      }
      setError(err instanceof Error ? err.message : '응답을 생성하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  }, [dataset, pending]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void submit(input.trim()); };

  return (
    <div className="tool">
      <h1>병동 — 자연어 조사</h1>
      <p className="muted">
        약품 효능·성분·주의사항 조사와 원내 보유 확인을 한곳에서. 원내 목록이 연결돼 있으면 "우리 원내에 …
        있어?"·"같은 성분 원내약 있어?" 도 함께 답합니다.
      </p>

      <div className="panel">
        <div className="ds">
          <div className="meta">
            {dataset
              ? <>원내 자료 연결됨 — <b>{dataset.fileName}</b> · {dataset.count}건</>
              : <>원내 자료가 연결되지 않았습니다. 조사만 가능합니다.</>}
          </div>
          <Link to="/pharmacy" className="btn ghost" style={{ textDecoration: 'none' }}>
            {dataset ? '원내 자료 관리' : '원내 자료 연결'}
          </Link>
        </div>
      </div>

      <form onSubmit={onSubmit} className="panel">
        <textarea
          className="field"
          placeholder='예: "타이레놀정500mg 효능·주의사항 조사" · "우리 원내에 아세트아미노펜 있어?" · "아모디핀정과 같은 성분 원내약 있어?"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <div className="row">
          <button className="btn" type="submit" disabled={pending || input.trim().length === 0}>
            {pending ? '조사 중…' : '조사'}
          </button>
        </div>
      </form>

      {reconnect && (
        <div className="notice">
          로그인 세션이 만료되었거나 확인되지 않습니다. 이 서비스에 다시 로그인한 뒤 조사해 주세요.
        </div>
      )}
      {error && <div className="err">{error}</div>}
      {question && !error && (
        <div className="panel">
          <div className="muted" style={{ marginBottom: 8 }}>질문</div>
          <div>{question}</div>
          {answer && <div className="answer">{answer}</div>}
        </div>
      )}
    </div>
  );
}
