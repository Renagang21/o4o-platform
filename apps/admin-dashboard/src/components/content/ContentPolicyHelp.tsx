type HelpContext = 'media' | 'content' | 'placement';

const CONTEXT_HELP: Record<HelpContext, string> = {
  media: '미디어 자료의 정보와 분류를 관리합니다. 자료를 저장하는 것과 화면에 게시하는 것은 별개입니다.',
  content: '콘텐츠를 작성하고 공개 범위와 게시 상태를 설정합니다. 초안 저장만으로 화면에 공개되지 않습니다.',
  placement: '콘텐츠를 보여줄 화면의 위치를 관리합니다. 사용할 콘텐츠와 게시 위치의 설정을 함께 확인하세요.',
};

/** WO-O4O-ADMIN-MENU-TIDY-PHASE1-V1: standalone policy navigation becomes contextual help. */
export default function ContentPolicyHelp({ context }: { context: HelpContext }) {
  return (
    <details className="my-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
      <summary className="cursor-pointer font-medium text-gray-800">관리 도움말</summary>
      <div className="mt-3 space-y-2 text-gray-600">
        <p>{CONTEXT_HELP[context]}</p>
        <p>이 관리자에서는 플랫폼 공용 자료와 콘텐츠를 관리합니다. 서비스 자체의 자료와 일상 운영은 해당 서비스에서 관리합니다.</p>
        <p>공개 범위는 누가 이용할 수 있는지를, 게시 상태는 현재 게시 여부를 나타냅니다. 게시 전 두 설정을 함께 확인하세요.</p>
      </div>
    </details>
  );
}
