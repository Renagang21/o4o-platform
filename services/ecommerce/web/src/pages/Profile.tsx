import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
// import { useAuthStore } from '../store/authStore'; // Uncomment if you have auth state
// import ProtectedRoute from '../components/ProtectedRoute'; // Uncomment if you have a ProtectedRoute

interface ProfileData {
  first_name: string;
  email: string;
  address_1: string;
  phone: string;
}

const Profile: React.FC = () => {
  // const { user } = useAuthStore(); // If you have auth state
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<ProfileData>({ first_name: '', email: '', address_1: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/store/customers/me');
        if (res.status === 401) {
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('사용자 정보를 불러오지 못했습니다.');
        const data = await res.json();
        setProfile(data.customer);
        setForm({
          first_name: data.customer.first_name || '',
          email: data.customer.email || '',
          address_1: data.customer.address_1 || '',
          phone: data.customer.phone || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '에러 발생');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/store/customers/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('정보 수정에 실패했습니다.');
      setSuccess('정보가 성공적으로 수정되었습니다.');
      setEditing(false);
      // 최신 정보 반영
      const data = await res.json();
      setProfile(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 중 에러 발생');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }
  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  // const content = (
  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">내 프로필</h1>
      {success && <div className="mb-4 text-green-600">{success}</div>}
      {!editing ? (
        <div className="space-y-4">
          <div>
            <span className="font-semibold">이름:</span> {profile?.first_name || '-'}
          </div>
          <div>
            <span className="font-semibold">이메일:</span> {profile?.email || '-'}
          </div>
          <div>
            <span className="font-semibold">주소:</span> {profile?.address_1 || '-'}
          </div>
          <div>
            <span className="font-semibold">연락처:</span> {profile?.phone || '-'}
          </div>
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition"
            onClick={() => setEditing(true)}
          >
            정보 수정
          </button>
          <button
            className="ml-2 mt-4 bg-gray-400 text-white px-6 py-2 rounded font-bold hover:bg-gray-500 transition"
            onClick={() => {
              import('../store/authStore').then(({ useAuthStore }) => {
                useAuthStore.getState().logout();
                navigate('/login');
              });
            }}
          >
            로그아웃
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">이름</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 border-gray-300"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">이메일</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 border-gray-300"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">주소</label>
            <input
              type="text"
              name="address_1"
              value={form.address_1}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 border-gray-300"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">연락처</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 border-gray-300"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              저장
            </button>
            <button
              type="button"
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded font-bold hover:bg-gray-400 transition"
              onClick={() => setEditing(false)}
              disabled={loading}
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
  // );
};

const ProtectedProfile = () => (
  <ProtectedRoute>
    <Profile />
  </ProtectedRoute>
);
export default ProtectedProfile; 