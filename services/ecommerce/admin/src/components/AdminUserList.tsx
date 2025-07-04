import React from "react";
import { useAdminUsers } from "./AdminUserContext";
import { Link } from "react-router-dom";

export default function AdminUserList() {
  const { users } = useAdminUsers();

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">관리자 계정 목록</h2>
      <div className="mb-4 text-right">
        <Link to="/admin/users/new" className="btn">+ 관리자 추가</Link>
      </div>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">이메일</th>
            <th className="border px-2 py-1">이름</th>
            <th className="border px-2 py-1">역할</th>
            <th className="border px-2 py-1">등록일</th>
            <th className="border px-2 py-1">수정</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="border px-2 py-1">{u.email}</td>
              <td className="border px-2 py-1">{u.name}</td>
              <td className="border px-2 py-1">{u.role}</td>
              <td className="border px-2 py-1">{new Date(u.createdAt).toLocaleString()}</td>
              <td className="border px-2 py-1"><Link to={`/admin/users/${u.id}/edit`} className="text-blue-600 underline">수정</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 