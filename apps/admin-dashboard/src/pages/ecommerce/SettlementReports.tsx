import { useState, FC } from 'react';
import { Download, Calendar, FileText, BarChart3, PieChart, TrendingUp, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface SettlementReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    totalPlatformFee: number;
    totalTossFee: number;
    totalVendorPayouts: number;
    totalTaxAmount: number;
    transactionCount: number;
    vendorCount: number;
    averageOrderValue: number;
  };
  trends: {
    date: string;
    revenue: number;
    platformFee: number;
    tossFee: number;
    vendorPayouts: number;
    transactionCount: number;
  }[];
  vendorBreakdown: {
    vendorName: string;
    vendorId: string;
    totalSales: number;
    platformFee: number;
    tossFee: number;
    netPayout: number;
    transactionCount: number;
    avgOrderValue: number;
  }[];
  categoryBreakdown: {
    categoryName: string;
    totalSales: number;
    platformFee: number;
    percentage: number;
    color: string;
  }[];
  paymentMethodBreakdown: {
    method: string;
    methodName: string;
    totalSales: number;
    transactionCount: number;
    percentage: number;
    color: string;
  }[];
}

const SettlementReports: FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('summary');

  // Fetch settlement report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['settlement-reports', dateRange, reportType],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        type: reportType
      });
      
      const response = await authClient.api.get(`/v1/settlements/reports?${params}`);
      return response.data;
    }
  });
  const report: SettlementReport = reportData?.data || {};

  // Export report
  const handleExportReport = async (format: 'excel' | 'pdf' = 'excel') => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format,
        type: reportType
      });

      const response = await authClient.api.get(`/v1/settlements/reports/export?${params}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { 
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settlement_report_${dateRange.startDate}_${dateRange.endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format === 'excel' ? '엑셀' : 'PDF'} 보고서가 다운로드되었습니다`);
    } catch (error) {
      toast.error('보고서 다운로드 중 오류가 발생했습니다');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">정산 보고서</h1>
          <p className="text-modern-text-secondary mt-1">매출 및 정산 현황 분석</p>
        </div>
        <div className="flex gap-2">
          <Button variant={"outline" as const} onClick={() => handleExportReport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button variant={"outline" as const} onClick={() => handleExportReport('pdf')}>
            <FileText className="w-4 h-4 mr-2" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="reportType">보고서 유형</Label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
              >
                <option value="summary">요약 보고서</option>
                <option value="detailed">상세 보고서</option>
                <option value="vendor">판매자별</option>
                <option value="category">카테고리별</option>
                <option value="tax">세무 보고서</option>
              </select>
            </div>
            <div>
              <Label>&nbsp;</Label>
              <Button onClick={() => refetch()} className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                조회
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {report.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                총 매출액
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-modern-text-primary">
                {formatCurrency(report.summary.totalRevenue)}
              </div>
              <div className="text-xs text-modern-text-tertiary mt-1">
                {report.summary.transactionCount}건 거래
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                플랫폼 수수료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(report.summary.totalPlatformFee)}
              </div>
              <div className="text-xs text-modern-text-tertiary mt-1">
                매출 대비 {formatPercentage(report.summary.totalPlatformFee / report.summary.totalRevenue * 100)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                판매자 정산액
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(report.summary.totalVendorPayouts)}
              </div>
              <div className="text-xs text-modern-text-tertiary mt-1">
                {report.summary.vendorCount}명 판매자
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                평균 주문액
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-modern-text-primary">
                {formatCurrency(report.summary.averageOrderValue)}
              </div>
              <div className="text-xs text-modern-text-tertiary mt-1">
                주문당 평균
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>매출 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => formatDate(value)} />
                  <YAxis tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="총 매출"
                  />
                  <Area
                    type="monotone"
                    dataKey="platformFee"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="플랫폼 수수료"
                  />
                  <Area
                    type="monotone"
                    dataKey="vendorPayouts"
                    stackId="3"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    name="판매자 정산"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={report.categoryBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="totalSales"
                  >
                    {(report.categoryBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {(report.categoryBreakdown || []).slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(entry.totalSales)}</span>
                      <span className="text-modern-text-tertiary">({formatPercentage(entry.percentage)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>상위 판매자 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    판매자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    총 매출
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    플랫폼 수수료
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    정산액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    거래 건수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    평균 주문액
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {(report.vendorBreakdown || []).slice(0, 10).map((vendor, index) => (
                  <tr key={vendor.vendorId} className="hover:bg-modern-bg-hover">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-modern-primary text-white flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {vendor.vendorName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-modern-text-primary">
                        {formatCurrency(vendor.totalSales)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-modern-text-secondary">
                        {formatCurrency(vendor.platformFee)}
                      </div>
                      <div className="text-xs text-modern-text-tertiary">
                        토스: {formatCurrency(vendor.tossFee)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(vendor.netPayout)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-modern-text-secondary">
                        {vendor.transactionCount.toLocaleString()}건
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-modern-text-secondary">
                        {formatCurrency(vendor.avgOrderValue)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>결제 수단별 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(report.paymentMethodBreakdown || []).map((method, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-modern-text-primary">{method.methodName}</h4>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: method.color }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-modern-text-secondary">매출액</span>
                    <span className="font-medium">{formatCurrency(method.totalSales)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-modern-text-secondary">거래건수</span>
                    <span className="font-medium">{method.transactionCount.toLocaleString()}건</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-modern-text-secondary">비율</span>
                    <span className="font-medium">{formatPercentage(method.percentage)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettlementReports;