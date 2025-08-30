import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

  const totalClicks = sourceData.reduce((sum, item) => sum + item.clicks, 0);
  const totalConversions = sourceData.reduce((sum, item) => sum + item.conversions, 0);
  const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const totalRevenue = sourceData.reduce((sum, item) => sum + item.revenue, 0);

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
        {/* Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle>소스별 성과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="source" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'revenue') {
                        return [`₩${value.toLocaleString()}`, '수익'];
                      }
                      return [value, name === 'clicks' ? '클릭' : '전환'];
                    }}
                  />
                  <Bar dataKey="clicks" fill="#3b82f6" name="clicks" />
                  <Bar dataKey="conversions" fill="#10b981" name="conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Source details table */}
            <div className="space-y-2">
              {sourceData.map((source, index) => (
                <div key={source.source} className="flex items-center justify-between p-2 rounded border">
                  <span className="font-medium">{source.source}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      {source.clicks} 클릭
                    </span>
                    <span className="text-green-600">
                      {source.conversionRate}% 전환
                    </span>
                    <span className="text-purple-600 font-medium">
                      ₩{source.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>디바이스 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="clicks"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ device, percentage }) => `${device} ${percentage}%`}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} 클릭`, '클릭수']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {deviceData.map((device, index) => (
                <div key={device.device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.device)}
                    <span>{device.device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      style={{ borderColor: COLORS[index % COLORS.length] }}
                    >
                      {device.percentage}%
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {device.clicks} 클릭
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>시간대별 클릭 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="hour" 
                  fontSize={12}
                  interval={1}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} 클릭`, '클릭수']}
                />
                <Bar dataKey="clicks" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};