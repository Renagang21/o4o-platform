import { useState, useEffect } from 'react';
import { TrendingUp, MousePointer, Smartphone, Monitor, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClickData {
  source: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

interface DeviceData {
  device: string;
  clicks: number;
  percentage: number;
}

interface TimeData {
  hour: string;
  clicks: number;
}

interface ClickAnalyticsProps {
  referralCode: string;
  period?: string;
}

export const ClickAnalytics = ({ referralCode, period = '7d' }: ClickAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [sourceData, setSourceData] = useState<ClickData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data generation for demonstration
  useEffect(() => {
    generateMockData();
  }, [selectedPeriod, referralCode]);

  const generateMockData = () => {
    setLoading(true);
    
    // Source performance data
    const sources = [
      { name: '카카오톡', baseClicks: 150, conversionRate: 0.12 },
      { name: '페이스북', baseClicks: 120, conversionRate: 0.08 },
      { name: '인스타그램', baseClicks: 200, conversionRate: 0.15 },
      { name: '블로그', baseClicks: 80, conversionRate: 0.20 },
      { name: '이메일', baseClicks: 60, conversionRate: 0.25 },
      { name: '직접링크', baseClicks: 40, conversionRate: 0.18 }
    ];

    const mockSourceData = sources.map(source => {
      const clicks = Math.floor(source.baseClicks * (0.8 + Math.random() * 0.4));
      const conversions = Math.floor(clicks * source.conversionRate * (0.7 + Math.random() * 0.6));
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const revenue = conversions * (50000 + Math.random() * 100000);
      
      return {
        source: source.name,
        clicks,
        conversions,
        conversionRate: Number(conversionRate.toFixed(1)),
        revenue: Math.floor(revenue)
      };
    });

    // Device data
    const devices = [
      { device: 'Mobile', percentage: 65 },
      { device: 'Desktop', percentage: 28 },
      { device: 'Tablet', percentage: 7 }
    ];

    const totalClicks = mockSourceData.reduce((sum, item) => sum + item.clicks, 0);
    const mockDeviceData = devices.map(device => ({
      device: device.device,
      clicks: Math.floor(totalClicks * (device.percentage / 100)),
      percentage: device.percentage
    }));

    // Hourly data
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      const isBusinessHour = i >= 9 && i <= 21;
      const baseClicks = isBusinessHour ? 15 + Math.random() * 25 : 3 + Math.random() * 10;
      
      return {
        hour: `${hour}:00`,
        clicks: Math.floor(baseClicks)
      };
    });

    setSourceData(mockSourceData);
    setDeviceData(mockDeviceData);
    setTimeData(hours);
    setLoading(false);
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getDeviceColor = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return 'bg-blue-500';
      case 'desktop':
        return 'bg-green-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const totalClicks = sourceData.reduce((sum, item) => sum + item.clicks, 0);
  const totalConversions = sourceData.reduce((sum, item) => sum + item.conversions, 0);
  const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const totalRevenue = sourceData.reduce((sum, item) => sum + item.revenue, 0);

  // Find max clicks for time chart scaling
  const maxTimeClicks = Math.max(...timeData.map(t => t.clicks), 1);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-modern-text-primary">클릭 분석</h3>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">오늘</SelectItem>
              <SelectItem value="7d">7일</SelectItem>
              <SelectItem value="30d">30일</SelectItem>
              <SelectItem value="90d">90일</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={generateMockData}
            disabled={loading}
          >
            {loading ? '로딩...' : '새로고침'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">총 클릭</span>
            </div>
            <div className="text-2xl font-bold text-modern-text-primary">
              {totalClicks.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">전환</span>
            </div>
            <div className="text-2xl font-bold text-modern-text-primary">
              {totalConversions.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600">전환율</span>
            </div>
            <div className="text-2xl font-bold text-modern-text-primary">
              {averageConversionRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600">총 수익</span>
            </div>
            <div className="text-2xl font-bold text-modern-text-primary">
              ₩{totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Performance - Table Style */}
        <Card>
          <CardHeader>
            <CardTitle>소스별 성과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">소스</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">클릭</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">전환</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">전환율</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">수익</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceData.map((source) => (
                    <tr key={source.source} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{source.source}</td>
                      <td className="text-right py-3 text-blue-600">{source.clicks}</td>
                      <td className="text-right py-3 text-green-600">{source.conversions}</td>
                      <td className="text-right py-3">
                        <Badge variant="outline" className="font-normal">
                          {source.conversionRate}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 text-purple-600 font-medium">
                        ₩{source.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="pt-3">합계</td>
                    <td className="text-right pt-3 text-blue-600">{totalClicks}</td>
                    <td className="text-right pt-3 text-green-600">{totalConversions}</td>
                    <td className="text-right pt-3">
                      <Badge variant="outline">
                        {averageConversionRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right pt-3 text-purple-600">
                      ₩{totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution - Progress Bar Style */}
        <Card>
          <CardHeader>
            <CardTitle>디바이스 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceData.map((device) => (
                <div key={device.device} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.device)}
                      <span className="font-medium">{device.device}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {device.clicks} 클릭
                      </span>
                      <Badge variant="outline">
                        {device.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getDeviceColor(device.device)}`}
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">총 디바이스</span>
                  <p className="font-semibold">{deviceData.length}개</p>
                </div>
                <div>
                  <span className="text-gray-600">총 클릭</span>
                  <p className="font-semibold">{deviceData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Distribution - Text Chart */}
      <Card>
        <CardHeader>
          <CardTitle>시간대별 클릭 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Simple text-based bar chart */}
            <div className="flex items-end gap-1 h-40 mb-4">
              {timeData.map((time) => {
                const heightPercent = (time.clicks / maxTimeClicks) * 100;
                return (
                  <div
                    key={time.hour}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 transition-colors relative group"
                    style={{ height: `${heightPercent}%` }}
                    title={`${time.hour}: ${time.clicks} 클릭`}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {time.clicks}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Time labels */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <span className="text-sm text-gray-600">피크 시간</span>
                <p className="font-semibold">
                  {timeData.reduce((max, t) => t.clicks > max.clicks ? t : max, timeData[0]).hour}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">평균 클릭</span>
                <p className="font-semibold">
                  {Math.round(timeData.reduce((sum, t) => sum + t.clicks, 0) / timeData.length)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">총 클릭</span>
                <p className="font-semibold">
                  {timeData.reduce((sum, t) => sum + t.clicks, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};