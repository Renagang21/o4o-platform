import { roleDisplayNames } from "@/types/user";
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, UserCheck, UserX, Clock, Shield, Mail, Calendar, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserActivityLog from './components/UserActivityLog';
// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
//   BusinessInfoSection 은 backend 없는 `/users/:id/business-info` GET/PUT/POST 만 호출했고
//   legacy role(business/vendor/seller) 에서만 열리는 dead 화면이라 제거했다.
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import { UserApi } from '@/api/userApi';
// import { formatDistanceToNow, format } from 'date-fns';
import type { User } from '@/types/user';

// interface ApprovalLogItem {
//   id: string;
//   user_id: string;
//   admin_id: string;
//   admin?: {
//     id: string;
//     email: string;
//     fullName: string;
//   };
//   action: 'approved' | 'rejected' | 'status_changed';
//   previous_status: string;
//   new_status: string;
//   notes?: string;
//   created_at: string;
// }

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user details
      const userResponse = await UserApi.getUser(id!);
      if (userResponse) {
        // Handle various response structures from API
        const userData = (userResponse as any).data?.data ||
                        (userResponse as any).data ||
                        (userResponse as any).user ||
                        userResponse;
        setUser(userData as User);
      }

      // Fetch approval history
      const historyResponse = await UserApi.getUserActivity(id!);
      // Handle various response structures for array data
      const historyData = Array.isArray(historyResponse) ? historyResponse :
                         Array.isArray((historyResponse as any)?.data) ? (historyResponse as any).data :
                         Array.isArray((historyResponse as any)?.activities) ? (historyResponse as any).activities :
                         [];
      setApprovalHistory(historyData);
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to load user details');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await UserApi.approveUser(id!, 'Approved via admin dashboard');
      
      toast.success('User approved successfully');

      fetchUserData();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async () => {
    try {
      await UserApi.rejectUser(id!, 'Rejected via admin dashboard');
      
      toast.success('User rejected successfully');

      fetchUserData();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to reject user');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-500',
      admin: 'bg-red-500',
      vendor: 'bg-blue-500',
      seller: 'bg-green-500',
      customer: 'bg-gray-500',
      business: 'bg-yellow-500',
      moderator: 'bg-indigo-500',
    };
    return colors[role as keyof typeof roleDisplayNames] || 'bg-gray-500';
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      approved: 'bg-green-500',
      pending: 'bg-yellow-500',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <UserX className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">User not found</p>
          <Button onClick={() => navigate('/users')} className="mt-4">
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant={"ghost" as const} onClick={() => navigate('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          <h1 className="text-2xl font-bold">{user?.name || 'Unknown User'}</h1>
        </div>
        <div className="flex gap-2">
          {user?.status === 'pending' && (
            <>
              <Button onClick={handleApprove}>
                <UserCheck className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                <UserX className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Button variant={"outline" as const} onClick={() => navigate(`/users/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Approval History</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={`${getStatusBadgeColor(user?.status || 'pending')} text-white`}>
                      {user?.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium">
                      {user ? '/* date removed */' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="font-medium">
                      {user?.lastLoginAt
                        ? '/* date removed */'
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles and Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Assigned Roles</p>
                  {/* WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1:
                      전: `{user?.role ? [user.role] : [].map(...)}` — 연산자 우선순위 때문에
                      배열이 그대로 렌더되고, 값 자체도 backend `roles[0]`(정렬 없는 조회)였다.
                      즉 11개 role 보유자에게 임의의 1개만, 그것도 Badge 없이 보여줬다.
                      후: 권한 정본인 `roles[]` 전체를 렌더한다(순서 무관 · 없으면 없다고 표시). */}
                  <div className="flex gap-2 flex-wrap">
                    {(user?.roles ?? []).length > 0 ? (
                      (user?.roles ?? []).map((role: string) => (
                        <Badge
                          key={role}
                          className={`${getRoleBadgeColor(role)} text-white`}
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">할당된 역할이 없습니다</span>
                    )}
                  </div>
                </div>
                {(user as any)?.permissions && (user as any)?.permissions.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Special Permissions</p>
                    <div className="flex gap-2 flex-wrap">
                      {(user as any)?.permissions.map((permission: string) => (
                        <Badge key={permission} variant={"outline" as const}>
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 Phase B-1:
                  `Login Attempts` 카드를 제거했다 — password 로그인이 없어 실패 카운트를 올리는 주체가
                  없고, `users.loginAttempts` 컬럼은 B-2 migration 이 DROP 한다. 남겨두면 값이 오지
                  않는데도 항상 `0` 을 보여주는 거짓 지표가 된다. 2열로 재배치. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Email Verified</p>
                  <p className="text-2xl font-bold">
                    {(user as any)?.isEmailVerified ? '✓' : '✗'}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Account Active</p>
                  <p className="text-2xl font-bold">
                    {(user as any)?.isActive ? '✓' : '✗'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                Timeline of all approval actions for this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvalHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No approval history found
                </p>
              ) : (
                <div className="space-y-4">
                  {approvalHistory.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {log.action === 'approved' && 'Approved'}
                            {log.action === 'rejected' && 'Rejected'}
                            {log.action === 'status_changed' && 'Status Changed'}
                          </p>
                          <span className="text-sm text-gray-500">
                            by {log.admin?.fullName || log.admin?.email || 'System'}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-gray-600 mb-2">{log.notes}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            {log.previous_status} → {log.new_status}
                          </span>
                          <span>
                            {'/* date removed */'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <UserActivityLog userId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}