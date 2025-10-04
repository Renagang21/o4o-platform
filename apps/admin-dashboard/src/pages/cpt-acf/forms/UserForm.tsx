import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Switch, Button, message, Space, Spin, Avatar, Upload, Row, Col } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Option } = Select;
const { TextArea } = Input;

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  confirmPassword?: string;
  role: string;
  status: string;
  isActive: boolean;
  phone?: string;
  company?: string;
  address?: string;
  profileImage?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
}

const UserForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      fetchUser();
    }
  }, [id, isEdit]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      const user = data.user;
      form.setFieldsValue(user);
      setAvatarUrl(user.profileImage || '');
    } catch (error) {
      console.error('Error fetching user:', error);
      message.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (info: any) => {
    if (info.file.status === 'done') {
      setAvatarUrl(info.file.response.url);
      form.setFieldsValue({ profileImage: info.file.response.url });
    }
  };

  const handleSubmit = async (values: UserFormData) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      // Remove password fields if they're empty
      if (!values.password) {
        delete values.password;
        delete values.confirmPassword;
      }

      const url = isEdit 
        ? `/api/admin/users/${id}`
        : '/api/admin/users';
      
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
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} user`);
      }

      message.success(`User ${isEdit ? 'updated' : 'created'} successfully`);
      navigate('/admin/cpt-acf/users');
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error(`Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally {
      setSubmitting(false);
    }
  };

  const roles = [
    { value: 'super_admin', label: 'Super Admin', color: 'red' },
    { value: 'admin', label: 'Admin', color: 'orange' },
    { value: 'manager', label: 'Manager', color: 'blue' },
    { value: 'moderator', label: 'Moderator', color: 'purple' },
    { value: 'vendor', label: 'Vendor', color: 'green' },
    { value: 'vendor_manager', label: 'Vendor Manager', color: 'cyan' },
    { value: 'seller', label: 'Seller', color: 'lime' },
    { value: 'customer', label: 'Customer', color: 'default' },
    { value: 'business', label: 'Business', color: 'gold' },
    { value: 'partner', label: 'Partner', color: 'magenta' },
    { value: 'supplier', label: 'Supplier', color: 'volcano' },
    { value: 'affiliate', label: 'Affiliate', color: 'geekblue' },
    { value: 'beta_user', label: 'Beta User', color: 'pink' }
  ];

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
              onClick={() => navigate('/admin/cpt-acf/users')}
            />
            {isEdit ? 'Edit User' : 'Create New User'}
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            role: 'customer',
            status: 'approved',
            isActive: true
          }}
        >
          <Row gutter={24}>
            <Col span={16}>
              <Card title="Basic Information" size="small" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="firstName"
                      label="First Name"
                      rules={[
                        { required: true, message: 'Please enter first name' },
                        { max: 50, message: 'First name must be less than 50 characters' }
                      ]}
                    >
                      <Input placeholder="Enter first name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="lastName"
                      label="Last Name"
                      rules={[
                        { required: true, message: 'Please enter last name' },
                        { max: 50, message: 'Last name must be less than 50 characters' }
                      ]}
                    >
                      <Input placeholder="Enter last name" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input placeholder="user@example.com" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="password"
                      label={isEdit ? "New Password (leave blank to keep current)" : "Password"}
                      rules={[
                        { required: !isEdit, message: 'Please enter password' },
                        { min: 6, message: 'Password must be at least 6 characters' }
                      ]}
                    >
                      <Input.Password placeholder="Enter password" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="confirmPassword"
                      label="Confirm Password"
                      dependencies={['password']}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password placeholder="Confirm password" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card title="Contact Information" size="small" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="Phone"
                    >
                      <Input placeholder="+82 10-0000-0000" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="company"
                      label="Company"
                    >
                      <Input placeholder="Company name" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="address"
                  label="Address"
                >
                  <TextArea 
                    rows={2}
                    placeholder="Full address"
                  />
                </Form.Item>
              </Card>

              <Card title="Social & Bio" size="small">
                <Form.Item
                  name="bio"
                  label="Biography"
                >
                  <TextArea 
                    rows={3}
                    placeholder="Brief bio..."
                    maxLength={500}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="website"
                      label="Website"
                    >
                      <Input placeholder="https://example.com" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="linkedin"
                      label="LinkedIn"
                    >
                      <Input placeholder="LinkedIn profile URL" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="twitter"
                      label="Twitter"
                    >
                      <Input placeholder="@username" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={8}>
              <Card title="Profile & Settings" size="small">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <Avatar 
                    size={100}
                    src={avatarUrl}
                    icon={<UserOutlined />}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <Upload
                      showUploadList={false}
                      onChange={handleAvatarUpload}
                      action="/api/upload/avatar"
                    >
                      <Button icon={<UploadOutlined />} size="small">
                        Upload Avatar
                      </Button>
                    </Upload>
                  </div>
                </div>

                <Form.Item
                  name="role"
                  label="Role"
                  rules={[{ required: true, message: 'Please select a role' }]}
                >
                  <Select placeholder="Select role">
                    {roles.map(role => (
                      <Option key={role.value} value={role.value}>
                        {role.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select placeholder="Select status">
                    <Option value="approved">Approved</Option>
                    <Option value="pending">Pending</Option>
                    <Option value="rejected">Rejected</Option>
                    <Option value="suspended">Suspended</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="isActive"
                  label="Account Status"
                  valuePropName="checked"
                >
                  <Switch 
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>

                {isEdit && (
                  <div style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '6px' }}>
                    <h4>Account Statistics</h4>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div>Last Login: Never</div>
                      <div>Created: {new Date().toLocaleDateString()}</div>
                      <div>Updated: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '32px' }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                icon={<SaveOutlined />}
                size="large"
              >
                {isEdit ? 'Update User' : 'Create User'}
              </Button>
              <Button 
                size="large"
                onClick={() => navigate('/admin/cpt-acf/users')}
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

export default UserForm;