import { roleDisplayNames } from "@/types/user";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, UserPlus, UserCheck, UserX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api/base';
import { UserRole } from '@o4o/types';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: UserRole;
  roles: string[];
  status: 'active' | 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserListResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function UserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString() as any,
        limit: limit.toString() as any,
      });
      
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get<{ success: boolean; data: UserListResponse }>(`/users?${params}`);
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotal(response.data.data.pagination.total);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search, roleFilter, statusFilter]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((user: any) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle individual selection
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id: any) => id !== userId));
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedUsers.length === 0) return;

    try {
      await api.post('/users/bulk-approve', {
        userIds: selectedUsers,
        notes: 'Bulk approved via admin dashboard',
      });

      toast.success(`${selectedUsers.length} users approved successfully`);

      setSelectedUsers([]);
      fetchUsers();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to approve users');
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (selectedUsers.length === 0) return;

    try {
      await api.post('/users/bulk-reject', {
        userIds: selectedUsers,
        notes: 'Bulk rejected via admin dashboard',
      });

      toast.success(`${selectedUsers.length} users rejected successfully`);

      setSelectedUsers([]);
      fetchUsers();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to reject users');
    }
  };

  // Handle individual approve
  const handleApprove = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/approve`);
      
      toast.success('User approved successfully');

      fetchUsers();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to approve user');
    }
  };

  // Handle individual reject
  const handleReject = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/reject`);
      
      toast.success('User rejected successfully');

      fetchUsers();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to reject user');
    }
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/users/export/csv?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('Failed to export users');
    }
  };

  // Get role badge color
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

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      approved: 'bg-green-500',
      pending: 'bg-yellow-500',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Users</CardTitle>
            <Button onClick={() => navigate('/users/add')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e: any) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={"outline" as const} onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex gap-2">
                  <Button size={"sm" as const} onClick={handleBulkApprove}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Approve Selected
                  </Button>
                  <Button size={"sm" as const} variant="destructive" onClick={handleBulkReject}>
                    <UserX className="mr-2 h-4 w-4" />
                    Reject Selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700">Name</th>
                  <th className="p-4 text-left font-medium text-gray-700">Email</th>
                  <th className="p-4 text-left font-medium text-gray-700">Role</th>
                  <th className="p-4 text-left font-medium text-gray-700">Status</th>
                  <th className="p-4 text-left font-medium text-gray-700">Last Login</th>
                  <th className="p-4 text-left font-medium text-gray-700">Joined</th>
                  <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked: boolean) => handleSelectUser(user.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{user.fullName}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {user.email}
                          {user.isEmailVerified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.map((role: any) => (
                            <Badge
                              key={role}
                              className={`${getRoleBadgeColor(role)} text-white`}
                            >
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getStatusBadgeColor(user.status)} text-white`}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant={"ghost" as const} size={"sm" as const}>
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/users/${user.id}/edit`)}>
                              Edit User
                            </DropdownMenuItem>
                            {user.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(user.id)}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(user.id)}>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={"outline" as const}
                  size={"sm" as const}
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size={"sm" as const}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2">...</span>}
                </div>
                <Button
                  variant={"outline" as const}
                  size={"sm" as const}
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}