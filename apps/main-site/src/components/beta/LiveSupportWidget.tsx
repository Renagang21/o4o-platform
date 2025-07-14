import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@o4o/utils';

// Types
interface Message {
  id: string;
  conversationId: string;
  senderRole: 'admin' | 'beta_user' | 'system';
  senderName?: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  title?: string;
  status: 'active' | 'paused' | 'closed' | 'archived';
  feedbackId: string;
  betaUserId: string;
  isUrgent: boolean;
  lastMessageAt?: string;
  createdAt: string;
}

interface LiveSupportWidgetProps {
  betaUserEmail: string;
  betaUserId?: string;
  feedbackId?: string;
  onClose?: () => void;
  className?: string;
}

export const LiveSupportWidget: React.FC<LiveSupportWidgetProps> = ({
  betaUserEmail,
  betaUserId,
  feedbackId,
  onClose,
  className
}) => {
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLiveSupport, setIsLiveSupport] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [adminOnline, setAdminOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // WebSocket connection
  useEffect(() => {
    if (!betaUserEmail || !betaUserId) return;

    setConnectionStatus('connecting');
    
    const socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      withCredentials: true
    });

    // Join as beta user
    socketInstance.emit('user:join', {
      betaUserId,
      email: betaUserEmail
    });

    // Connection handlers
    socketInstance.on('connect', () => {
      console.log('Connected to live support');
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from live support');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      showToast('연결 오류가 발생했습니다.', 'error');
    });

    // Real-time event handlers
    socketInstance.on('user:conversations', (conversations: Conversation[]) => {
      const activeConv = conversations.find(c => c.status === 'active');
      if (activeConv) {
        setConversation(activeConv);
        socketInstance.emit('conversation:join', { conversationId: activeConv.id });
      }
    });

    socketInstance.on('conversation:history', (history: Message[]) => {
      setMessages(history);
    });

    socketInstance.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      if (message.senderRole === 'admin') {
        setAdminOnline(true);
        // Mark as read after a short delay
        setTimeout(() => {
          socketInstance.emit('message:read', { messageId: message.id });
        }, 1000);
      }
    });

    socketInstance.on('feedback:live_support_started', (data: { feedbackId: string, conversationId: string }) => {
      setIsLiveSupport(true);
      showToast('실시간 지원이 시작되었습니다. 곧 상담원이 연결됩니다.', 'success');
      
      // Join the conversation
      socketInstance.emit('conversation:join', { conversationId: data.conversationId });
    });

    socketInstance.on('admin:online', () => {
      setAdminOnline(true);
    });

    socketInstance.on('admin:offline', () => {
      setAdminOnline(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [betaUserEmail, betaUserId, showToast]);

  const startLiveSupport = async () => {
    if (!feedbackId) {
      showToast('피드백 ID가 필요합니다.', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/beta/feedback/${feedbackId}/start-live-support`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betaUserEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsLiveSupport(true);
        showToast('실시간 지원을 요청했습니다. 상담원 연결을 기다려주세요.', 'success');
      } else {
        showToast(data.error?.message || '실시간 지원 요청에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Start live support error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const sendMessage = useCallback(async () => {
    if (!socket || !conversation || !newMessage.trim()) return;

    socket.emit('message:send', {
      conversationId: conversation.id,
      content: newMessage.trim(),
      messageType: 'text',
      senderId: betaUserId,
      senderRole: 'beta_user'
    });

    setNewMessage('');
    inputRef.current?.focus();
  }, [socket, conversation, newMessage, betaUserId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '연결됨';
      case 'connecting': return '연결 중...';
      default: return '연결 안됨';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 h-96 flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <div>
            <h3 className="font-semibold text-sm">실시간 지원</h3>
            <p className="text-xs text-blue-100">
              {adminOnline ? '상담원 온라인' : '오프라인'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!isLiveSupport ? (
          // Live Support Request
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div>
              <div className="text-4xl mb-4">🎧</div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                실시간 지원이 필요하신가요?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                상담원과 실시간으로 대화할 수 있습니다.
              </p>
              <button
                onClick={startLiveSupport}
                disabled={!feedbackId || connectionStatus !== 'connected'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {feedbackId ? '실시간 지원 시작' : '피드백을 먼저 제출해주세요'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                  <div className="text-2xl mb-2">💬</div>
                  실시간 지원이 시작되었습니다.<br />
                  상담원이 곧 연결됩니다.
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderRole === 'beta_user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.senderRole === 'beta_user'
                        ? 'bg-blue-600 text-white'
                        : message.senderRole === 'system'
                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                    }`}>
                      <p>{message.content}</p>
                      <div className={`text-xs mt-1 ${
                        message.senderRole === 'beta_user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.senderName && message.senderRole === 'admin' && (
                          <span>{message.senderName} • </span>
                        )}
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  disabled={!conversation || connectionStatus !== 'connected'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !conversation || connectionStatus !== 'connected'}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              {isTyping && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  상담원이 입력 중입니다...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Enhanced Beta Feedback Widget with Live Support
interface EnhancedBetaFeedbackWidgetProps {
  page?: string;
  feature?: string;
  className?: string;
}

export const EnhancedBetaFeedbackWidget: React.FC<EnhancedBetaFeedbackWidgetProps> = ({
  page = 'signage',
  feature,
  className
}) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState<'feedback' | 'support'>('feedback');
  const [betaUserEmail, setBetaUserEmail] = useState('');
  const [betaUserId, setBetaUserId] = useState('');
  const [feedbackId, setFeedbackId] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Check for stored beta user info
  useEffect(() => {
    const storedEmail = localStorage.getItem('betaUserEmail');
    const storedUserId = localStorage.getItem('betaUserId');
    const storedFeedbackId = localStorage.getItem('lastFeedbackId');
    
    if (storedEmail) setBetaUserEmail(storedEmail);
    if (storedUserId) setBetaUserId(storedUserId);
    if (storedFeedbackId) setFeedbackId(storedFeedbackId);
  }, []);

  const handleFeedbackSubmitted = (submittedFeedbackId: string) => {
    setFeedbackId(submittedFeedbackId);
    localStorage.setItem('lastFeedbackId', submittedFeedbackId);
    showToast('피드백이 제출되었습니다. 실시간 지원을 요청할 수 있습니다.', 'success');
  };

  const handleBetaRegistered = (userId: string, email: string) => {
    setBetaUserId(userId);
    setBetaUserEmail(email);
    localStorage.setItem('betaUserId', userId);
    localStorage.setItem('betaUserEmail', email);
    showToast('베타 등록이 완료되었습니다!', 'success');
  };

  const quickActions = [
    {
      id: 'feedback',
      label: '피드백 보내기',
      icon: '💬',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'support',
      label: '실시간 지원',
      icon: '🎧',
      color: 'bg-green-500 hover:bg-green-600',
      badge: hasUnreadMessages
    }
  ];

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 relative"
          title="베타 피드백 및 지원"
        >
          {hasUnreadMessages && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h3 className="font-semibold">베타 지원</h3>
            <p className="text-xs text-blue-100">피드백 및 실시간 지원</p>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-blue-100 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-600">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => setActiveMode(action.id as any)}
              className={`flex-1 p-3 text-sm font-medium transition-colors relative ${
                activeMode === action.id
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-1">
                <span>{action.icon}</span>
                <span>{action.label}</span>
                {action.badge && (
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="w-80">
          {activeMode === 'feedback' ? (
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                시스템에 대한 피드백을 보내주세요.
              </p>
              {/* Here you would include your existing BetaFeedbackModal content */}
              <button
                onClick={() => {
                  // Open feedback modal logic
                  showToast('피드백 모달을 구현해주세요', 'info');
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                피드백 작성하기
              </button>
            </div>
          ) : (
            <LiveSupportWidget
              betaUserEmail={betaUserEmail}
              betaUserId={betaUserId}
              feedbackId={feedbackId}
              className="border-0 shadow-none w-full h-96"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedBetaFeedbackWidget;