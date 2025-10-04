import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Switch, InputNumber, Button, message, Space, Spin, Row, Col, Upload, Rate } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Option } = Select;
const { TextArea } = Input;

interface SupplierFormData {
  businessName: string;
  businessNumber: string;
  userId?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  description: string;
  website: string;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  commissionRate: number;
  minimumOrder: number;
  maxProcessingDays: number;
  businessLicense?: string;
  taxId?: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
}

const SupplierForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    fetchUsers();
    if (isEdit) {
      fetchSupplier();
    }
  }, [id, isEdit]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users?role=vendor&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/suppliers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch supplier');
      }

      const data = await response.json();
      form.setFieldsValue(data.supplier);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      message.error('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: SupplierFormData) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const url = isEdit 
        ? `/api/admin/suppliers/${id}`
        : '/api/admin/suppliers';
      
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
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} supplier`);
      }

      message.success(`Supplier ${isEdit ? 'updated' : 'created'} successfully`);
      navigate('/admin/cpt-acf/suppliers');
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error(`Failed to ${isEdit ? 'update' : 'create'} supplier`);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors', 
    'Beauty & Health', 'Books & Media', 'Automotive', 'Food & Beverage', 'Other'
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
              onClick={() => navigate('/admin/cpt-acf/suppliers')}
            />
            <ShopOutlined />
            {isEdit ? 'Edit Supplier' : 'Create New Supplier'}
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isActive: true,
            isVerified: false,
            rating: 0,
            commissionRate: 10,
            minimumOrder: 0,
            maxProcessingDays: 7
          }}
        >
          <Row gutter={24}>
            <Col span={16}>
              <Card title="Business Information" size="small" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="businessName"
                      label="Business Name"
                      rules={[
                        { required: true, message: 'Please enter business name' },
                        { max: 100, message: 'Business name must be less than 100 characters' }
                      ]}
                    >
                      <Input placeholder="Enter business name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="businessNumber"
                      label="Business Registration Number"
                      rules={[
                        { required: true, message: 'Please enter business number' }
                      ]}
                    >
                      <Input placeholder="123-45-67890" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="category"
                      label="Business Category"
                      rules={[{ required: true, message: 'Please select a category' }]}
                    >
                      <Select placeholder="Select category">
                        {categories.map(category => (
                          <Option key={category} value={category}>
                            {category}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="website"
                      label="Website"
                    >
                      <Input placeholder="https://example.com" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="description"
                  label="Business Description"
                >
                  <TextArea 
                    rows={4}
                    placeholder="Describe your business..."
                    maxLength={500}
                  />
                </Form.Item>

                <Form.Item
                  name="address"
                  label="Business Address"
                  rules={[{ required: true, message: 'Please enter business address' }]}
                >
                  <TextArea 
                    rows={2}
                    placeholder="Full business address"
                  />
                </Form.Item>
              </Card>

              <Card title="Contact Information" size="small" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="contactPerson"
                      label="Contact Person"
                      rules={[{ required: true, message: 'Please enter contact person' }]}
                    >
                      <Input placeholder="Contact person name" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Please enter email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input placeholder="contact@business.com" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="phone"
                      label="Phone"
                      rules={[{ required: true, message: 'Please enter phone number' }]}
                    >
                      <Input placeholder="+82 10-0000-0000" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="userId"
                  label="Associated User Account"
                  help="Link this supplier to an existing user account"
                >
                  <Select 
                    placeholder="Select user account"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string).toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {users.map(user => (
                      <Option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>

              <Card title="Financial Information" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="taxId"
                      label="Tax ID"
                    >
                      <Input placeholder="Tax identification number" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="bankName"
                      label="Bank Name"
                    >
                      <Input placeholder="Bank name" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="accountHolder"
                      label="Account Holder"
                    >
                      <Input placeholder="Account holder name" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="bankAccount"
                  label="Bank Account Number"
                >
                  <Input placeholder="Bank account number" />
                </Form.Item>
              </Card>
            </Col>

            <Col span={8}>
              <Card title="Supplier Settings" size="small" style={{ marginBottom: '24px' }}>
                <Form.Item
                  name="rating"
                  label="Supplier Rating"
                >
                  <Rate allowHalf />
                </Form.Item>

                <Form.Item
                  name="commissionRate"
                  label="Commission Rate (%)"
                  rules={[
                    { required: true, message: 'Please enter commission rate' },
                    { type: 'number', min: 0, max: 100, message: 'Rate must be between 0-100%' }
                  ]}
                >
                  <InputNumber 
                    min={0}
                    max={100}
                    style={{ width: '100%' }}
                    formatter={value => `${value}%`}
                    parser={value => value!.replace('%', '')}
                  />
                </Form.Item>

                <Form.Item
                  name="minimumOrder"
                  label="Minimum Order (KRW)"
                  rules={[{ required: true, message: 'Please enter minimum order amount' }]}
                >
                  <InputNumber 
                    min={0}
                    style={{ width: '100%' }}
                    formatter={value => `₩ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/₩\s?|(,*)/g, '')}
                  />
                </Form.Item>

                <Form.Item
                  name="maxProcessingDays"
                  label="Max Processing Days"
                  rules={[{ required: true, message: 'Please enter processing days' }]}
                >
                  <InputNumber 
                    min={1}
                    max={30}
                    style={{ width: '100%' }}
                    formatter={value => `${value} days`}
                    parser={value => value!.replace(' days', '')}
                  />
                </Form.Item>

                <Form.Item
                  name="isActive"
                  label="Supplier Status"
                  valuePropName="checked"
                >
                  <Switch 
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>

                <Form.Item
                  name="isVerified"
                  label="Verification Status"
                  valuePropName="checked"
                >
                  <Switch 
                    checkedChildren="Verified"
                    unCheckedChildren="Unverified"
                  />
                </Form.Item>
              </Card>

              <Card title="Documents" size="small">
                <Form.Item
                  name="businessLicense"
                  label="Business License"
                >
                  <Upload
                    name="businessLicense"
                    listType="text"
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Business License
                    </Button>
                  </Upload>
                </Form.Item>

                <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Required Documents:</h4>
                  <ul style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    <li>Business Registration Certificate</li>
                    <li>Tax Registration Certificate</li>
                    <li>Bank Account Verification</li>
                    <li>Product Catalog (if applicable)</li>
                  </ul>
                </div>
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
                {isEdit ? 'Update Supplier' : 'Create Supplier'}
              </Button>
              <Button 
                size="large"
                onClick={() => navigate('/admin/cpt-acf/suppliers')}
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

export default SupplierForm;