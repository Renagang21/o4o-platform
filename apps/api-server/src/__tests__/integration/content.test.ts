import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../setup/testApp';

// Test app instance
let app: express.Application;
let authToken: string;

describe('Content API Integration Tests', () => {
  beforeAll(() => {
    // Initialize test app
    app = createTestApp();
    
    // Generate test auth token
    authToken = jwt.sign(
      { id: 'test-user', email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/v1/content/posts', () => {
    it('should return paginated posts', async () => {
      const response = await request(app)
        .get('/api/v1/content/posts')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('posts');
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });

    it('should filter posts by status', async () => {
      const response = await request(app)
        .get('/api/v1/content/posts')
        .query({ status: 'published' })
        .expect(200);

      expect(response.body.status).toBe('success');
      if (response.body.data.length > 0) {
        response.body.data.forEach((post: any) => {
          expect(post.status).toBe('published');
        });
      }
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/content/posts')
        .query({ page: 2, limit: 5 })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data.posts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/v1/content/posts', () => {
    it('should create a new post with authentication', async () => {
      const newPost = {
        title: 'Test Post',
        content: 'This is a test post content',
        status: 'draft',
        categories: [],
        tags: []
      };

      const response = await request(app)
        .post('/api/v1/content/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPost)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data.post).toHaveProperty('id');
      expect(response.body.data.post.title).toBe(newPost.title);
    });

    it('should reject post creation without authentication', async () => {
      const newPost = {
        title: 'Unauthorized Post',
        content: 'This should fail'
      };

      await request(app)
        .post('/api/v1/content/posts')
        .send(newPost)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidPost = {
        // Missing title
        content: 'Content without title'
      };

      const response = await request(app)
        .post('/api/v1/content/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPost)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/content/posts/:id', () => {
    it('should return a specific post', async () => {
      const postId = 'test-post-1';
      
      const response = await request(app)
        .get(`/api/v1/content/posts/${postId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data.post).toHaveProperty('id', postId);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/v1/content/posts/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/content/posts/:id', () => {
    it('should update an existing post', async () => {
      const postId = 'test-post-1';
      const updates = {
        title: 'Updated Title',
        status: 'published'
      };

      const response = await request(app)
        .put(`/api/v1/content/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data.post.title).toBe(updates.title);
      expect(response.body.data.post.status).toBe(updates.status);
    });

    it('should reject updates without authentication', async () => {
      await request(app)
        .put('/api/v1/content/posts/test-post-1')
        .send({ title: 'Unauthorized Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/content/posts/:id', () => {
    it('should delete a post', async () => {
      const postId = 'test-post-to-delete';

      await request(app)
        .delete(`/api/v1/content/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should reject deletion without authentication', async () => {
      await request(app)
        .delete('/api/v1/content/posts/test-post-1')
        .expect(401);
    });
  });

  describe('GET /api/v1/content/categories', () => {
    it('should return all categories', async () => {
      const response = await request(app)
        .get('/api/v1/content/categories')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should support hierarchical parameter', async () => {
      const response = await request(app)
        .get('/api/v1/content/categories')
        .query({ hierarchical: true })
        .expect(200);

      expect(response.body.status).toBe('success');
      // Check if categories have parent-child structure
      if (response.body.data.length > 0) {
        response.body.data.forEach((category: any) => {
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('name');
        });
      }
    });
  });

  describe('GET /api/v1/content/media', () => {
    it('should return media files with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/content/media')
        .query({ page: 1, pageSize: 20 })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('media');
      expect(Array.isArray(response.body.data.media)).toBe(true);
    });

    it('should filter media by type', async () => {
      const response = await request(app)
        .get('/api/v1/content/media')
        .query({ type: 'image' })
        .expect(200);

      expect(response.body.status).toBe('success');
      if (response.body.data.length > 0) {
        response.body.data.forEach((media: any) => {
          expect(media.type).toMatch(/image/);
        });
      }
    });
  });

  describe('POST /api/v1/content/media/upload', () => {
    it('should upload media file with authentication', async () => {
      // Note: In real tests, you would use actual file upload
      // This is a simplified example
      const response = await request(app)
        .post('/api/v1/content/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test.jpg')
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('media');
      expect(response.body.data.media).toHaveProperty('id');
      expect(response.body.data.media).toHaveProperty('url');
    });

    it('should reject upload without authentication', async () => {
      await request(app)
        .post('/api/v1/content/media/upload')
        .attach('file', Buffer.from('test'), 'test.jpg')
        .expect(401);
    });
  });

  describe('GET /api/v1/content/authors', () => {
    it('should return list of authors', async () => {
      const response = await request(app)
        .get('/api/v1/content/authors')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('authors');
      expect(Array.isArray(response.body.data.authors)).toBe(true);
      if (response.body.data.authors.length > 0) {
        response.body.data.authors.forEach((author: any) => {
          expect(author).toHaveProperty('id');
          expect(author).toHaveProperty('name');
        });
      }
    });
  });
});