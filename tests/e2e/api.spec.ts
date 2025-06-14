import { test, expect } from '@playwright/test';

/**
 * API 엔드포인트 E2E 테스트
 * 백엔드 API의 주요 기능들을 테스트
 */
test.describe('API 엔드포인트 테스트', () => {
  let authToken = '';
  
  test.beforeAll(async ({ request }) => {
    // 테스트용 토큰 획득
    const loginResponse = await request.post('/api/v1/auth/login', {
      data: {
        email: 'test@o4o-platform.com',
        password: 'test123456'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.data.token;
  });

  test.describe('인증 API', () => {
    test('POST /api/v1/auth/signup - 회원가입', async ({ request }) => {
      const uniqueEmail = `test${Date.now()}@example.com`;
      
      const response = await request.post('/api/v1/auth/signup', {
        data: {
          email: uniqueEmail,
          password: 'Test123456!',
          name: 'Test User',
          role: 'user'
        }
      });

      expect(response.status()).toBe(201);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(uniqueEmail);
      expect(data.data.password).toBeUndefined(); // 비밀번호는 응답에 포함되지 않아야 함
    });

    test('POST /api/v1/auth/login - 로그인 성공', async ({ request }) => {
      const response = await request.post('/api/v1/auth/login', {
        data: {
          email: 'test@o4o-platform.com',
          password: 'test123456'
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.email).toBe('test@o4o-platform.com');
    });

    test('POST /api/v1/auth/login - 로그인 실패', async ({ request }) => {
      const response = await request.post('/api/v1/auth/login', {
        data: {
          email: 'test@o4o-platform.com',
          password: 'wrongpassword'
        }
      });

      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid credentials');
    });

    test('GET /api/v1/auth/me - 프로필 조회', async ({ request }) => {
      const response = await request.get('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('test@o4o-platform.com');
    });

    test('GET /api/v1/auth/me - 인증 없이 접근', async ({ request }) => {
      const response = await request.get('/api/v1/auth/me');

      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });
  });

  test.describe('사용자 관리 API', () => {
    let createdUserId = '';

    test('POST /api/v1/users - 사용자 생성', async ({ request }) => {
      const uniqueEmail = `api-test${Date.now()}@example.com`;
      
      const response = await request.post('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          email: uniqueEmail,
          name: 'API Test User',
          role: 'user'
        }
      });

      expect(response.status()).toBe(201);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(uniqueEmail);
      
      createdUserId = data.data.id;
    });

    test('GET /api/v1/users - 사용자 목록 조회', async ({ request }) => {
      const response = await request.get('/api/v1/users?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.data).toBeInstanceOf(Array);
      expect(data.data.total).toBeGreaterThan(0);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(10);
    });

    test('GET /api/v1/users/:id - 특정 사용자 조회', async ({ request }) => {
      const response = await request.get(`/api/v1/users/${createdUserId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(createdUserId);
    });

    test('PATCH /api/v1/users/:id - 사용자 정보 수정', async ({ request }) => {
      const response = await request.patch(`/api/v1/users/${createdUserId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Updated API Test User'
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated API Test User');
    });

    test('DELETE /api/v1/users/:id - 사용자 삭제', async ({ request }) => {
      const response = await request.delete(`/api/v1/users/${createdUserId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(204);
    });
  });

  test.describe('헬스체크 API', () => {
    test('GET /api/health - 서버 상태 확인', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });

    test('GET /api/v1/health - 상세 헬스체크', async ({ request }) => {
      const response = await request.get('/api/v1/health');

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.database).toBe('connected');
      expect(data.data.redis).toBeDefined();
      expect(data.data.uptime).toBeGreaterThan(0);
    });
  });

  test.describe('에러 처리', () => {
    test('404 - 존재하지 않는 엔드포인트', async ({ request }) => {
      const response = await request.get('/api/v1/nonexistent');

      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Not Found');
    });

    test('405 - 지원하지 않는 HTTP 메서드', async ({ request }) => {
      const response = await request.patch('/api/health');

      expect(response.status()).toBe(405);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Method Not Allowed');
    });

    test('400 - 잘못된 요청 데이터', async ({ request }) => {
      const response = await request.post('/api/v1/auth/signup', {
        data: {
          email: 'invalid-email',
          password: '123' // 너무 짧은 비밀번호
        }
      });

      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  test.describe('API 버전 관리', () => {
    test('API 버전 헤더 확인', async ({ request }) => {
      const response = await request.get('/api/v1/health');

      expect(response.headers()['api-version']).toBe('1.0.0');
      expect(response.headers()['content-type']).toContain('application/json');
    });

    test('CORS 헤더 확인', async ({ request }) => {
      const response = await request.options('/api/v1/health');

      expect(response.headers()['access-control-allow-origin']).toBeDefined();
      expect(response.headers()['access-control-allow-methods']).toBeDefined();
      expect(response.headers()['access-control-allow-headers']).toBeDefined();
    });
  });

  test.describe('속도 제한 (Rate Limiting)', () => {
    test('로그인 API 속도 제한', async ({ request }) => {
      // 동일한 IP에서 연속 요청으로 속도 제한 테스트
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          request.post('/api/v1/auth/login', {
            data: {
              email: 'test@example.com',
              password: 'wrongpassword'
            }
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // 일부 요청은 429 (Too Many Requests) 상태를 반환해야 함
      const tooManyRequests = responses.filter(r => r.status() === 429);
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
});
