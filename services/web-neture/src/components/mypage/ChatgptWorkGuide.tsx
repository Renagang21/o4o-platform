import { useEffect, useRef, useState } from "react";

const examples = [
  {
    title: "거래장 입력 준비",
    request:
      "이 사진의 거래명세서를 O4O 거래장 초안으로 준비해 줘. 불명확한 값은 확인 필요로 남기고, 내가 검토·수정하고 거래장에 반영할 수 있는 주소를 알려 줘.",
  },
  {
    title: "O4O 자료 읽기",
    request:
      "O4O 내 매장 자료함에서 안내문을 찾아 읽고, 직원이 보기 쉽게 정리해 줘.",
  },
  {
    title: "거래명세서 확인",
    request:
      "O4O 작업이야. 첨부한 거래명세서의 거래처·일자·품목·수량·단위·금액을 표로 정리해 줘. 읽기 어려운 곳은 추측하지 말고 확인 필요로 표시해 줘. 아직 저장하지 말고 내가 확인할 수 있게 보여 줘.",
  },
  {
    title: "확인한 결과 보관",
    request:
      "방금 내가 확인한 정리 내용을 O4O 내 매장 자료함에 비공개 문서로 저장하고, 다시 열어 확인할 수 있는 주소를 알려 줘.",
  },
];

export default function ChatgptWorkGuide() {
  const [message, setMessage] = useState("");
  const attempt = useRef(0);
  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  async function copy(title: string, request: string) {
    const current = ++attempt.current;
    setMessage("");
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(request);
      if (current === attempt.current)
        setMessage(
          `${title} 예시를 복사했습니다. ChatGPT에 붙여 넣어 사용하세요.`,
        );
    } catch {
      if (current === attempt.current)
        setMessage(
          "복사하지 못했습니다. 화면에 보이는 예시 문장을 직접 선택해 복사해 주세요.",
        );
    }
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer font-medium">
        ChatGPT에서 O4O 작업하기
      </summary>
      <div className="mt-3 space-y-4 text-sm text-slate-700">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            ChatGPT의 앱·연결 메뉴에서 ‘O4O 서비스 연결’을 찾아 연결합니다.
            O4O에 로그인하고 사용할 작업공간과 자료 조회·초안 저장 권한을
            선택하세요.
          </li>
          <li>
            ChatGPT에 평소처럼 요청하세요. 처음에는 ‘O4O’ 또는 ‘O4O 작업’을
            넣으면 의도를 전하기 쉽습니다. 필수 명령어는 아니며, 다르게
            이해했다면 ‘O4O 자료로 해 줘’라고 이어서 말하면 됩니다.
          </li>
          <li>
            거래명세서는 사진이나 파일을 ChatGPT에 첨부하세요. ChatGPT가 정리한
            내용을 확인·수정한 뒤 O4O에 문서로 저장하도록 요청할 수 있습니다.
          </li>
        </ol>
        <p>
          자료함 문서 저장과 거래장 원장 반영은 다릅니다. ‘확인한 결과 보관’은
          비공개 문서 보관입니다. 거래장 입력은 별도 동의 후 초안을 준비하고 O4O
          확인 화면에서 직접 반영합니다. 주문·결제는 실행하지 않습니다.
        </p>
        <div className="space-y-3">
          {examples.map((example) => (
            <div
              key={example.title}
              className="space-y-2 rounded border bg-white p-3"
            >
              <p className="font-medium">{example.title}</p>
              <p className="whitespace-pre-wrap break-words">
                {example.request}
              </p>
              <button
                type="button"
                className="rounded border px-3 py-2"
                onClick={() => void copy(example.title, example.request)}
              >
                {example.title} 예시 복사
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600">
          아래는 O4O에 기록된 연결입니다. 앱 설치 여부나 지금 ChatGPT에서 사용할
          수 있는지는 해당 채팅에서도 확인하세요. 연결이 없거나 만료됐다면
          ChatGPT에서 다시 연결할 수 있습니다.
        </p>
        {message && (
          <p role="status" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </details>
  );
}
