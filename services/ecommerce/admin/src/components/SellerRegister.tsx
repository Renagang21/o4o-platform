import React, { useState } from "react";
import { useSellerAuth } from "./SellerAuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function SellerRegister() {
  const { register } = useSellerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await register(form.name, form.email, form.password);
    setLoading(false);
    if (!ok) {
      setError("이미 존재하는 이메일이거나 가입에 실패했습니다.");
      return;
    }
    navigate("/seller/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">판매자 회원가입</h2>
      <input name="name" className="input mb-2" placeholder="이름" value={form.name} onChange={handleChange} required />
      <input name="email" className="input mb-2" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="password" className="input mb-2" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
      <button type="submit" className="btn w-full" disabled={loading}>{loading ? "가입 중..." : "회원가입"}</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <div className="mt-4 text-right">
        <Link to="/seller/login" className="text-blue-600 underline">판매자 로그인</Link>
      </div>
    </form>
  );
} 