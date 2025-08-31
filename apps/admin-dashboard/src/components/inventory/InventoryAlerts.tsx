import { FC, useEffect, useState } from 'react';
import { AlertTriangle, Package, TrendingDown, Clock, Bell, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'overstock';
  severity: 'critical' | 'warning' | 'info';
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  maxStock?: number;
  expiryDate?: string;
  recommendation: string;
  createdAt: string;
  acknowledged: boolean;
}

interface InventoryAlertsProps {
  onCreatePurchaseOrder?: (productId: string) => void;
  onAdjustStock?: (productId: string) => void;
}

export const InventoryAlerts: FC<InventoryAlertsProps> = ({
  onCreatePurchaseOrder,
  onAdjustStock
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  // Fetch active alerts
  const { data: alertsData, refetch } = useQuery({
    queryKey: ['inventory-alerts', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?severity=${filter}` : '';
      const response = await authClient.api.get(`/inventory/alerts${params}`);
      return response.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const alerts = (alertsData?.data || []).filter(
    (alert: InventoryAlert) => !dismissedAlerts.has(alert.id)
  );

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return <Package className="h-5 w-5" />;
      case 'low_stock':
        return <TrendingDown className="h-5 w-5" />;
      case 'expiring':
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    toast.success('알림이 숨겨졌습니다');
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await authClient.api.post(`/inventory/alerts/${alertId}/acknowledge`);
      toast.success('알림이 확인 처리되었습니다');
      refetch();
    } catch (error) {
      toast.error('알림 처리 중 오류가 발생했습니다');
    }
  };

  const criticalCount = alerts.filter((a: InventoryAlert) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a: InventoryAlert) => a.severity === 'warning').length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              재고 알림
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                전체 ({alerts.length})
              </Button>
              <Button
                variant={filter === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('critical')}
              >
                긴급 ({criticalCount})
              </Button>
              <Button
                variant={filter === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('warning')}
              >
                주의 ({warningCount})
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                현재 활성화된 알림이 없습니다
              </p>
            ) : (
              alerts.map((alert: InventoryAlert) => (
                <Alert key={alert.id} className={`border-l-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={`text-${getAlertColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <AlertTitle className="text-sm font-medium">
                          {alert.productName} ({alert.sku})
                        </AlertTitle>
                        <AlertDescription className="mt-1">
                          <div className="space-y-1">
                            <p className="text-sm">{alert.recommendation}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>현재 재고: {alert.currentStock}</span>
                              <span>재주문점: {alert.reorderPoint}</span>
                              {alert.expiryDate && (
                                <span>유효기한: {new Date(alert.expiryDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                        <div className="flex gap-2 mt-3">
                          {alert.type === 'low_stock' && onCreatePurchaseOrder && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onCreatePurchaseOrder(alert.productId)}
                            >
                              구매 주문 생성
                            </Button>
                          )}
                          {onAdjustStock && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAdjustStock(alert.productId)}
                            >
                              재고 조정
                            </Button>
                          )}
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              확인
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock Level Overview */}
      <Card>
        <CardHeader>
          <CardTitle>재고 수준 개요</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>정상 재고</span>
                <span className="text-green-600">68%</span>
              </div>
              <Progress value={68} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>낮은 재고</span>
                <span className="text-yellow-600">24%</span>
              </div>
              <Progress value={24} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>품절</span>
                <span className="text-red-600">8%</span>
              </div>
              <Progress value={8} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};