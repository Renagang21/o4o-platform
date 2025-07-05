import React, { useState } from "react";
import { apiFetch } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) {
      setError("이메일을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/store/customers/password-token", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess("비밀번호 재설정 링크가 이메일로 전송되었습니다.");
    } catch (e: any) {
      setError(e.message || "메일 전송 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">비밀번호 찾기</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <input
        type="email"
        className="input mb-2"
        placeholder="이메일"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <button type="submit" className="btn w-full" disabled={loading}>{loading ? "전송 중..." : "비밀번호 재설정 메일 보내기"}</button>
    </form>
  );
} 