import { roleDisplayNames } from "@/types/user";
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, UserCheck, UserX, Clock, Shield, Mail, Calendar, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import { api } from '@/api/base';
import { formatDistanceToNow, format } from 'date-fns';

// interface ApprovalLog {
  id: string;
  user_id: string;
  admin_id: string;
  admin?: {
    id: string;
    email: string;
    fullName: string;
  };
  action: 'approved' | 'rejected' | 'status_changed';
  previous_status: string;
  new_status: string;
  notes?: string;
  created_at: string;
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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
      const userResponse = await api.get(`/v1/users/${id}`);
      if (userResponse.data.success) {
        setUser(userResponse.data.data);
      }

      // Fetch approval history
      const historyResponse = await api.get(`/v1/users/${id}/approval-history`);
      if (historyResponse.data.success) {
        setApprovalHistory(historyResponse.data.data);
      }
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
      await api.post(`/v1/users/${id}/approve`, {
        notes: 'Approved via admin dashboard',
      });
      
      toast.success('User approved successfully');

      fetchUserData();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/v1/users/${id}/reject`, {
        notes: 'Rejected via admin dashboard',
      });
      
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
      partner: 'bg-pink-500',
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
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
        </div>
        <div className="flex gap-2">
          {user.status === 'pending' && (
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
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={`${getStatusBadgeColor(user.status)} text-white`}>
                      {user.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="font-medium">
                      {user.lastLoginAt
                        ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
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
                  <div className="flex gap-2 flex-wrap">
                    {user.roles.map((role: string) => (
                      <Badge
                        key={role}
                        className={`${getRoleBadgeColor(role)} text-white`}
                      >
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                {user.permissions && user.permissions.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Special Permissions</p>
                    <div className="flex gap-2 flex-wrap">
                      {user.permissions.map((permission: string) => (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Email Verified</p>
                  <p className="text-2xl font-bold">
                    {user.isEmailVerified ? '✓' : '✗'}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Account Active</p>
                  <p className="text-2xl font-bold">
                    {user.isActive ? '✓' : '✗'}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Login Attempts</p>
                  <p className="text-2xl font-bold">
                    {user.loginAttempts || 0}
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
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
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
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                User's recent actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Activity tracking coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}