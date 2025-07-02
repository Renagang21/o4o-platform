import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

interface Address {
  id: string;
  name: string;
  postal_code: string;
  address: string;
  detail: string;
  phone: string;
  is_default: boolean;
}

const ADDRESS_KEY = 'user_addresses';
const AUTH_KEY = 'authenticated'; // Simulate auth for demo

function loadAddresses(): Address[] {
  const raw = localStorage.getItem(ADDRESS_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveAddresses(addresses: Address[]) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses));
}

const ProfileAddress: React.FC = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<Omit<Address, 'id' | 'is_default'>>({ name: '', postal_code: '', address: '', detail: '', phone: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simulate auth check
  useEffect(() => {
    if (!localStorage.getItem(AUTH_KEY)) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    setAddresses(loadAddresses());
  }, []);

  const resetForm = () => {
    setForm({ name: '', postal_code: '', address: '', detail: '', phone: '' });
    setEditingId(null);
    setError(null);
    setSuccess(null);
  };

  const validate = () => {
    if (!form.name.trim() || !form.postal_code.trim() || !form.address.trim() || !form.detail.trim() || !form.phone.trim()) {
      setError('모든 항목을 입력해 주세요.');
      return false;
    }
    return true;
  };

  const handleAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validate()) return;
    if (editingId) {
      // Edit
      const updated = addresses.map(addr =>
        addr.id === editingId ? { ...addr, ...form } : addr
      );
      setAddresses(updated);
      saveAddresses(updated);
      setSuccess('주소가 수정되었습니다.');
    } else {
      // Add
      const newAddr: Address = {
        ...form,
        id: Date.now().toString(),
        is_default: addresses.length === 0, // 첫 주소는 기본
      };
      const updated = [...addresses, newAddr];
      setAddresses(updated);
      saveAddresses(updated);
      setSuccess('주소가 추가되었습니다.');
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    let updated = addresses.filter(addr => addr.id !== id);
    // 기본 주소가 삭제되면 첫 번째 주소를 기본으로
    if (!updated.some(addr => addr.is_default) && updated.length > 0) {
      updated[0].is_default = true;
    }
    setAddresses(updated);
    saveAddresses(updated);
  };

  const handleEdit = (addr: Address) => {
    setForm({ name: addr.name, postal_code: addr.postal_code, address: addr.address, detail: addr.detail, phone: addr.phone });
    setEditingId(addr.id);
    setError(null);
    setSuccess(null);
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map(addr => ({ ...addr, is_default: addr.id === id }));
    setAddresses(updated);
    saveAddresses(updated);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">배송지 관리</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}
      <form onSubmit={handleAddOrEdit} className="space-y-3 mb-8">
        <div className="flex gap-2">
          <input type="text" name="name" placeholder="이름" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2" />
          <input type="text" name="phone" placeholder="연락처" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="flex gap-2">
          <input type="text" name="postal_code" placeholder="우편번호" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} className="w-1/3 border rounded px-3 py-2" />
          <input type="text" name="address" placeholder="주소" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-2/3 border rounded px-3 py-2" />
        </div>
        <input type="text" name="detail" placeholder="상세 주소" value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} className="w-full border rounded px-3 py-2" />
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50">
            {editingId ? '수정 완료' : '주소 추가'}
          </button>
          {editingId && (
            <button type="button" className="bg-gray-300 text-gray-800 px-6 py-2 rounded font-bold hover:bg-gray-400 transition" onClick={resetForm}>
              취소
            </button>
          )}
        </div>
      </form>
      <ul className="divide-y">
        {addresses.map(addr => (
          <li key={addr.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex-1">
              <div className="font-semibold">
                {addr.name} <span className="text-gray-500 text-sm">({addr.phone})</span>
                {addr.is_default && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">기본 배송지</span>}
              </div>
              <div className="text-gray-700 text-sm">[{addr.postal_code}] {addr.address} {addr.detail}</div>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              {!addr.is_default && (
                <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200" onClick={() => handleSetDefault(addr.id)}>
                  기본 설정
                </button>
              )}
              <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300" onClick={() => handleEdit(addr)}>
                수정
              </button>
              <button className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" onClick={() => handleDelete(addr.id)}>
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ProtectedProfileAddress = () => (
  <ProtectedRoute>
    <ProfileAddress />
  </ProtectedRoute>
);
export default ProtectedProfileAddress; 