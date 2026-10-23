import { useState } from 'react';

const GUIDES = [
  { name: '약국 운영 사례', prompts: ['어떤 약국 업무에 적용했나요?', '진열·안내물·업무 방식을 어떻게 바꿨나요?', '다른 회원 약국에 전하고 싶은 점은 무엇인가요?'] },
  { name: '자료 요청', prompts: ['필요한 주제와 자료 형태는 무엇인가요?', '어떤 매장 업무에 사용하려고 하나요?', '기존 자료에서 보완할 부분이 있나요?'] },
  { name: '제품·공급 문의', prompts: ['문의할 제품이나 공급 제안은 무엇인가요?', '확인할 공급조건이나 이용 절차는 무엇인가요?', '운영진에게 확인받고 싶은 내용을 구체적으로 적어 주세요.'] },
] as const;

/** Writing help only; board permissions and post classification remain unchanged. */
export function CarePharmPostGuide() {
  const [index, setIndex] = useState(0);
  return <section aria-label="CarePharm 회원 글 작성 도움" className="space-y-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm">
    <h2 className="font-semibold">회원 약국과 나눌 내용을 정리해 보세요</h2>
    <div className="flex flex-wrap gap-2">{GUIDES.map((guide, i) => <button key={guide.name} type="button" aria-pressed={index === i} className={`min-h-11 rounded border px-3 py-2 ${index === i ? 'bg-teal-800 text-white' : 'bg-white'}`} onClick={() => setIndex(i)}>{guide.name} 작성 도움</button>)}</div>
    <ul className="list-inside list-disc space-y-2">{GUIDES[index].prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul>
    <p>게시판의 용도에 맞게 제목과 본문을 작성하세요. 고객·환자의 개인정보, 처방전, 개인 건강 기록은 올리지 마세요.</p>
    <p>배포할 자료 원본은 운영진의 회원자료 게시를 거쳐 제공합니다. 이 글을 작성해도 내 매장 자료로 자동 등록되지 않습니다.</p>
  </section>;
}
