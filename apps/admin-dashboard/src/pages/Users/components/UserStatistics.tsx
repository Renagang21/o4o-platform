import { roleDisplayNames } from "@/types/user";
import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, UserX, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api/base';

interface UserStatistics {
  total: number;
  pending: number;
  active: number;
  rejected: number;
  byRole: Record<string, number>;
}

export default function UserStatistics() {
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousStats, setPreviousStats] = useState<UserStatistics | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: UserStatistics }>('/v1/users/statistics');
      
      if (response.data.success) {
        // Save previous stats for comparison
        if (stats) {
          setPreviousStats(stats);
        }
        setStats(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching user statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous?: number): { value: number; isPositive: boolean } | null => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change > 0 };
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      previousValue: previousStats?.total,
    },
    {
      title: 'Active Users',
      value: stats?.active || 0,
      icon: UserCheck,
      color: 'bg-green-500',
      previousValue: previousStats?.active,
    },
    {
      title: 'Pending Approval',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      previousValue: previousStats?.pending,
    },
    {
      title: 'Rejected',
      value: stats?.rejected || 0,
      icon: UserX,
      color: 'bg-red-500',
      previousValue: previousStats?.rejected,
    },
  ];

  const roleNames: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    vendor: 'Vendor',
    seller: 'Seller',
    customer: 'Customer',
    business: 'Business',
    moderator: 'Moderator',
    partner: 'Partner',
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, index) => {
          const change = calculateChange(stat.value, stat.previousValue);
          const Icon = stat.icon;

          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                    {change && (
                      <div className="flex items-center mt-1">
                        {change.isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {change.value.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users by Role */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Users by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats && Object.entries(stats.byRole).map(([role, count]) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium w-32">{roleNames[role as keyof typeof roleDisplayNames] || role}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-gray-600">{count.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}