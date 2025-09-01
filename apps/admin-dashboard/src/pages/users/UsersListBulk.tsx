import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { useBulkActions } from '@/hooks/useBulkActions';
import { ScreenMeta } from '@/components/common/ScreenMeta';
import { UsersHelp } from '@/components/help/UsersHelp';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  posts?: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLogin?: string;
}

/**
 * WordPress-style Users list with bulk actions
 * Standardized with WordPressTable component
 */
const UsersListBulk: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Users query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', roleFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await authClient.api.get(`/users?${params}`);
      // Extract users array from the response
      if (response.data?.data?.users) {
        return response.data.data.users;
      }
      // Fallback to response.data if it's already an array
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id: any) => authClient.api.delete(`/users/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Selected users deleted successfully');
      setSelectedRows([]);
    },
    onError: () => {
      toast.error('Failed to delete some users');
    }
  });

  // Bulk role update mutation
  const bulkRoleMutation = useMutation({
    mutationFn: async ({ ids, role }: { ids: string[], role: string }) => {
      await Promise.all(ids.map((id: any) => 
        authClient.api.patch(`/users/${id}`, { role })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User roles updated successfully');
      setSelectedRows([]);
    },
    onError: () => {
      toast.error('Failed to update some users');
    }
  });

  // Send password reset email
  const sendPasswordResetMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id: any) => 
        authClient.api.post(`/users/${id}/send-password-reset`)
      ));
    },
    onSuccess: () => {
      toast.success('Password reset emails sent successfully');
    },
    onError: () => {
      toast.error('Failed to send some emails');
    }
  });

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'delete',
      label: 'Delete',
      action: async (ids: string[]) => {
        await bulkDeleteMutation.mutateAsync(ids);
      },
      confirmMessage: 'Are you sure you want to delete {count} user(s)? This cannot be undone.',
      isDestructive: true
    },
    {
      value: 'role-subscriber',
      label: 'Change role to Subscriber',
      action: async (ids: string[]) => {
        await bulkRoleMutation.mutateAsync({ ids, role: 'subscriber' });
      }
    },
    {
      value: 'role-contributor',
      label: 'Change role to Contributor',
      action: async (ids: string[]) => {
        await bulkRoleMutation.mutateAsync({ ids, role: 'contributor' });
      }
    },
    {
      value: 'role-author',
      label: 'Change role to Author',
      action: async (ids: string[]) => {
        await bulkRoleMutation.mutateAsync({ ids, role: 'author' });
      }
    },
    {
      value: 'role-editor',
      label: 'Change role to Editor',
      action: async (ids: string[]) => {
        await bulkRoleMutation.mutateAsync({ ids, role: 'editor' });
      }
    },
    {
      value: 'send-password-reset',
      label: 'Send password reset',
      action: async (ids: string[]) => {
        await sendPasswordResetMutation.mutateAsync(ids);
      },
      confirmMessage: 'Send password reset email to {count} user(s)?'
    }
  ];

  const {
    selectedCount,
    isProcessing,
    executeBulkAction
  } = useBulkActions({
    items: users,
    idField: 'id',
    actions: bulkActions,
    selectedIds: selectedRows
  });

  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'username',
      label: 'Username',
      sortable: true
    },
    {
      id: 'name',
      label: 'Name'
    },
    {
      id: 'email',
      label: 'Email'
    },
    {
      id: 'role',
      label: 'Role',
      width: '120px'
    },
    {
      id: 'posts',
      label: 'Posts',
      width: '80px',
      align: 'center'
    }
  ];

  // Transform users to table rows
  const rows: WordPressTableRow[] = users.map((user: User) => ({
    id: user.id,
    data: {
      username: (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <Link to={`/users/${user.id}/edit`} className="font-medium text-blue-600 hover:text-blue-800">
              {user.name}
            </Link>
          </div>
        </div>
      ),
      name: user.name,
      email: (
        <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800">
          {user.email}
        </a>
      ),
      role: (
        <Badge variant="secondary">{user.role}</Badge>
      ),
      posts: (
        <a href={`/posts?author=${user.id}`} className="text-blue-600 hover:text-blue-800">
          {user.posts || 0}
        </a>
      )
    },
    actions: [
      {
        label: 'Edit',
        onClick: () => navigate(`/users/${user.id}/edit`)
      },
      {
        label: 'View',
        onClick: () => navigate(`/users/${user.id}`)
      },
      {
        label: 'Send password reset',
        onClick: async () => {
          await sendPasswordResetMutation.mutateAsync([user.id]);
        }
      },
      {
        label: 'Delete',
        onClick: async () => {
          if (confirm(`Delete user ${user.name}?`)) {
            await bulkDeleteMutation.mutateAsync([user.id]);
          }
        },
        className: 'text-red-600'
      }
    ]
  }));

  // Handle row selection
  const handleSelectRow = (rowId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== rowId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(users.map((u: User) => u.id));
    } else {
      setSelectedRows([]);
    }
  };

  // Role stats
  const roleStats = {
    all: users.length,
    administrator: users.filter((u: any) => u.role === 'administrator').length,
    editor: users.filter((u: any) => u.role === 'editor').length,
    author: users.filter((u: any) => u.role === 'author').length,
    contributor: users.filter((u: any) => u.role === 'contributor').length,
    subscriber: users.filter((u: any) => u.role === 'subscriber').length
  };

  return (
    <div className="wrap">
      <UsersHelp />
      <ScreenMeta />
      
      <h1 className="wp-heading-inline">Users</h1>
      <Link to="/users/add" className="page-title-action">
        Add New
      </Link>
      <hr className="wp-header-end" />

      {/* Role filter tabs */}
      <ul className="subsubsub">
        <li className="all">
          <a 
            href="#" 
            className={roleFilter === 'all' ? 'current' : ''} 
            onClick={(e) => { e.preventDefault(); setRoleFilter('all'); }}
          >
            All <span className="count">({roleStats.all})</span>
          </a> |
        </li>
        <li className="administrator">
          <a 
            href="#" 
            className={roleFilter === 'administrator' ? 'current' : ''} 
            onClick={(e) => { e.preventDefault(); setRoleFilter('administrator'); }}
          >
            Administrator <span className="count">({roleStats.administrator})</span>
          </a> |
        </li>
        <li className="editor">
          <a 
            href="#" 
            className={roleFilter === 'editor' ? 'current' : ''} 
            onClick={(e) => { e.preventDefault(); setRoleFilter('editor'); }}
          >
            Editor <span className="count">({roleStats.editor})</span>
          </a> |
        </li>
        <li className="author">
          <a 
            href="#" 
            className={roleFilter === 'author' ? 'current' : ''} 
            onClick={(e) => { e.preventDefault(); setRoleFilter('author'); }}
          >
            Author <span className="count">({roleStats.author})</span>
          </a> |
        </li>
        <li className="contributor">
          <a 
            href="#" 
            className={roleFilter === 'contributor' ? 'current' : ''} 
            onClick={(e) => { e.preventDefault(); setRoleFilter('contributor'); }}
          >
            Contributor <span className="count">({roleStats.contributor})</span>
          </a> |
        </li>
        <li className="subscriber">
          <a 
            href="#" 
            className={roleFilter === 'subscriber' ? 'current' : ''} 
            onClick={(e) => { e.preventDefault(); setRoleFilter('subscriber'); }}
          >
            Subscriber <span className="count">({roleStats.subscriber})</span>
          </a>
        </li>
      </ul>

      {/* Search */}
      <div className="search-box">
        <Input
          type="search"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
          className="w-[300px]"
        />
        <Button variant="secondary">
          Search Users
        </Button>
      </div>

      {/* Bulk Actions - Top */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="top"
      />

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        loading={isLoading}
        emptyMessage="No users found. Add your first user!"
      />

      {/* Bulk Actions - Bottom */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="bottom"
      />

      {/* Pagination */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{users.length} items</span>
          {/* TODO: Add pagination controls */}
        </div>
      </div>

      {error && (
        <div className="notice notice-error">
          <p>Error loading users. Please try again.</p>
        </div>
      )}
    </div>
  );
};

export default UsersListBulk;