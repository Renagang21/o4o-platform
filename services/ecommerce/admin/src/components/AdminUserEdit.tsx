import React, { useState, useEffect } from "react";
import { useAdminUsers, AdminRole } from "./AdminUserContext";
import { useParams, useNavigate } from "react-router-dom";

const ROLES: AdminRole[] = ["superadmin", "manager", "viewer"];

export default function AdminUserEdit() {
  const { id } = useParams<{ id: string }>();
  const { getUser, updateUser } = useAdminUsers();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "manager" as AdminRole });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const user = getUser(id);
    if (!user) {
      setError("계정을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    setForm({ email: user.email, name: user.name, password: user.password, role: user.role });
    setLoading(false);
  }, [id, getUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.name || !form.password) {
      setError("모든 항목을 입력해 주세요.");
      return;
    }
    setSaving(true);
    if (id) updateUser(id, form);
    setSaving(false);
    navigate("/admin/users");
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto border rounded bg-white mt-6">
      <h2 className="text-xl font-bold mb-4">관리자 계정 수정</h2>
      <input name="email" className="input mb-2" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="name" className="input mb-2" placeholder="이름" value={form.name} onChange={handleChange} required />
      <input name="password" className="input mb-2" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
      <select name="role" className="input mb-2" value={form.role} onChange={handleChange} required>
        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button type="submit" className="btn w-full" disabled={saving}>{saving ? "저장 중..." : "수정"}</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
} 