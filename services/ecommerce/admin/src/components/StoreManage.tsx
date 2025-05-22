import React, { useState } from "react";

export default function StoreManage() {
  const [form, setForm] = useState({
    name: "",
    owner: "",
    memo: "",
    address: "",
  });
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("저장되었습니다. (실제 저장은 연동 예정)");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">스토어 관리</h2>
      <input name="name" className="input" placeholder="스토어명" value={form.name} onChange={handleChange} />
      <input name="owner" className="input" placeholder="대표자" value={form.owner} onChange={handleChange} />
      <textarea name="memo" className="input" placeholder="메모" value={form.memo} onChange={handleChange} />
      <input name="address" className="input" placeholder="주소" value={form.address} onChange={handleChange} />
      <button type="submit" className="btn mt-2">저장</button>
      {success && <div className="text-green-600 mt-2">{success}</div>}
    </form>
  );
} 