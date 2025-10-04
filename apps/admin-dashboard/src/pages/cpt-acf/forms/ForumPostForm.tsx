import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Switch, Button, message, Space, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TagOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Option } = Select;
const { TextArea } = Input;

interface ForumPostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categoryId: string;
  type: string;
  status: string;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  allowComments: boolean;
}

interface Category {
  id: string;
  name: string;
}

const ForumPostForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchPost();
    }
  }, [id, isEdit]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/forum/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/forum/posts/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }

      const data = await response.json();
      const post = data.post;
      form.setFieldsValue({
        ...post,
        tags: post.tags || []
      });
      setTags(post.tags || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      message.error('Failed to load post data');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  };

  const generateExcerpt = (content: string) => {
    return content
      .replace(/<[^>]*>/g, '')
      .substring(0, 150)
      .trim() + (content.length > 150 ? '...' : '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = generateSlug(title);
    form.setFieldsValue({ slug });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    const excerpt = generateExcerpt(content);
    form.setFieldsValue({ excerpt });
  };

  const handleAddTag = () => {
    if (inputTag && !tags.includes(inputTag.toLowerCase())) {
      const newTags = [...tags, inputTag.toLowerCase()];
      setTags(newTags);
      form.setFieldsValue({ tags: newTags });
      setInputTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setFieldsValue({ tags: newTags });
  };

  const handleSubmit = async (values: ForumPostFormData) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const url = isEdit 
        ? `/api/admin/forum/posts/${id}`
        : '/api/admin/forum/posts';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...values,
          tags
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} post`);
      }

      message.success(`Post ${isEdit ? 'updated' : 'created'} successfully`);
      navigate('/admin/cpt-acf/forum-posts');
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error(`Failed to ${isEdit ? 'update' : 'create'} post`);
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
              onClick={() => navigate('/admin/cpt-acf/forum-posts')}
            />
            {isEdit ? 'Edit Forum Post' : 'Create New Forum Post'}
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: 'discussion',
            status: 'publish',
            isPinned: false,
            isLocked: false,
            allowComments: true,
            tags: []
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div>
              <Form.Item
                name="title"
                label="Post Title"
                rules={[
                  { required: true, message: 'Please enter post title' },
                  { max: 200, message: 'Title must be less than 200 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter post title"
                  onChange={handleTitleChange}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="slug"
                label="URL Slug"
                rules={[
                  { required: true, message: 'Please enter URL slug' },
                  { pattern: /^[a-z0-9-가-힣]+$/, message: 'Slug can only contain lowercase letters, numbers, and hyphens' }
                ]}
              >
                <Input 
                  placeholder="post-url-slug"
                  addonBefore="/"
                />
              </Form.Item>

              <Form.Item
                name="content"
                label="Content"
                rules={[
                  { required: true, message: 'Please enter post content' }
                ]}
              >
                <TextArea 
                  rows={12}
                  placeholder="Write your post content here..."
                  onChange={handleContentChange}
                />
              </Form.Item>

              <Form.Item
                name="excerpt"
                label="Excerpt"
                help="Auto-generated from content, but you can edit it"
              >
                <TextArea 
                  rows={3}
                  placeholder="Brief summary of the post..."
                  maxLength={300}
                />
              </Form.Item>

              <Form.Item label="Tags">
                <div style={{ marginBottom: '8px' }}>
                  <Input
                    placeholder="Add a tag..."
                    value={inputTag}
                    onChange={(e) => setInputTag(e.target.value)}
                    onPressEnter={handleAddTag}
                    style={{ width: '200px', marginRight: '8px' }}
                  />
                  <Button 
                    type="dashed" 
                    icon={<TagOutlined />}
                    onClick={handleAddTag}
                  >
                    Add Tag
                  </Button>
                </div>
                <div>
                  {tags.map(tag => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => handleRemoveTag(tag)}
                      style={{ marginBottom: '4px' }}
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
              </Form.Item>
            </div>

            <div>
              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  {categories.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="type"
                label="Post Type"
                rules={[{ required: true, message: 'Please select post type' }]}
              >
                <Select placeholder="Select post type">
                  <Option value="discussion">Discussion</Option>
                  <Option value="question">Question</Option>
                  <Option value="announcement">Announcement</Option>
                  <Option value="poll">Poll</Option>
                  <Option value="guide">Guide</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select status">
                  <Option value="publish">Published</Option>
                  <Option value="draft">Draft</Option>
                  <Option value="pending">Pending Review</Option>
                  <Option value="archived">Archived</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="isPinned"
                label="Pinned Post"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Pinned"
                  unCheckedChildren="Normal"
                />
              </Form.Item>

              <Form.Item
                name="isLocked"
                label="Lock Comments"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Locked"
                  unCheckedChildren="Open"
                />
              </Form.Item>

              <Form.Item
                name="allowComments"
                label="Allow Comments"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Allowed"
                  unCheckedChildren="Disabled"
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
                size="large"
              >
                {isEdit ? 'Update Post' : 'Create Post'}
              </Button>
              <Button 
                size="large"
                onClick={() => navigate('/admin/cpt-acf/forum-posts')}
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

export default ForumPostForm;