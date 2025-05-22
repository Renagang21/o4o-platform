import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    const ok = await login(form.email, form.password);
    setLoading(false);
    if (!ok) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    navigate("/");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">로그인</h2>
      <input name="email" className="input" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="password" className="input" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
      <button type="submit" className="btn mt-2 w-full" disabled={loading}>{loading ? "로그인 중..." : "로그인"}</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
} 