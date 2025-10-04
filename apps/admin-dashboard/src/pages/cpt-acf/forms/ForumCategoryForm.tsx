import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Switch, InputNumber, Button, message, Space, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Option } = Select;
const { TextArea } = Input;

interface ForumCategoryFormData {
  name: string;
  slug: string;
  description: string;
  accessLevel: string;
  requireApproval: boolean;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  color?: string;
  icon?: string;
}

const ForumCategoryForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      fetchCategory();
    }
  }, [id, isEdit]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/forum/categories/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch category');
      }

      const data = await response.json();
      form.setFieldsValue(data.category);
    } catch (error) {
      console.error('Error fetching category:', error);
      message.error('Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    form.setFieldsValue({ slug });
  };

  const handleSubmit = async (values: ForumCategoryFormData) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const url = isEdit 
        ? `/api/admin/forum/categories/${id}`
        : '/api/admin/forum/categories';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} category`);
      }

      message.success(`Category ${isEdit ? 'updated' : 'created'} successfully`);
      navigate('/admin/cpt-acf/forum-categories');
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error(`Failed to ${isEdit ? 'update' : 'create'} category`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/admin/cpt-acf/forum-categories')}
            />
            {isEdit ? 'Edit Forum Category' : 'Create New Forum Category'}
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            accessLevel: 'public',
            requireApproval: false,
            isActive: true,
            sortOrder: 0
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <Form.Item
                name="name"
                label="Category Name"
                rules={[
                  { required: true, message: 'Please enter category name' },
                  { max: 100, message: 'Category name must be less than 100 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter category name"
                  onChange={handleNameChange}
                />
              </Form.Item>

              <Form.Item
                name="slug"
                label="URL Slug"
                rules={[
                  { required: true, message: 'Please enter URL slug' },
                  { pattern: /^[a-z0-9-]+$/, message: 'Slug can only contain lowercase letters, numbers, and hyphens' }
                ]}
              >
                <Input 
                  placeholder="category-url-slug"
                  addonBefore="/"
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[
                  { max: 500, message: 'Description must be less than 500 characters' }
                ]}
              >
                <TextArea 
                  rows={4}
                  placeholder="Brief description of this category"
                />
              </Form.Item>

              <Form.Item
                name="accessLevel"
                label="Access Level"
                rules={[{ required: true, message: 'Please select access level' }]}
              >
                <Select placeholder="Select access level">
                  <Option value="public">Public - Anyone can view and post</Option>
                  <Option value="members">Members Only - Registered users only</Option>
                  <Option value="moderators">Moderators - Moderators and above</Option>
                  <Option value="admins">Admins - Admin access only</Option>
                </Select>
              </Form.Item>
            </div>

            <div>
              <Form.Item
                name="sortOrder"
                label="Sort Order"
                rules={[{ required: true, message: 'Please enter sort order' }]}
              >
                <InputNumber 
                  min={0}
                  max={999}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>

              <Form.Item
                name="color"
                label="Category Color"
              >
                <Input 
                  type="color"
                  style={{ width: '100px' }}
                  placeholder="#1890ff"
                />
              </Form.Item>

              <Form.Item
                name="icon"
                label="Icon Class"
                help="CSS class for category icon (e.g., 'fas fa-comments')"
              >
                <Input 
                  placeholder="fas fa-comments"
                />
              </Form.Item>

              <Form.Item
                name="requireApproval"
                label="Post Approval"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Required"
                  unCheckedChildren="Not Required"
                />
              </Form.Item>

              <Form.Item
                name="isActive"
                label="Status"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Active"
                  unCheckedChildren="Inactive"
                />
              </Form.Item>
            </div>
          </div>

          <Form.Item style={{ marginTop: '32px' }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                icon={<SaveOutlined />}
              >
                {isEdit ? 'Update Category' : 'Create Category'}
              </Button>
              <Button 
                onClick={() => navigate('/admin/cpt-acf/forum-categories')}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ForumCategoryForm;