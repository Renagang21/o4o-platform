import React, { useState } from "react";
import { useSellerAuth } from "./SellerAuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function SellerLogin() {
  const { login } = useSellerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(form.email, form.password);
    setLoading(false);
    if (!ok) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    navigate("/seller/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">판매자 로그인</h2>
      <input name="email" className="input mb-2" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="password" className="input mb-2" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
      <button type="submit" className="btn w-full" disabled={loading}>{loading ? "로그인 중..." : "로그인"}</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <div className="mt-4 text-right">
        <Link to="/seller/register" className="text-blue-600 underline">판매자 회원가입</Link>
      </div>
    </form>
  );
} 