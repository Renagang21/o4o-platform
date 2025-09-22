import React, { FC, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Settings } from 'lucide-react';
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
  const [roleFilter, setRoleFilter] = useState(() => {
    const saved = sessionStorage.getItem('users-role-filter');
    return saved || 'all';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    const saved = sessionStorage.getItem('users-status-filter');
    return saved || 'all';
  });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    name: '',
    email: '',
    role: 'subscriber' as string,
    status: 'active' as User['status']
  });
  const [showScreenOptions, setShowScreenOptions] = useState(false);

  // Screen Options state - load from localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('users-visible-columns');
    return saved ? JSON.parse(saved) : {
      name: true,
      email: true,
      role: true,
      posts: true,
      lastLogin: false
    };
  });

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('users-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  // Persist filters in sessionStorage
  useEffect(() => {
    sessionStorage.setItem('users-role-filter', roleFilter);
  }, [roleFilter]);

  useEffect(() => {
    sessionStorage.setItem('users-status-filter', statusFilter);
  }, [statusFilter]);

  // Persist Screen Options in localStorage
  useEffect(() => {
    localStorage.setItem('users-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('users-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Users query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', roleFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await authClient.api.get(`/v1/users?${params}`);
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
      await Promise.all(ids.map((id: any) => authClient.api.delete(`/v1/users/${id}`)));
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
        authClient.api.put(`/v1/users/${id}`, { roles: [role] })
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
        authClient.api.post(`/v1/users/${id}/send-password-reset`)
      ));
    },
    onSuccess: () => {
      toast.success('Password reset emails sent successfully');
    },
    onError: () => {
      toast.error('Failed to send some emails');
    }
  });

  // Quick Edit mutation
  const quickEditMutation = useMutation({
    mutationFn: async (data: { id: string, name: string, email: string, role: string, status: User['status'] }) => {
      const response = await authClient.api.put(`/v1/users/${data.id}`, {
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' ') || '',
        email: data.email,
        roles: [data.role],
        status: data.status
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setQuickEditId(null);
    },
    onError: () => {
      toast.error('Failed to update user');
    }
  });

  // Quick Edit handlers
  const handleQuickEdit = (userId: string) => {
    const user = users.find((u: User) => u.id === userId);
    if (user) {
      setQuickEditData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      });
      setQuickEditId(userId);
    }
  };

  const handleSaveQuickEdit = async () => {
    if (quickEditId) {
      await quickEditMutation.mutateAsync({
        id: quickEditId,
        ...quickEditData
      });
    }
  };

  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      name: '',
      email: '',
      role: 'subscriber',
      status: 'active'
    });
  };

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

  // Filter users based on role, status and search
  const getFilteredUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u: User) => u.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u: User) => u.status === statusFilter);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter((u: User) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

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
    administrator: users.filter((u: User) => u.role === 'administrator').length,
    editor: users.filter((u: User) => u.role === 'editor').length,
    author: users.filter((u: User) => u.role === 'author').length,
    contributor: users.filter((u: User) => u.role === 'contributor').length,
    subscriber: users.filter((u: User) => u.role === 'subscriber').length
  };

  // Status stats
  const statusStats = {
    all: users.length,
    active: users.filter((u: User) => u.status === 'active').length,
    inactive: users.filter((u: User) => u.status === 'inactive').length,
    pending: users.filter((u: User) => u.status === 'pending').length
  };

  return (
    <div className="wrap">
      <UsersHelp />
      <ScreenMeta />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="wp-heading-inline">Users</h1>
          <Link to="/users/add" className="page-title-action">
            Add New
          </Link>
        </div>

        {/* Screen Options Button */}
        <div className="relative">
          <button
            onClick={() => setShowScreenOptions(!showScreenOptions)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
            Screen Options
            <ChevronDown className="w-3 h-3" />
          </button>

          {showScreenOptions && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
              <div className="p-4">
                <h3 className="font-medium text-sm mb-3">Columns</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns.name}
                      onChange={(e) => setVisibleColumns({...visibleColumns, name: e.target.checked})}
                      className="mr-2"
                    />
                    Name
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns.email}
                      onChange={(e) => setVisibleColumns({...visibleColumns, email: e.target.checked})}
                      className="mr-2"
                    />
                    Email
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns.role}
                      onChange={(e) => setVisibleColumns({...visibleColumns, role: e.target.checked})}
                      className="mr-2"
                    />
                    Role
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns.posts}
                      onChange={(e) => setVisibleColumns({...visibleColumns, posts: e.target.checked})}
                      className="mr-2"
                    />
                    Posts
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns.lastLogin}
                      onChange={(e) => setVisibleColumns({...visibleColumns, lastLogin: e.target.checked})}
                      className="mr-2"
                    />
                    Last Login
                  </label>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <label>Number of items per page:</label>
                    <input
                      type="number"
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(parseInt(e.target.value) || 20)}
                      min="1"
                      max="999"
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowScreenOptions(false)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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

      {/* Status filter tabs */}
      <ul className="subsubsub" style={{ marginTop: '8px' }}>
        <li className="all">
          <a
            href="#"
            className={statusFilter === 'all' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('all'); }}
          >
            All Status <span className="count">({statusStats.all})</span>
          </a> |
        </li>
        <li className="active">
          <a
            href="#"
            className={statusFilter === 'active' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('active'); }}
          >
            Active <span className="count">({statusStats.active})</span>
          </a> |
        </li>
        <li className="inactive">
          <a
            href="#"
            className={statusFilter === 'inactive' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('inactive'); }}
          >
            Inactive <span className="count">({statusStats.inactive})</span>
          </a> |
        </li>
        <li className="pending">
          <a
            href="#"
            className={statusFilter === 'pending' ? 'current' : ''}
            onClick={(e) => { e.preventDefault(); setStatusFilter('pending'); }}
          >
            Pending <span className="count">({statusStats.pending})</span>
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

      {/* Users Table */}
      <div className="wp-list-table widefat fixed striped table-view-list users">
        <table className="wp-list-table widefat fixed striped table-view-list users">
          <thead>
            <tr>
              <td id="cb" className="manage-column column-cb check-column">
                <input
                  id="cb-select-all-1"
                  type="checkbox"
                  checked={selectedRows.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </td>
              <th scope="col" id="username" className="manage-column column-username column-primary sortable desc">
                <span>Username</span>
              </th>
              {visibleColumns.name && (
                <th scope="col" id="name" className="manage-column column-name">
                  Name
                </th>
              )}
              {visibleColumns.email && (
                <th scope="col" id="email" className="manage-column column-email">
                  Email
                </th>
              )}
              {visibleColumns.role && (
                <th scope="col" id="role" className="manage-column column-role">
                  Role
                </th>
              )}
              {visibleColumns.posts && (
                <th scope="col" id="posts" className="manage-column column-posts num">
                  Posts
                </th>
              )}
              {visibleColumns.lastLogin && (
                <th scope="col" id="lastLogin" className="manage-column column-last-login">
                  Last Login
                </th>
              )}
            </tr>
          </thead>
          <tbody id="the-list">
            {filteredUsers.map((user: User) => (
              <React.Fragment key={user.id}>
                {quickEditId === user.id ? (
                  // Quick Edit Row
                  <tr className="inline-edit-row quick-edit-row quick-edit-row-user quick-edit-user">
                    <td colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} className="colspanchange">
                      <div className="quick-edit-wrap">
                        <h4>Quick Edit</h4>
                        <div className="inline-edit-col">
                          <label>
                            <span className="title">Name</span>
                            <span className="input-text-wrap">
                              <input
                                type="text"
                                name="display_name"
                                className="ptitle"
                                value={quickEditData.name}
                                onChange={(e) => setQuickEditData({...quickEditData, name: e.target.value})}
                              />
                            </span>
                          </label>
                          <label>
                            <span className="title">Email</span>
                            <span className="input-text-wrap">
                              <input
                                type="email"
                                name="email"
                                className="ptitle"
                                value={quickEditData.email}
                                onChange={(e) => setQuickEditData({...quickEditData, email: e.target.value})}
                              />
                            </span>
                          </label>
                        </div>
                        <div className="inline-edit-col">
                          <label>
                            <span className="title">Role</span>
                            <select
                              name="role"
                              value={quickEditData.role}
                              onChange={(e) => setQuickEditData({...quickEditData, role: e.target.value})}
                            >
                              <option value="subscriber">Subscriber</option>
                              <option value="contributor">Contributor</option>
                              <option value="author">Author</option>
                              <option value="editor">Editor</option>
                              <option value="administrator">Administrator</option>
                            </select>
                          </label>
                          <label>
                            <span className="title">Status</span>
                            <select
                              name="status"
                              value={quickEditData.status}
                              onChange={(e) => setQuickEditData({...quickEditData, status: e.target.value as User['status']})}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="pending">Pending</option>
                            </select>
                          </label>
                        </div>
                        <div className="submit inline-edit-save">
                          <button
                            type="button"
                            className="button cancel alignleft"
                            onClick={handleCancelQuickEdit}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="button button-primary save alignright"
                            onClick={handleSaveQuickEdit}
                            disabled={quickEditMutation.isPending}
                          >
                            {quickEditMutation.isPending ? 'Updating...' : 'Update User'}
                          </button>
                          <span className="spinner"></span>
                          <br className="clear" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Normal Row
                  <tr
                    className={selectedRows.includes(user.id) ? 'selected' : ''}
                    onMouseEnter={() => {
                      // Clear any existing timeout
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                      // Set new timeout to show menu after 300ms
                      hoverTimeoutRef.current = setTimeout(() => {
                        setHoveredRow(user.id);
                      }, 300);
                    }}
                    onMouseLeave={() => {
                      // Clear timeout if mouse leaves before menu shows
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      setHoveredRow(null);
                    }}
                  >
                    <th scope="row" className="check-column">
                      <input
                        id={`user_${user.id}`}
                        type="checkbox"
                        name="users[]"
                        value={user.id}
                        checked={selectedRows.includes(user.id)}
                        onChange={(e) => handleSelectRow(user.id, e.target.checked)}
                      />
                    </th>
                    <td className="username column-username has-row-actions column-primary">
                      <div className="row-title">
                        <Avatar className="h-8 w-8 inline-block mr-2">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <strong>
                          <Link to={`/users/${user.id}/edit`} className="row-title">
                            {user.name}
                          </Link>
                        </strong>
                      </div>
                      {hoveredRow === user.id && (
                        <div className="row-actions">
                          <span className="edit">
                            <Link to={`/users/${user.id}/edit`}>Edit</Link> |
                          </span>
                          <span className="quickedit">
                            <button
                              type="button"
                              className="button-link editinline"
                              onClick={() => handleQuickEdit(user.id)}
                            >
                              Quick Edit
                            </button> |
                          </span>
                          <span className="view">
                            <Link to={`/users/${user.id}`}>View</Link> |
                          </span>
                          <span className="delete">
                            <button
                              type="button"
                              className="button-link"
                              onClick={async () => {
                                if (confirm(`Delete user ${user.name}?`)) {
                                  await bulkDeleteMutation.mutateAsync([user.id]);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </span>
                        </div>
                      )}
                    </td>
                    {visibleColumns.name && (
                      <td className="name column-name">
                        {user.name}
                      </td>
                    )}
                    {visibleColumns.email && (
                      <td className="email column-email">
                        <a href={`mailto:${user.email}`}>{user.email}</a>
                      </td>
                    )}
                    {visibleColumns.role && (
                      <td className="role column-role">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        <br />
                        <small className={`status-${user.status}`}>
                          {user.status === 'active' && <span className="dashicons dashicons-yes-alt" style={{color: '#46b450'}}></span>}
                          {user.status === 'inactive' && <span className="dashicons dashicons-dismiss" style={{color: '#dc3232'}}></span>}
                          {user.status === 'pending' && <span className="dashicons dashicons-clock" style={{color: '#ffb900'}}></span>}
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </small>
                      </td>
                    )}
                    {visibleColumns.posts && (
                      <td className="posts column-posts">
                        <a href={`/posts?author=${user.id}`} className="edit">
                          {user.posts || 0}
                        </a>
                      </td>
                    )}
                    {visibleColumns.lastLogin && (
                      <td className="lastLogin column-last-login">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
                      </td>
                    )}
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredUsers.length === 0 && (
              <tr className="no-items">
                <td className="colspanchange" colSpan={1 + Object.values(visibleColumns).filter(Boolean).length}>
                  {isLoading ? 'Loading users...' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          <span className="displaying-num">{filteredUsers.length} items</span>
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