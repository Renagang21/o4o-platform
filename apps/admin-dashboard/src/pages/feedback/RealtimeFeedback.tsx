import { FC, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { 
  MessageSquare, 
  Send, 
  AlertCircle, 
  Clock,
  User,
  Star,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'bug' | 'feature' | 'general' | 'urgent';
  title: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  rating?: number;
  timestamp: string;
  conversationId?: string;
  responses?: FeedbackResponse[];
}

interface FeedbackResponse {
  id: string;
  feedbackId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  isAdmin: boolean;
}

const RealtimeFeedback: FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  
  const { token, user } = useAuthStore();

  // Socket.io 연결
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // 연결 이벤트
    socket.on('connect', () => {
      setIsConnected(true);
      // Realtime feedback connected
      
      // 피드백 채널 구독
      socket.emit('subscribe', {
        channel: 'feedback',
        role: 'admin'
      });
    });

    // 연결 끊김
    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 새 피드백 수신
    socket.on('new_feedback', (feedback: Feedback) => {
      setFeedbacks(prev => [feedback, ...prev]);
      
      // 긴급 피드백인 경우 특별 알림
      if (feedback.type === 'urgent' || feedback.priority === 'critical') {
        toast.error(`긴급 피드백: ${feedback.title}`, {
          duration: 10000,
          icon: '🚨'
        });
      } else {
        toast.success('새로운 피드백이 도착했습니다');
      }
    });

    // 피드백 업데이트
    socket.on('feedback_updated', (updatedFeedback: Feedback) => {
      setFeedbacks(prev => 
        prev.map(f => f.id === updatedFeedback.id ? updatedFeedback : f)
      );
      
      if (selectedFeedback?.id === updatedFeedback.id) {
        setSelectedFeedback(updatedFeedback);
      }
    });

    // 새 응답 수신
    socket.on('new_response', ({ feedbackId, response }: { feedbackId: string; response: FeedbackResponse }) => {
      setFeedbacks(prev =>
        prev.map(f => {
          if (f.id === feedbackId) {
            return {
              ...f,
              responses: [...(f.responses || []), response]
            };
          }
          return f;
        })
      );
      
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => prev ? {
          ...prev,
          responses: [...(prev.responses || []), response]
        } : null);
      }
    });

    // 초기 피드백 로드
    loadInitialFeedbacks();

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  // 초기 피드백 로드
  const loadInitialFeedbacks = async () => {
    setIsLoading(true);
    try {
      // TODO: API에서 최근 피드백 로드
      // const response = await api.get('/api/feedback/recent');
      // setFeedbacks(response.data.feedbacks);
      
      // 임시 더미 데이터
      setFeedbacks([
        {
          id: '1',
          userId: 'user1',
          userName: '김철수',
          userEmail: 'kim@example.com',
          type: 'urgent',
          title: '결제 오류 발생',
          message: '카드 결제 시도시 오류가 발생합니다. 긴급히 확인 부탁드립니다.',
          status: 'pending',
          priority: 'critical',
          rating: 1,
          timestamp: new Date().toISOString(),
          responses: []
        },
        {
          id: '2',
          userId: 'user2',
          userName: '이영희',
          userEmail: 'lee@example.com',
          type: 'feature',
          title: '모바일 앱 기능 제안',
          message: '모바일 앱에서도 실시간 알림을 받을 수 있으면 좋겠습니다.',
          status: 'pending',
          priority: 'medium',
          rating: 4,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          responses: []
        }
      ]);
    } catch (error) {
      toast.error('피드백을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 응답 전송
  const sendResponse = async () => {
    if (!selectedFeedback || !responseMessage.trim()) return;

    try {
      const response: FeedbackResponse = {
        id: Date.now().toString(),
        feedbackId: selectedFeedback.id,
        userId: user?.id || '',
        userName: user?.name || '관리자',
        message: responseMessage,
        timestamp: new Date().toISOString(),
        isAdmin: true
      };

      // Socket으로 응답 전송
      socketRef.current?.emit('send_response', {
        feedbackId: selectedFeedback.id,
        response
      });

      // 로컬 상태 업데이트
      setSelectedFeedback(prev => prev ? {
        ...prev,
        responses: [...(prev.responses || []), response]
      } : null);

      setResponseMessage('');
      toast.success('응답이 전송되었습니다');
    } catch (error) {
      toast.error('응답 전송에 실패했습니다');
    }
  };

  // 상태 변경
  const updateFeedbackStatus = async (feedbackId: string, status: Feedback['status']) => {
    try {
      socketRef.current?.emit('update_feedback_status', {
        feedbackId,
        status
      });

      // 로컬 상태 업데이트
      setFeedbacks(prev =>
        prev.map(f => f.id === feedbackId ? { ...f, status } : f)
      );

      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => prev ? { ...prev, status } : null);
      }

      toast.success('상태가 업데이트되었습니다');
    } catch (error) {
      toast.error('상태 업데이트에 실패했습니다');
    }
  };

  // 필터링된 피드백
  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'pending') return feedback.status === 'pending';
    if (filter === 'urgent') return feedback.type === 'urgent' || feedback.priority === 'critical';
    return true;
  });

  // 타입별 아이콘
  const getTypeIcon = (type: Feedback['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'bug':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'feature':
        return <Star className="w-5 h-5 text-blue-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-500" />;
    }
  };

  // 상태별 색상
  const getStatusColor = (status: Feedback['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 피드백 목록 */}
      <div className="w-1/3 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">실시간 피드백</h1>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-500">
                {isConnected ? '연결됨' : '연결 끊김'}
              </span>
            </div>
          </div>
          
          {/* 필터 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체 ({feedbacks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'pending' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              대기중 ({feedbacks.filter(f => f.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'urgent' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              긴급 ({feedbacks.filter(f => f.type === 'urgent' || f.priority === 'critical').length})
            </button>
          </div>
        </div>

        {/* 피드백 리스트 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-2" />
              <p>피드백이 없습니다</p>
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  selectedFeedback?.id === feedback.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(feedback.type)}
                    <h3 className="font-medium text-gray-900">{feedback.title}</h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(feedback.status)}`}>
                    {feedback.status === 'pending' ? '대기중' :
                     feedback.status === 'in_progress' ? '처리중' :
                     feedback.status === 'resolved' ? '해결됨' : '종료'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {feedback.message}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <User className="w-3 h-3" />
                    <span>{feedback.userName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(feedback.timestamp).toLocaleTimeString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 피드백 상세 및 대화 */}
      <div className="flex-1 flex flex-col">
        {selectedFeedback ? (
          <>
            {/* 헤더 */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(selectedFeedback.type)}
                    <h2 className="text-lg font-bold">{selectedFeedback.title}</h2>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{selectedFeedback.userName}</span>
                      <span className="text-gray-400">({selectedFeedback.userEmail})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(selectedFeedback.timestamp).toLocaleString('ko-KR')}</span>
                    </div>
                    {selectedFeedback.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{selectedFeedback.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 상태 변경 드롭다운 */}
                <select
                  value={selectedFeedback.status}
                  onChange={(e) => updateFeedbackStatus(selectedFeedback.id, e.target.value as Feedback['status'])}
                  className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(selectedFeedback.status)}`}
                >
                  <option value="pending">대기중</option>
                  <option value="in_progress">처리중</option>
                  <option value="resolved">해결됨</option>
                  <option value="closed">종료</option>
                </select>
              </div>
            </div>

            {/* 대화 내역 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* 원본 메시지 */}
              <div className="mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedFeedback.message}</p>
                </div>
              </div>

              {/* 응답들 */}
              {selectedFeedback.responses?.map((response) => (
                <div
                  key={response.id}
                  className={`mb-4 ${response.isAdmin ? 'text-right' : 'text-left'}`}
                >
                  <div className={`inline-block max-w-2xl ${
                    response.isAdmin ? 'bg-blue-500 text-white' : 'bg-white'
                  } rounded-lg p-4 shadow-sm`}>
                    <div className="flex items-center space-x-2 mb-2 text-xs opacity-75">
                      <span>{response.userName}</span>
                      <span>•</span>
                      <span>{new Date(response.timestamp).toLocaleTimeString('ko-KR')}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{response.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 응답 입력 */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  ref={responseInputRef}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.shiftKey === false) {
                      e.preventDefault();
                      sendResponse();
                    }
                  }}
                  placeholder="응답을 입력하세요... (Enter로 전송)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <button
                  onClick={sendResponse}
                  disabled={!responseMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">피드백을 선택하세요</p>
              <p className="text-sm mt-2">실시간으로 사용자 피드백을 확인하고 응답할 수 있습니다</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeFeedback;