import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Link } from "react-router-dom";

interface ProfileData {
  first_name: string;
  email: string;
  phone?: string;
  address?: string;
}

export default function Profile() {
  const [form, setForm] = useState<ProfileData>({ first_name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<ProfileData>("/store/customers/me", {}, true)
      .then((data) => {
        setForm({
          first_name: data.first_name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
        });
        setError("");
      })
      .catch((e) => setError(e.message || "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/store/customers/me", {
        method: "POST",
        body: JSON.stringify({
          first_name: form.first_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
        }),
      }, true);
      setSuccess("저장되었습니다.");
    } catch (e: any) {
      setError(e.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">내 프로필</h2>
      <div className="mb-4 text-right">
        <Link to="/profile/password" className="text-blue-600 underline">비밀번호 변경</Link>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <input name="first_name" className="input mb-2" placeholder="이름" value={form.first_name} onChange={handleChange} required />
      <input name="email" className="input mb-2" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="phone" className="input mb-2" placeholder="전화번호" value={form.phone || ""} onChange={handleChange} />
      <input name="address" className="input mb-2" placeholder="주소" value={form.address || ""} onChange={handleChange} />
      <button type="submit" className="btn w-full" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
} 