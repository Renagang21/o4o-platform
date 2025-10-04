import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Input, Select, Space, Tag, Modal, message, Tooltip, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TeamOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface Partner {
  id: string;
  companyName: string;
  companyType: string;
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
  website?: string;
  description?: string;
  partnershipType: string;
  commissionRate: number;
  isActive: boolean;
  isVerified: boolean;
  contractStartDate: string;
  contractEndDate?: string;
  totalReferrals: number;
  totalCommissionEarned: number;
  monthlyTarget: number;
  currentMonthReferrals: number;
  performanceRating: number;
  createdAt: string;
  updatedAt: string;
}

const PartnerArchive: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPartners();
  }, [currentPage, searchText, typeFilter, statusFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchText,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/partners?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }

      const data = await response.json();
      setPartners(data.partners || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching partners:', error);
      message.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (partnerId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/partners/${partnerId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update partner status');
      }

      message.success(`Partner ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchPartners();
    } catch (error) {
      console.error('Error updating partner status:', error);
      message.error('Failed to update partner status');
    }
  };

  const handleDelete = async (partnerId: string) => {
    Modal.confirm({
      title: 'Delete Partner',
      content: 'Are you sure you want to delete this partner? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/partners/${partnerId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to delete partner');
          }

          message.success('Partner deleted successfully');
          fetchPartners();
        } catch (error) {
          console.error('Error deleting partner:', error);
          message.error('Failed to delete partner');
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

  const getPartnershipTypeColor = (type: string) => {
    const colors = {
      'referral': 'blue',
      'reseller': 'green',
      'affiliate': 'orange',
      'strategic': 'purple',
      'technology': 'cyan'
    };
    return colors[type as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (_, record: Partner) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.companyName}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.companyType} • {record.businessNumber}
            </div>
            <Tag color={getPartnershipTypeColor(record.partnershipType)} size="small">
              {record.partnershipType.toUpperCase()}
            </Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, record: Partner) => (
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
      render: (_, record: Partner) => (
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
      width: 180,
      render: (_, record: Partner) => (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>Rating: </span>
            <Progress 
              percent={record.performanceRating * 20} 
              size="small" 
              format={() => `${record.performanceRating}/5`}
              strokeColor="#faad14"
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>Monthly Target: </span>
            <Progress 
              percent={(record.currentMonthReferrals / record.monthlyTarget) * 100} 
              size="small" 
              format={() => `${record.currentMonthReferrals}/${record.monthlyTarget}`}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Total: {record.totalReferrals} referrals
          </div>
        </div>
      )
    },
    {
      title: 'Commission',
      key: 'commission',
      width: 120,
      render: (_, record: Partner) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.commissionRate}%</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Earned: {formatCurrency(record.totalCommissionEarned)}
          </div>
        </div>
      )
    },
    {
      title: 'Contract',
      key: 'contract',
      width: 120,
      render: (_, record: Partner) => (
        <div style={{ fontSize: '12px' }}>
          <div>Start: {new Date(record.contractStartDate).toLocaleDateString()}</div>
          {record.contractEndDate && (
            <div>End: {new Date(record.contractEndDate).toLocaleDateString()}</div>
          )}
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
      width: 150,
      render: (_, record: Partner) => (
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
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/cpt-acf/partners/edit/${record.id}`)}
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

  const partnershipTypes = ['referral', 'reseller', 'affiliate', 'strategic', 'technology'];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Partners Archive"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/cpt-acf/partners/new')}
          >
            Add New Partner
          </Button>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search partners..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: '150px' }}
          >
            <Option value="all">All Types</Option>
            {partnershipTypes.map(type => (
              <Option key={type} value={type}>
                {type.toUpperCase()}
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
          dataSource={partners}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize: 20,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} partners`,
            onChange: (page) => setCurrentPage(page)
          }}
        />
      </Card>
    </div>
  );
};

export default PartnerArchive;