import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts";
import { personalMailApi, mailErrorMessage } from "../../api/personalMail";
export default function PersonalMailCallback() {
  const { isAuthenticated, isLoading } = useAuth(),
    navigate = useNavigate();
  const params = useRef(new URLSearchParams(window.location.search)),
    started = useRef(false),
    [error, setError] = useState("");
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  useEffect(() => {
    if (isLoading || !isAuthenticated || started.current) return;
    started.current = true;
    const state = params.current.get("state"),
      code = params.current.get("code");
    if (!state || !code) {
      setError(
        "메일 연결을 완료하지 못했습니다. 메일 관리 화면에서 다시 연결해 주세요.",
      );
      return;
    }
    void personalMailApi
      .gmailComplete(state, code)
      .then(() => navigate("/mypage/mail", { replace: true }))
      .catch((e) => setError(mailErrorMessage(e)));
  }, [isAuthenticated, isLoading, navigate]);
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Gmail 연결 확인</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : isLoading || isAuthenticated ? (
        <p role="status">메일 연결을 확인하고 있습니다…</p>
      ) : (
        <p>
          O4O 로그인 상태를 확인한 뒤 메일 관리 화면에서 다시 연결해 주세요.
        </p>
      )}
      <button
        className="rounded border px-4 py-3"
        onClick={() => navigate("/mypage/mail", { replace: true })}
      >
        개인 메일 관리로 이동
      </button>
    </main>
  );
}
