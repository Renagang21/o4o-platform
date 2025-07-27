import { useState, useEffect } from 'react';
import { CreditCard, Shield, AlertTriangle, CheckCircle, Settings, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

interface TossPaymentsConfig {
  id: string;
  clientKey: string;
  secretKey: string;
  webhookSecretKey: string;
  isLive: boolean; // false for sandbox, true for production
  isEnabled: boolean;
  supportedMethods: PaymentMethod[];
  webhookUrl: string;
  returnUrl: string;
  failUrl: string;
  lastUpdated: string;
  createdAt: string;
}

interface PaymentMethod {
  type: 'card' | 'transfer' | 'virtualAccount' | 'mobilePhone' | 'giftCertificate' | 'foreignEasyPay';
  name: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

interface TossPaymentsTest {
  id: string;
  testType: 'connection' | 'payment' | 'webhook';
  status: 'pending' | 'success' | 'failed';
  result?: string;
  error?: string;
  executedAt: string;
}

const TossPaymentsSettings: FC = () => {
  const queryClient = useQueryClient();
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<'connection' | 'payment' | 'webhook'>('connection');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookKey, setShowWebhookKey] = useState(false);
  const [configForm, setConfigForm] = useState<Partial<TossPaymentsConfig>>({
    clientKey: '',
    secretKey: '',
    webhookSecretKey: '',
    isLive: false,
    isEnabled: false,
    webhookUrl: '',
    returnUrl: '',
    failUrl: '',
    supportedMethods: [
      { type: 'card', name: '신용카드', enabled: true },
      { type: 'transfer', name: '계좌이체', enabled: true },
      { type: 'virtualAccount', name: '가상계좌', enabled: false },
      { type: 'mobilePhone', name: '휴대폰 결제', enabled: false },
      { type: 'giftCertificate', name: '상품권', enabled: false },
      { type: 'foreignEasyPay', name: '해외간편결제', enabled: false }
    ]
  });

  // Fetch Toss Payments configuration
  const { data: configData } = useQuery({
    queryKey: ['toss-payments-config'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/payments/toss/config');
      return response.data;
    }
  });
  const config = configData?.data;

  // Fetch recent tests
  const { data: testsData } = useQuery({
    queryKey: ['toss-payments-tests'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/payments/toss/tests');
      return response.data;
    }
  });
  const tests = testsData?.data || [];

  // Fetch payment statistics
  const { data: statsData } = useQuery({
    queryKey: ['toss-payments-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/payments/toss/stats');
      return response.data;
    }
  });
  const stats = statsData?.data || {};

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<TossPaymentsConfig>) => {
      const response = await authClient.api.put('/v1/payments/toss/config', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('토스페이먼츠 설정이 저장되었습니다');
      queryClient.invalidateQueries({ queryKey: ['toss-payments-config'] });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (testType: string) => {
      const response = await authClient.api.post('/v1/payments/toss/test', { testType });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${getTestTypeName(selectedTestType)} 테스트가 성공했습니다`);
      } else {
        toast.error(`${getTestTypeName(selectedTestType)} 테스트가 실패했습니다`);
      }
      queryClient.invalidateQueries({ queryKey: ['toss-payments-tests'] });
      setIsTestDialogOpen(false);
    }
  });

  // Initialize form with existing config
  useEffect(() => {
    if (config) {
      setConfigForm({
        ...config,
        supportedMethods: config.supportedMethods || []
      });
    }
  }, [config]);

  const getTestTypeName = (type: string) => {
    switch (type) {
      case 'connection': return 'API 연결';
      case 'payment': return '결제';
      case 'webhook': return '웹훅';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200">성공</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">진행중</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!configForm.clientKey || !configForm.secretKey) {
      toast.error('클라이언트 키와 시크릿 키는 필수입니다');
      return;
    }

    if (!configForm.webhookUrl || !configForm.returnUrl || !configForm.failUrl) {
      toast.error('웹훅 URL, 성공 URL, 실패 URL은 필수입니다');
      return;
    }

    updateConfigMutation.mutate(configForm);
  };

  const handleMethodToggle = (methodType: string) => {
    setConfigForm(prev => ({
      ...prev,
      supportedMethods: prev.supportedMethods?.map(method =>
        method.type === methodType
          ? { ...method, enabled: !method.enabled }
          : method
      )
    }));
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate(selectedTestType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">토스페이먼츠 설정</h1>
          <p className="text-modern-text-secondary mt-1">결제 시스템 연동 및 관리</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTestDialogOpen(true)}
          >
            <Shield className="w-4 h-4 mr-2" />
            연결 테스트
          </Button>
          {config && (
            <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
              {config.isEnabled ? '활성화' : '비활성화'}
            </Badge>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              총 결제 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              {stats.totalPayments || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              이번 달 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              결제 성공률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.successRate || 0}%
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              최근 30일
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              총 결제 금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              ₩{(stats.totalAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              이번 달
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              환불 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.refundCount || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              이번 달
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              {/* Environment */}
              <div>
                <Label className="text-sm font-medium">환경 설정</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!configForm.isLive}
                      onChange={() => setConfigForm(prev => ({ ...prev, isLive: false }))}
                      className="mr-2"
                    />
                    <span className="text-sm">테스트 (Sandbox)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={configForm.isLive}
                      onChange={() => setConfigForm(prev => ({ ...prev, isLive: true }))}
                      className="mr-2"
                    />
                    <span className="text-sm">운영 (Live)</span>
                  </label>
                </div>
              </div>

              {/* Client Key */}
              <div>
                <Label htmlFor="clientKey">클라이언트 키 *</Label>
                <Input
                  id="clientKey"
                  value={configForm.clientKey}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, clientKey: e.target.value }))}
                  placeholder="test_ck_... 또는 live_ck_..."
                  required
                />
              </div>

              {/* Secret Key */}
              <div>
                <Label htmlFor="secretKey">시크릿 키 *</Label>
                <div className="relative">
                  <Input
                    id="secretKey"
                    type={showSecretKey ? 'text' : 'password'}
                    value={configForm.secretKey}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="test_sk_... 또는 live_sk_..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook Secret Key */}
              <div>
                <Label htmlFor="webhookSecretKey">웹훅 시크릿 키</Label>
                <div className="relative">
                  <Input
                    id="webhookSecretKey"
                    type={showWebhookKey ? 'text' : 'password'}
                    value={configForm.webhookSecretKey}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, webhookSecretKey: e.target.value }))}
                    placeholder="웹훅 검증용 시크릿 키"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookKey(!showWebhookKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showWebhookKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* URLs */}
              <div>
                <Label htmlFor="webhookUrl">웹훅 URL *</Label>
                <Input
                  id="webhookUrl"
                  value={configForm.webhookUrl}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://yourdomain.com/api/webhooks/toss"
                  required
                />
              </div>

              <div>
                <Label htmlFor="returnUrl">결제 성공 URL *</Label>
                <Input
                  id="returnUrl"
                  value={configForm.returnUrl}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, returnUrl: e.target.value }))}
                  placeholder="https://yourdomain.com/payment/success"
                  required
                />
              </div>

              <div>
                <Label htmlFor="failUrl">결제 실패 URL *</Label>
                <Input
                  id="failUrl"
                  value={configForm.failUrl}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, failUrl: e.target.value }))}
                  placeholder="https://yourdomain.com/payment/fail"
                  required
                />
              </div>

              {/* Enable/Disable */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={configForm.isEnabled}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
                  className="mr-2"
                />
                <Label htmlFor="isEnabled">토스페이먼츠 활성화</Label>
              </div>

              <Button type="submit" disabled={updateConfigMutation.isPending} className="w-full">
                설정 저장
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              결제 수단 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configForm.supportedMethods?.map((method) => (
                <div key={method.type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={method.enabled}
                      onChange={() => handleMethodToggle(method.type)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-modern-text-secondary">{method.type}</div>
                    </div>
                  </div>
                  <Badge variant={method.enabled ? 'default' : 'secondary'}>
                    {method.enabled ? '활성' : '비활성'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tests */}
      <Card>
        <CardHeader>
          <CardTitle>최근 테스트 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-8 text-modern-text-secondary">
              아직 테스트를 실행하지 않았습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((test: TossPaymentsTest) => (
                <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {test.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : test.status === 'failed' ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    <div>
                      <div className="font-medium">{getTestTypeName(test.testType)} 테스트</div>
                      <div className="text-sm text-modern-text-secondary">
                        {new Date(test.executedAt).toLocaleString('ko-KR')}
                      </div>
                      {test.error && (
                        <div className="text-sm text-red-600 mt-1">{test.error}</div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Connection Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>연결 테스트</DialogTitle>
            <DialogDescription>
              토스페이먼츠 API 연결 상태를 테스트합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>테스트 유형</Label>
              <select
                value={selectedTestType}
                onChange={(e) => setSelectedTestType(e.target.value as any)}
                className="w-full px-3 py-2 border border-modern-border-primary rounded-lg mt-1"
              >
                <option value="connection">API 연결 테스트</option>
                <option value="payment">결제 테스트 (100원)</option>
                <option value="webhook">웹훅 테스트</option>
              </select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                {selectedTestType === 'connection' && '토스페이먼츠 API 서버와의 연결 상태를 확인합니다.'}
                {selectedTestType === 'payment' && '실제 100원 결제를 통해 결제 프로세스를 테스트합니다. (테스트 환경에서만)'}
                {selectedTestType === 'webhook' && '웹훅 URL의 응답성과 시크릿 키 검증을 테스트합니다.'}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleTestConnection} disabled={testConnectionMutation.isPending}>
              테스트 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TossPaymentsSettings;