import { useState } from 'react';
import { Users, Package, DollarSign, Settings, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductApprovalManager } from '@/components/vendor/ProductApprovalManager';
import { DropshippingSettings } from '@/components/dropshipping/DropshippingSettings';
import { formatPrice } from '@/utils/vendorUtils';

const VendorManagementPage = () => {
  const [activeTab, setActiveTab] = useState('approval');

  // Mock 통계 데이터
  const stats = {
    totalSuppliers: 156,
    activeSuppliers: 142,
    totalVendors: 89,
    activeVendors: 78,
    pendingApprovals: 23,
    monthlyRevenue: 125340000,
    monthlyCommission: 8774800,
    settlementPending: 15230000
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-modern-text-primary">
          판매자 관리
        </h1>
        <p className="text-modern-text-secondary mt-1">
          공급자와 판매자를 관리하고 제품 승인을 처리합니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">공급자</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {stats.totalSuppliers}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  활성: {stats.activeSuppliers}
                </p>
              </div>
              <Users className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">판매자</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {stats.totalVendors}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  활성: {stats.activeVendors}
                </p>
              </div>
              <Users className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">승인 대기</p>
                <p className="text-2xl font-bold text-modern-warning">
                  {stats.pendingApprovals}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  제품 승인 필요
                </p>
              </div>
              <Package className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 수수료</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {formatPrice(stats.monthlyCommission)}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  총 거래액의 7%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="approval">제품 승인</TabsTrigger>
          <TabsTrigger value="suppliers">공급자 관리</TabsTrigger>
          <TabsTrigger value="vendors">판매자 관리</TabsTrigger>
          <TabsTrigger value="settlements">정산 관리</TabsTrigger>
          <TabsTrigger value="dropshipping">드랍쉬핑</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="space-y-6">
          <ProductApprovalManager />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>공급자 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-modern-border-primary">
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">공급자</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">사업자명</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">제품 수</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">이번 달 매출</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-modern-border-primary">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">김철수</p>
                          <p className="text-sm text-modern-text-secondary">supplier001</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">테크노바</td>
                      <td className="py-3 px-2">45</td>
                      <td className="py-3 px-2">{formatPrice(12500000)}</td>
                      <td className="py-3 px-2">
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          활성
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>판매자 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-modern-text-secondary py-8">
                판매자 관리 기능은 준비 중입니다
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>정산 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-modern-text-secondary py-8">
                정산 관리 기능은 준비 중입니다
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dropshipping" className="space-y-6">
          <DropshippingSettings />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-modern-primary" />
                가격 정책 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">기본 마진율 (%)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-modern-border-primary rounded-md"
                    defaultValue={30}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">최소 마진율 (%)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-modern-border-primary rounded-md"
                    defaultValue={10}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">기본 제휴 수수료율 (%)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-modern-border-primary rounded-md"
                    defaultValue={5}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">플랫폼 수수료율 (%)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-modern-border-primary rounded-md"
                    defaultValue={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorManagementPage;