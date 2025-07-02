import React from "react";
import { useNavigate } from "react-router-dom";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white border rounded p-8 shadow-md text-center">
        <div className="text-4xl font-bold text-red-600 mb-4">403 Forbidden</div>
        <div className="mb-6 text-lg">이 페이지에 접근할 수 있는 권한이 없습니다.</div>
        <div className="flex gap-4 justify-center">
          <button className="btn" onClick={() => navigate("/admin")}>관리자 홈으로</button>
          <button className="btn bg-gray-200 text-gray-800" onClick={() => navigate("/admin/login")}>관리자 로그인</button>
        </div>
      </div>
    </div>
  );
} 