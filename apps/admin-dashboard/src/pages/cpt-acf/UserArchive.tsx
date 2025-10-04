import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Input, Select, Space, Tag, Modal, message, Tooltip, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  status: string;
  isActive: boolean;
  profileImage?: string;
  phone?: string;
  company?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

const UserArchive: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchText, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchText,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'approved' ? 'suspended' : 'approved';
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      message.success(`User ${newStatus} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      message.error('Failed to update user status');
    }
  };

  const handleDelete = async (userId: string) => {
    Modal.confirm({
      title: 'Delete User',
      content: 'Are you sure you want to delete this user? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to delete user');
          }

          message.success('User deleted successfully');
          fetchUsers();
        } catch (error) {
          console.error('Error deleting user:', error);
          message.error('Failed to delete user');
        }
      }
    });
  };

  const getRoleColor = (role: string) => {
    const colors = {
      super_admin: 'red',
      admin: 'orange',
      manager: 'blue',
      moderator: 'purple',
      vendor: 'green',
      vendor_manager: 'cyan',
      seller: 'lime',
      customer: 'default',
      business: 'gold',
      partner: 'magenta',
      supplier: 'volcano',
      affiliate: 'geekblue',
      beta_user: 'pink'
    };
    return colors[role as keyof typeof colors] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: 'green',
      pending: 'orange',
      rejected: 'red',
      suspended: 'volcano'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            src={record.profileImage} 
            icon={<UserOutlined />} 
            size={40}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.fullName || `${record.firstName} ${record.lastName}`}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.email}
            </div>
            {record.company && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                {record.company}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {role.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: User) => (
        <div>
          <Tag color={getStatusColor(status)}>
            {status.toUpperCase()}
          </Tag>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {record.isActive ? (
              <Tag color="green" size="small">ACTIVE</Tag>
            ) : (
              <Tag color="red" size="small">INACTIVE</Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 150,
      render: (_, record: User) => (
        <div style={{ fontSize: '12px' }}>
          {record.phone && (
            <div>📞 {record.phone}</div>
          )}
          <div>📧 {record.email}</div>
        </div>
      )
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record: User) => (
        <Space>
          <Tooltip title={record.status === 'approved' ? 'Suspend' : 'Approve'}>
            <Button
              type="link"
              icon={record.status === 'approved' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleStatus(record.id, record.status)}
              style={{ 
                color: record.status === 'approved' ? '#ff4d4f' : '#52c41a' 
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/cpt-acf/users/edit/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const roles = [
    'super_admin', 'admin', 'manager', 'moderator', 'vendor', 'vendor_manager',
    'seller', 'customer', 'business', 'partner', 'supplier', 'affiliate', 'beta_user'
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Users Archive"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/cpt-acf/users/new')}
          >
            Add New User
          </Button>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: '150px' }}
          >
            <Option value="all">All Roles</Option>
            {roles.map(role => (
              <Option key={role} value={role}>
                {role.replace('_', ' ').toUpperCase()}
              </Option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '120px' }}
          >
            <Option value="all">All Status</Option>
            <Option value="approved">Approved</Option>
            <Option value="pending">Pending</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="suspended">Suspended</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: 20,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
            onChange: (page) => setCurrentPage(page)
          }}
        />
      </Card>
    </div>
  );
};

export default UserArchive;