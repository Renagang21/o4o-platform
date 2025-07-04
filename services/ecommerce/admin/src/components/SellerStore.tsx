import React, { useState } from "react";
import { useSeller } from "./SellerContext";

export default function SellerStore() {
  const { seller, updateSeller } = useSeller();
  const [form, setForm] = useState({
    name: seller?.name || "",
    email: seller?.email || "",
    storeName: seller?.storeName || "",
    phone: seller?.phone || "",
  });
  const [success, setSuccess] = useState("");

  if (!seller) {
    return <div className="p-4 border rounded bg-white max-w-lg mx-auto">판매자 등록이 필요합니다.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSeller(form);
    setSuccess("저장되었습니다.");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">내 스토어 정보</h2>
      <input name="name" className="input" placeholder="이름" value={form.name} onChange={handleChange} required />
      <input name="email" className="input" placeholder="이메일" value={form.email} onChange={handleChange} required />
      <input name="storeName" className="input" placeholder="스토어명" value={form.storeName} onChange={handleChange} required />
      <input name="phone" className="input" placeholder="연락처" value={form.phone} onChange={handleChange} required />
      <button type="submit" className="btn mt-2 w-full">저장</button>
      {success && <div className="text-green-600 mt-2">{success}</div>}
    </form>
  );
} 