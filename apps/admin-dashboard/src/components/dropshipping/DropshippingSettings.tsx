import { useState, useEffect } from 'react';
import { 
  Globe, 
  Zap, 
  TrendingUp, 
  Shield, 
  Database,
  RefreshCw,
  Users,
  Package,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DropshippingSettings {
  autoOrderRouting: boolean;
  defaultMarginPolicy: {
    platformCommission: number;
    affiliateCommission: number;
    minimumMargin: number;
  };
  automationRules: {
    autoApproveOrders: boolean;
    autoForwardToSupplier: boolean;
    stockSyncInterval: number;
    priceUpdateInterval: number;
  };
}

interface SupplierConnector {
  id: string;
  name: string;
  type: 'api' | 'csv' | 'ftp';
  status: 'active' | 'inactive' | 'error';
  lastSync: Date | null;
  productsCount: number;
  ordersCount: number;
  config: any;
}

interface Statistics {
  overview: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalProducts: number;
    dropshippingProducts: number;
  };
  performance: {
    totalOrders: number;
    dropshippingOrders: number;
    averageOrderValue: number;
    totalRevenue: number;
    platformCommission: number;
    affiliateCommission: number;
  };
  suppliers: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
    fulfillmentRate: number;
  }>;
}

export const DropshippingSettings: React.FC = () => {
  const [settings, setSettings] = useState<DropshippingSettings | null>(null);
  const [connectors, setConnectors] = useState<SupplierConnector[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDropshippingData();
  }, []);

  const fetchDropshippingData = async () => {
    try {
      setLoading(true);
      
      // 병렬로 데이터 가져오기
      const [settingsRes, connectorsRes, statisticsRes] = await Promise.all([
        fetch('/api/v1/dropshipping/settings'),
        fetch('/api/v1/dropshipping/connectors'),
        fetch('/api/v1/dropshipping/statistics')
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data);
      }

      if (connectorsRes.ok) {
        const connectorsData = await connectorsRes.json();
        setConnectors(connectorsData.data);
      }

      if (statisticsRes.ok) {
        const statisticsData = await statisticsRes.json();
        setStatistics(statisticsData.data);
      }
    } catch (error) {
      // Error log removed
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async (updatedSettings: Partial<DropshippingSettings>) => {
    try {
      const response = await fetch('/api/v1/dropshipping/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev!, ...updatedSettings }));
      }
    } catch (error) {
      // Error log removed
    }
  };

  const testConnector = async (connectorId: string) => {
    try {
      const response = await fetch(`/api/v1/dropshipping/connectors/${connectorId}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`연결 테스트 성공: ${result.data.message}`);
      } else {
        alert('연결 테스트 실패');
      }
    } catch (error) {
      // Error log removed
      alert('연결 테스트 중 오류 발생');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">비활성</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">오류</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>드랍쉬핑 설정을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-modern-text-primary">드랍쉬핑 설정</h2>
          <p className="text-modern-text-secondary">드랍쉬핑 시스템의 전반적인 설정을 관리합니다</p>
        </div>
        <Button onClick={fetchDropshippingData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="connectors">커넥터</TabsTrigger>
          <TabsTrigger value="policies">정책</TabsTrigger>
          <TabsTrigger value="automation">자동화</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-4">
          {statistics && (
            <>
              {/* 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-modern-text-secondary">총 공급자</p>
                        <p className="text-2xl font-bold">{statistics.overview.totalSuppliers}</p>
                        <p className="text-xs text-green-600">
                          활성: {statistics.overview.activeSuppliers}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-blue-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-modern-text-secondary">드랍쉬핑 상품</p>
                        <p className="text-2xl font-bold">{statistics.overview.dropshippingProducts}</p>
                        <p className="text-xs text-modern-text-secondary">
                          전체: {statistics.overview.totalProducts}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-green-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-modern-text-secondary">총 매출</p>
                        <p className="text-2xl font-bold">{formatCurrency(statistics.performance.totalRevenue)}</p>
                        <p className="text-xs text-green-600">
                          주문: {statistics.performance.totalOrders}건
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-modern-text-secondary">플랫폼 수수료</p>
                        <p className="text-2xl font-bold">{formatCurrency(statistics.performance.platformCommission)}</p>
                        <p className="text-xs text-modern-text-secondary">
                          제휴: {formatCurrency(statistics.performance.affiliateCommission)}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-yellow-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 공급자 성과 */}
              <Card>
                <CardHeader>
                  <CardTitle>공급자별 성과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.suppliers.map((supplier) => (
                      <div key={supplier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-modern-text-secondary">
                            주문: {supplier.orders}건 • 이행률: {supplier.fulfillmentRate}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(supplier.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 커넥터 탭 */}
        <TabsContent value="connectors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                공급자 커넥터 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectors.map((connector) => (
                  <div key={connector.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Database className="w-5 h-5" />
                        <div>
                          <h3 className="font-medium">{connector.name}</h3>
                          <p className="text-sm text-modern-text-secondary">
                            {connector.type.toUpperCase()} • 상품: {connector.productsCount}개 • 주문: {connector.ordersCount}건
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(connector.status)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => testConnector(connector.id)}
                        >
                          테스트
                        </Button>
                      </div>
                    </div>
                    {connector.lastSync && (
                      <p className="text-xs text-modern-text-secondary">
                        마지막 동기화: {new Date(connector.lastSync).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정책 탭 */}
        <TabsContent value="policies" className="space-y-4">
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  마진 정책 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="platformCommission">플랫폼 수수료 (%)</Label>
                    <Input
                      id="platformCommission"
                      type="number"
                      value={settings.defaultMarginPolicy.platformCommission}
                      onChange={(e) => 
                        handleSettingsUpdate({
                          defaultMarginPolicy: {
                            ...settings.defaultMarginPolicy,
                            platformCommission: Number(e.target.value)
                          }
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="affiliateCommission">제휴 수수료 (%)</Label>
                    <Input
                      id="affiliateCommission"
                      type="number"
                      value={settings.defaultMarginPolicy.affiliateCommission}
                      onChange={(e) => 
                        handleSettingsUpdate({
                          defaultMarginPolicy: {
                            ...settings.defaultMarginPolicy,
                            affiliateCommission: Number(e.target.value)
                          }
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumMargin">최소 마진 (%)</Label>
                    <Input
                      id="minimumMargin"
                      type="number"
                      value={settings.defaultMarginPolicy.minimumMargin}
                      onChange={(e) => 
                        handleSettingsUpdate({
                          defaultMarginPolicy: {
                            ...settings.defaultMarginPolicy,
                            minimumMargin: Number(e.target.value)
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 자동화 탭 */}
        <TabsContent value="automation" className="space-y-4">
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  자동화 규칙
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">자동 주문 라우팅</p>
                    <p className="text-sm text-modern-text-secondary">
                      주문을 자동으로 적절한 공급자에게 전달
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoOrderRouting}
                    onCheckedChange={(checked) => 
                      handleSettingsUpdate({ autoOrderRouting: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">주문 자동 승인</p>
                    <p className="text-sm text-modern-text-secondary">
                      조건을 만족하는 주문을 자동으로 승인
                    </p>
                  </div>
                  <Switch
                    checked={settings.automationRules.autoApproveOrders}
                    onCheckedChange={(checked) => 
                      handleSettingsUpdate({
                        automationRules: {
                          ...settings.automationRules,
                          autoApproveOrders: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">공급자 자동 전달</p>
                    <p className="text-sm text-modern-text-secondary">
                      승인된 주문을 공급자에게 자동 전달
                    </p>
                  </div>
                  <Switch
                    checked={settings.automationRules.autoForwardToSupplier}
                    onCheckedChange={(checked) => 
                      handleSettingsUpdate({
                        automationRules: {
                          ...settings.automationRules,
                          autoForwardToSupplier: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="stockSync">재고 동기화 간격 (초)</Label>
                    <Input
                      id="stockSync"
                      type="number"
                      value={settings.automationRules.stockSyncInterval}
                      onChange={(e) => 
                        handleSettingsUpdate({
                          automationRules: {
                            ...settings.automationRules,
                            stockSyncInterval: Number(e.target.value)
                          }
                        })
                      }
                    />
                    <p className="text-xs text-modern-text-secondary mt-1">
                      권장: 1800초 (30분)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="priceUpdate">가격 업데이트 간격 (초)</Label>
                    <Input
                      id="priceUpdate"
                      type="number"
                      value={settings.automationRules.priceUpdateInterval}
                      onChange={(e) => 
                        handleSettingsUpdate({
                          automationRules: {
                            ...settings.automationRules,
                            priceUpdateInterval: Number(e.target.value)
                          }
                        })
                      }
                    />
                    <p className="text-xs text-modern-text-secondary mt-1">
                      권장: 3600초 (1시간)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};