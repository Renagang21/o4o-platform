export const CAREPHARM_BOARD_EXAMPLES = [
  { name: '운영 소식·안내', description: '협업체 운영 일정과 회원 대상 안내를 나눕니다. 비회원에게도 알려야 하는 소식은 홈의 공개 공지에서 별도로 게시합니다.' },
  { name: '약국 운영 사례', description: '매장 진열, 운영 방식과 협업 경험을 공유합니다. 고객·환자의 개인정보, 처방전과 개인 건강 기록은 게시하지 않습니다.' },
  { name: '자료 활용', description: '협업체 자료를 내 매장에 가져가 활용한 경험과 개선 의견을 나눕니다. 배포용 원본 자료는 운영자의 콘텐츠 제작·심사에서 관리합니다.' },
  { name: '제품·사업 문의', description: '공급 제품과 사업 참여 조건에 관한 질문을 나눕니다. 주문·거래 업무는 선택한 약국의 내 매장에서 진행합니다.' },
] as const;

export default function CarePharmCommunityGuide({ onSelect }: { onSelect?: (item: { name: string; description: string }) => void }) {
  return <section className="my-5 rounded-xl border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-slate-700">
    <h2 className="font-semibold text-slate-900">CarePharm 회원 커뮤니티 이용 안내</h2>
    <p className="mt-2">승인된 협업체 회원이 약국 운영 경험과 자료 활용 방법을 나눕니다. 회원 글은 공개 홈의 공지에 자동 게시되지 않습니다.</p>
    <p className="mt-2">고객·환자의 개인정보나 처방전, 개인 건강 기록은 올리지 마세요. 게시글과 댓글의 수정·중재는 기존 게시판 운영 기능을 이용합니다.</p>
    {onSelect && <details className="mt-4">
      <summary className="min-h-11 cursor-pointer font-semibold text-teal-900">게시판 구성 예시 선택</summary>
      <p>필요한 예시를 선택한 뒤 이름과 설명을 확인·수정하고 게시판을 만드세요. 선택만으로 개설되지는 않습니다.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CAREPHARM_BOARD_EXAMPLES.map(item => <div key={item.name} className="rounded-lg border border-teal-100 bg-white p-4">
          <h3 className="font-semibold">{item.name}</h3><p className="mt-2">{item.description}</p>
          <button type="button" onClick={() => onSelect(item)} className="mt-3 min-h-11 text-teal-800 underline">{item.name} 예시 사용</button>
        </div>)}
      </div>
    </details>}
  </section>;
}
