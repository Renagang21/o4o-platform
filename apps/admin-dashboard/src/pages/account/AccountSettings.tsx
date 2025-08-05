import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { LinkedAccountsManager } from '@/components/account/LinkedAccountsManager';
import { AccountLinkingCard } from '@/components/account/AccountLinkingCard';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Shield, 
  Link2, 
  ArrowLeft,
  Key,
  Smartphone,
  History
} from 'lucide-react';

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [refreshAccounts, setRefreshAccounts] = useState(0);

  const breadcrumbs = [
    { label: '대시보드', href: '/dashboard' },
    { label: '계정 설정', href: '/account-settings' }
  ];

  const handleLinkSuccess = () => {
    setRefreshAccounts(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb items={breadcrumbs} />
      
      <PageHeader
        title="계정 설정"
        subtitle="계정 보안 및 연결된 로그인 방법을 관리합니다."
        actions={[
          {
            id: 'back',
            label: '뒤로가기',
            icon: <ArrowLeft className="h-4 w-4" />,
            onClick: () => navigate(-1),
            variant: 'secondary'
          }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                프로필 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">{user?.name || user?.email}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">역할</span>
                    <span>{user?.role || 'Customer'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">가입일</span>
                    <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="linked-accounts" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="linked-accounts">
                  <Link2 className="mr-2 h-4 w-4" />
                  연결된 계정
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  보안
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <History className="mr-2 h-4 w-4" />
                  활동 내역
                </TabsTrigger>
              </TabsList>

              <TabsContent value="linked-accounts" className="space-y-4">
                <LinkedAccountsManager key={refreshAccounts} />
                <AccountLinkingCard onSuccess={handleLinkSuccess} />
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      비밀번호 변경
                    </CardTitle>
                    <CardDescription>
                      계정 보안을 위해 정기적으로 비밀번호를 변경하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">비밀번호 변경</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      2단계 인증
                    </CardTitle>
                    <CardDescription>
                      추가 보안을 위해 2단계 인증을 설정하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">2단계 인증 상태</span>
                      <span className="text-sm text-gray-500">비활성화</span>
                    </div>
                    <Button variant="outline" className="mt-4">2단계 인증 설정</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      최근 활동
                    </CardTitle>
                    <CardDescription>
                      계정의 최근 로그인 및 활동 내역입니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>활동 내역이 없습니다.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};