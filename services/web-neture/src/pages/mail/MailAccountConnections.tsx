import { useState } from "react";
import { personalMailApi, mailErrorMessage } from "../../api/personalMail";

export function MailAccountConnections({
  gmailAvailable,
  naverAvailable,
  onChanged,
}: {
  readonly gmailAvailable: boolean;
  readonly naverAvailable: boolean;
  readonly onChanged: () => Promise<void>;
}) {
  const [address, setAddress] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function gmail() {
    setBusy(true);
    setError("");
    try {
      const result = await personalMailApi.gmailStart();
      window.location.assign(result.authorizationUrl);
    } catch (e) {
      setError(mailErrorMessage(e));
      setBusy(false);
    }
  }
  async function naver(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await personalMailApi.naver(address, password);
      setAddress("");
      await onChanged();
    } catch (e) {
      setError(mailErrorMessage(e));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5"
      aria-label="메일 계정 연결"
    >
      <h2 className="font-semibold">메일 계정 연결</h2>
      <p className="text-sm text-slate-600">
        O4O 로그인 계정과 메일 주소가 달라도 됩니다. 연결한 본인의 메일만
        관리합니다.
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        className="rounded border px-4 py-3 disabled:opacity-50"
        disabled={busy || !gmailAvailable}
        onClick={() => void gmail()}
      >
        {gmailAvailable ? "Gmail 연결" : "Gmail 연결 준비 중"}
      </button>
      {naverAvailable && (
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(event) => void naver(event)}
        >
          <h3 className="font-medium">네이버 메일 연결</h3>
          <label className="block">
            네이버 메일 주소
            <input
              className="mt-1 block w-full rounded border p-2"
              type="email"
              required
              autoComplete="username"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block">
            네이버 앱 비밀번호
            <input
              className="mt-1 block w-full rounded border p-2"
              type="password"
              required
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <p className="text-sm text-slate-600">
            네이버에서 IMAP 사용을 허용하고 앱 비밀번호를 발급한 뒤 연결하세요.
            제공자가 지원하는 보관·휴지통 기능만 사용합니다.
          </p>
          <button
            className="rounded border px-4 py-3 disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
            네이버 연결
          </button>
        </form>
      )}
    </section>
  );
}
