import React, { useState } from "react";
import { apiFetch } from "../api";

export default function ChangePassword() {
  const [form, setForm] = useState({ old_password: "", new_password: "", new_password2: "" });
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
    if (!form.old_password || !form.new_password || !form.new_password2) {
      setError("모든 항목을 입력해 주세요.");
      return;
    }
    if (form.new_password !== form.new_password2) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/store/customers/password", {
        method: "POST",
        body: JSON.stringify({
          old_password: form.old_password,
          new_password: form.new_password,
        }),
      }, true);
      setSuccess("비밀번호가 변경되었습니다.");
      setForm({ old_password: "", new_password: "", new_password2: "" });
    } catch (e: any) {
      setError(e.message || "비밀번호 변경 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">비밀번호 변경</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <input name="old_password" className="input mb-2" type="password" placeholder="현재 비밀번호" value={form.old_password} onChange={handleChange} required />
      <input name="new_password" className="input mb-2" type="password" placeholder="새 비밀번호" value={form.new_password} onChange={handleChange} required />
      <input name="new_password2" className="input mb-2" type="password" placeholder="새 비밀번호 확인" value={form.new_password2} onChange={handleChange} required />
      <button type="submit" className="btn w-full" disabled={saving}>{saving ? "변경 중..." : "비밀번호 변경"}</button>
    </form>
  );
} 