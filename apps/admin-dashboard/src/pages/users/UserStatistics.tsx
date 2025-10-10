import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Activity,
  Shield,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserApi } from '@/api/userApi';
import toast from 'react-hot-toast';

interface UserStats {
  total: number;
  active: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  emailVerified: number;
  recentRegistrations: number;
  loginActivity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  roleDistribution: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  registrationTrends: Array<{
    date: string;
    count: number;
    approved: number;
    rejected: number;
  }>;
  topActiveUsers: Array<{
    id: string;
    name: string;
    email: string;
    lastLogin: string;
    loginCount: number;
  }>;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = "text-blue-600" }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm mt-1 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function UserStatistics() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await UserApi.getUserStats();
      const responseAny = response as any;

      if (responseAny.data?.success) {
        setStats(responseAny.data.data);
      } else if (response) {
        setStats(response as unknown as UserStats);
      }
    } catch (error) {
      toast.error('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No statistics available</h3>
          <p className="text-gray-600">Unable to load user statistics at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Statistics</h1>
          <p className="text-gray-600">Overview of user registrations and activity</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.total.toLocaleString()}
          icon={<Users className="h-6 w-6" />}
          color="text-blue-600"
        />
        <StatCard
          title="Active Users"
          value={stats.active.toLocaleString()}
          icon={<UserCheck className="h-6 w-6" />}
          color="text-green-600"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending.toLocaleString()}
          icon={<Clock className="h-6 w-6" />}
          color="text-yellow-600"
        />
        <StatCard
          title="New This Month"
          value={stats.recentRegistrations.toLocaleString()}
          icon={<UserPlus className="h-6 w-6" />}
          color="text-purple-600"
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Approved Users"
          value={stats.approved.toLocaleString()}
          icon={<UserCheck className="h-6 w-6" />}
          color="text-green-600"
        />
        <StatCard
          title="Rejected Users"
          value={stats.rejected.toLocaleString()}
          icon={<UserX className="h-6 w-6" />}
          color="text-red-600"
        />
        <StatCard
          title="Email Verified"
          value={`${((stats.emailVerified / stats.total) * 100).toFixed(1)}%`}
          icon={<Mail className="h-6 w-6" />}
          color="text-blue-600"
        />
        <StatCard
          title="Suspended Users"
          value={stats.suspended.toLocaleString()}
          icon={<Shield className="h-6 w-6" />}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Login Activity</CardTitle>
            <CardDescription>User login statistics over different time periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Today</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {stats.loginActivity.today} logins
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">This Week</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {stats.loginActivity.thisWeek} logins
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">This Month</span>
                </div>
                <Badge className="bg-purple-100 text-purple-800">
                  {stats.loginActivity.thisMonth} logins
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Breakdown of users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.roleDistribution.map((roleData) => (
                <div key={roleData.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium capitalize">
                      {roleData.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {roleData.percentage.toFixed(1)}%
                    </span>
                    <Badge variant="outline">
                      {roleData.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Trends</CardTitle>
          <CardDescription>Daily user registration and approval statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.registrationTrends.slice(0, 7).map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{trend.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-blue-600">
                    {trend.count} registered
                  </Badge>
                  <Badge variant="outline" className="text-green-600">
                    {trend.approved} approved
                  </Badge>
                  <Badge variant="outline" className="text-red-600">
                    {trend.rejected} rejected
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Active Users */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Users</CardTitle>
          <CardDescription>Users with the most login activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topActiveUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{user.loginCount} logins</p>
                  <p className="text-xs text-gray-600">
                    Last: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}