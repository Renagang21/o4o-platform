import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("모든 항목을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    const ok = await register({
      name: form.name,
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (!ok) {
      setError("이미 존재하는 이메일이거나 가입에 실패했습니다.");
      return;
    }
    navigate("/");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">회원가입</h2>
      <input name="name" className="input" placeholder="이름" value={form.name} onChange={handleChange} required />
      <input name="email" className="input" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="password" className="input" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
      <button type="submit" className="btn mt-2 w-full" disabled={loading}>{loading ? "가입 중..." : "회원가입"}</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
} 