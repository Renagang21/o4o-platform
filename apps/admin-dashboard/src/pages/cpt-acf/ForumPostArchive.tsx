import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Input, Select, Space, Tag, Modal, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, PushpinOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface ForumPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  authorId: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  status: string;
  isPinned: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const ForumPostArchive: React.FC = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, [currentPage, searchText, statusFilter, categoryFilter, sortBy]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchText,
        sortBy,
        ...(categoryFilter !== 'all' && { categoryId: categoryFilter })
      });

      const response = await fetch(`/api/admin/forum/posts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.data?.posts || []);
      setTotalCount(data.data?.pagination?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching posts:', error);
      message.error('Failed to load forum posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    Modal.confirm({
      title: 'Delete Post',
      content: 'Are you sure you want to delete this post? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/forum/posts/${postId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to delete post');
          }

          message.success('Post deleted successfully');
          fetchPosts();
        } catch (error) {
          console.error('Error deleting post:', error);
          message.error('Failed to delete post');
        }
      }
    });
  };

  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/forum/posts/${postId}/pin`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPinned: !isPinned })
      });

      if (!response.ok) {
        throw new Error('Failed to update pin status');
      }

      message.success(`Post ${!isPinned ? 'pinned' : 'unpinned'} successfully`);
      fetchPosts();
    } catch (error) {
      console.error('Error updating pin status:', error);
      message.error('Failed to update pin status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      publish: 'green',
      draft: 'orange',
      pending: 'blue',
      rejected: 'red',
      archived: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ForumPost) => (
        <div>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {record.isPinned && <PushpinOutlined style={{ color: '#1890ff' }} />}
            {text}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>/{record.slug}</div>
          {record.excerpt && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {record.excerpt.substring(0, 100)}...
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Author',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 120
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Stats',
      key: 'stats',
      width: 120,
      render: (_, record: ForumPost) => (
        <div style={{ fontSize: '12px' }}>
          <div>👁️ {record.viewCount}</div>
          <div>💬 {record.commentCount}</div>
          <div>❤️ {record.likeCount}</div>
        </div>
      )
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <div>
          {tags?.slice(0, 3).map(tag => (
            <Tag key={tag} size="small" style={{ marginBottom: '2px' }}>
              {tag}
            </Tag>
          ))}
          {tags?.length > 3 && <Tag size="small">+{tags.length - 3}</Tag>}
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
      render: (_, record: ForumPost) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/forum/posts/${record.slug}`, '_blank')}
            />
          </Tooltip>
          <Tooltip title={record.isPinned ? 'Unpin' : 'Pin'}>
            <Button
              type="link"
              icon={<PushpinOutlined />}
              style={{ color: record.isPinned ? '#1890ff' : undefined }}
              onClick={() => handleTogglePin(record.id, record.isPinned)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/cpt-acf/forum-posts/edit/${record.id}`)}
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

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Forum Posts Archive"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/cpt-acf/forum-posts/new')}
          >
            Add New Post
          </Button>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search posts..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '120px' }}
          >
            <Option value="all">All Status</Option>
            <Option value="publish">Published</Option>
            <Option value="draft">Draft</Option>
            <Option value="pending">Pending</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="archived">Archived</Option>
          </Select>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: '150px' }}
          >
            <Option value="all">All Categories</Option>
          </Select>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: '120px' }}
          >
            <Option value="latest">Latest</Option>
            <Option value="oldest">Oldest</Option>
            <Option value="popular">Popular</Option>
            <Option value="trending">Trending</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={posts}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: 20,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} posts`,
            onChange: (page) => setCurrentPage(page)
          }}
        />
      </Card>
    </div>
  );
};

export default ForumPostArchive;