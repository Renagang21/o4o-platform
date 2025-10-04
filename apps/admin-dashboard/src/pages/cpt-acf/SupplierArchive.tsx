import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Input, Select, Space, Tag, Modal, message, Tooltip, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ShopOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface Supplier {
  id: string;
  businessName: string;
  businessNumber: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  description?: string;
  website?: string;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  commissionRate: number;
  minimumOrder: number;
  maxProcessingDays: number;
  createdAt: string;
  updatedAt: string;
}

const SupplierArchive: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
  }, [currentPage, searchText, categoryFilter, statusFilter]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchText,
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/suppliers?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }

      const data = await response.json();
      setSuppliers(data.suppliers || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      message.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (supplierId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/suppliers/${supplierId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update supplier status');
      }

      message.success(`Supplier ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchSuppliers();
    } catch (error) {
      console.error('Error updating supplier status:', error);
      message.error('Failed to update supplier status');
    }
  };

  const handleToggleVerification = async (supplierId: string, isVerified: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/suppliers/${supplierId}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isVerified: !isVerified })
      });

      if (!response.ok) {
        throw new Error('Failed to update verification status');
      }

      message.success(`Supplier ${!isVerified ? 'verified' : 'unverified'} successfully`);
      fetchSuppliers();
    } catch (error) {
      console.error('Error updating verification status:', error);
      message.error('Failed to update verification status');
    }
  };

  const handleDelete = async (supplierId: string) => {
    Modal.confirm({
      title: 'Delete Supplier',
      content: 'Are you sure you want to delete this supplier? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/suppliers/${supplierId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to delete supplier');
          }

          message.success('Supplier deleted successfully');
          fetchSuppliers();
        } catch (error) {
          console.error('Error deleting supplier:', error);
          message.error('Failed to delete supplier');
        }
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const columns = [
    {
      title: 'Business',
      key: 'business',
      render: (_, record: Supplier) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShopOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.businessName}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.businessNumber}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {record.category}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, record: Supplier) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.contactPerson}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>📧 {record.email}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>📞 {record.phone}</div>
          {record.website && (
            <div style={{ fontSize: '12px', color: '#1890ff' }}>
              🌐 <a href={record.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record: Supplier) => (
        <div>
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Tag>
          <Tag color={record.isVerified ? 'blue' : 'orange'} style={{ marginTop: '4px' }}>
            {record.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
          </Tag>
        </div>
      )
    },
    {
      title: 'Performance',
      key: 'performance',
      width: 150,
      render: (_, record: Supplier) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '12px' }}>Rating: </span>
            <Progress 
              percent={record.rating * 20} 
              size="small" 
              format={() => `${record.rating}/5`}
              strokeColor="#faad14"
            />
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            📦 {record.totalOrders} orders
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            💰 {formatCurrency(record.totalRevenue)}
          </div>
        </div>
      )
    },
    {
      title: 'Terms',
      key: 'terms',
      width: 130,
      render: (_, record: Supplier) => (
        <div style={{ fontSize: '12px' }}>
          <div>Commission: {record.commissionRate}%</div>
          <div>Min Order: {formatCurrency(record.minimumOrder)}</div>
          <div>Processing: {record.maxProcessingDays} days</div>
        </div>
      )
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
      width: 180,
      render: (_, record: Supplier) => (
        <Space>
          <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
            <Button
              type="link"
              icon={record.isActive ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleStatus(record.id, record.isActive)}
              style={{ 
                color: record.isActive ? '#ff4d4f' : '#52c41a' 
              }}
            />
          </Tooltip>
          <Tooltip title={record.isVerified ? 'Unverify' : 'Verify'}>
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleToggleVerification(record.id, record.isVerified)}
              style={{ 
                color: record.isVerified ? '#1890ff' : '#faad14' 
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/cpt-acf/suppliers/edit/${record.id}`)}
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

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors', 
    'Beauty & Health', 'Books & Media', 'Automotive', 'Food & Beverage', 'Other'
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Suppliers Archive"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/cpt-acf/suppliers/new')}
          >
            Add New Supplier
          </Button>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search suppliers..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: '150px' }}
          >
            <Option value="all">All Categories</Option>
            {categories.map(category => (
              <Option key={category} value={category}>
                {category}
              </Option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '120px' }}
          >
            <Option value="all">All Status</Option>
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
            <Option value="verified">Verified</Option>
            <Option value="unverified">Unverified</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={suppliers}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: 20,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} suppliers`,
            onChange: (page) => setCurrentPage(page)
          }}
        />
      </Card>
    </div>
  );
};

export default SupplierArchive;