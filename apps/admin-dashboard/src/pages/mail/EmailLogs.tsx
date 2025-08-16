import { FC, useState, useEffect } from 'react';
import { Mail, Search, AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending' | 'bounced';
  provider: string;
  sentAt: string;
  messageId?: string;
  error?: string;
  retryCount: number;
  emailType?: string;
  metadata?: any;
}

const EmailLogs: FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // 샘플 데이터
  const sampleLogs: EmailLog[] = [
    {
      id: 1,
      recipient: 'user1@example.com',
      subject: '회원가입을 환영합니다!',
      status: 'sent',
      provider: 'smtp',
      sentAt: new Date().toISOString(),
      messageId: 'msg_001',
      emailType: 'welcome',
      retryCount: 0
    },
    {
      id: 2,
      recipient: 'user2@example.com',
      subject: '주문이 확인되었습니다',
      status: 'sent',
      provider: 'smtp',
      sentAt: new Date(Date.now() - 3600000).toISOString(),
      messageId: 'msg_002',
      emailType: 'order-confirmation',
      retryCount: 0
    },
    {
      id: 3,
      recipient: 'user3@example.com',
      subject: '비밀번호 재설정',
      status: 'failed',
      provider: 'smtp',
      sentAt: new Date(Date.now() - 7200000).toISOString(),
      error: 'Connection timeout',
      emailType: 'password-reset',
      retryCount: 3
    },
    {
      id: 4,
      recipient: 'user4@example.com',
      subject: '배송이 시작되었습니다',
      status: 'pending',
      provider: 'smtp',
      sentAt: new Date(Date.now() - 1800000).toISOString(),
      emailType: 'shipping',
      retryCount: 1
    }
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    // TODO: API 연동
    setLogs(sampleLogs);
  };

  const handleRefresh = () => {
    loadLogs();
  };

  const handleRetry = (log: EmailLog) => {
    // TODO: 재발송 API 호출
    // Retrying email: log.id
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'bounced':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning'> = {
      sent: 'success',
      failed: 'destructive',
      pending: 'warning',
      bounced: 'destructive'
    };
    
    return (
      <Badge variant={(variants[status] || 'default') as any}>
        {status === 'sent' && '발송완료'}
        {status === 'failed' && '발송실패'}
        {status === 'pending' && '대기중'}
        {status === 'bounced' && '반송됨'}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">이메일 발송 기록</h2>
          <p className="text-gray-600 mt-1">시스템에서 발송된 이메일 내역을 확인합니다</p>
        </div>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">발송완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">발송실패</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이메일 또는 제목으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="sent">발송완료</SelectItem>
                <SelectItem value="failed">발송실패</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="bounced">반송됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 로그 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수신자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    발송시간
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.recipient}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.subject}</div>
                      {log.error && (
                        <div className="text-xs text-red-500 mt-1">{log.error}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded bg-gray-100">
                        {log.emailType || 'system'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetail(true);
                          }}
                        >
                          상세보기
                        </Button>
                        {(log.status === 'failed' || log.status === 'pending') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(log)}
                          >
                            재발송
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 다이얼로그 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>이메일 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">수신자</p>
                  <p className="font-medium">{selectedLog.recipient}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">상태</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedLog.status)}
                    {getStatusBadge(selectedLog.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">제목</p>
                  <p className="font-medium">{selectedLog.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">발송시간</p>
                  <p className="font-medium">{new Date(selectedLog.sentAt).toLocaleString()}</p>
                </div>
                {selectedLog.messageId && (
                  <div>
                    <p className="text-sm text-gray-500">메시지 ID</p>
                    <p className="font-mono text-sm">{selectedLog.messageId}</p>
                  </div>
                )}
                {selectedLog.error && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">오류 메시지</p>
                    <p className="text-red-600">{selectedLog.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailLogs;