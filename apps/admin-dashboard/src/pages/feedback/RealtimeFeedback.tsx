// 임시 비활성화: socket.io-client 타입 에러 해결 후 다시 활성화 예정
// TODO: socket.io-client import 문제 해결 후 복원

/*
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../api/authStore';
... 전체 컴포넌트 로직
*/

// 임시 대체 컴포넌트
const RealtimeFeedback: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">실시간 피드백</h1>
      <div className="text-gray-500">
        실시간 피드백 기능 (개발 중)
      </div>
    </div>
  );
};

export default RealtimeFeedback;