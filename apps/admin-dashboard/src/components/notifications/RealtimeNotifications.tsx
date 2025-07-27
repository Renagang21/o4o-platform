// 임시 비활성화: socket.io-client 타입 에러 해결 후 다시 활성화 예정
// TODO: socket.io-client import 문제 해결 후 복원

/*
import { FC } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../api/authStore';
import { Bell, X, AlertCircle, MessageSquare, Users, TrendingUp } from 'lucide-react';

interface Notification {
  id: string;
  type: 'new_feedback' | 'feedback_update' | 'new_message' | 'urgent_feedback' | 'new_registration';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  feedbackId?: string;
  conversationId?: string;
  read?: boolean;
}

interface RealtimeNotificationsProps {
  className?: string;
}

export const RealtimeNotifications: FC<RealtimeNotificationsProps> = ({ className }) => {
  // 컴포넌트 로직...
};
*/

// 임시 대체 컴포넌트
interface RealtimeNotificationsProps {
  className?: string;
}

export const RealtimeNotifications: FC<RealtimeNotificationsProps> = ({ className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="text-sm text-gray-500">
        실시간 알림 (개발 중)
      </div>
    </div>
  );
};