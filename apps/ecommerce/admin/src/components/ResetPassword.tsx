import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", password2: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.password || !form.password2) {
      setError("새 비밀번호를 입력해 주세요.");
      return;
    }
    if (form.password !== form.password2) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!token) {
      setError("잘못된 접근입니다.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/store/customers/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: form.password,
        }),
      });
      setSuccess("비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (e: any) {
      setError(e.message || "비밀번호 재설정 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">비밀번호 재설정</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <input
        name="password"
        className="input mb-2"
        type="password"
        placeholder="새 비밀번호"
        value={form.password}
        onChange={handleChange}
        required
      />
      <input
        name="password2"
        className="input mb-2"
        type="password"
        placeholder="새 비밀번호 확인"
        value={form.password2}
        onChange={handleChange}
        required
      />
      <button type="submit" className="btn w-full" disabled={saving}>{saving ? "변경 중..." : "비밀번호 재설정"}</button>
    </form>
  );
} 