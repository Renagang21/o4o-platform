# 🔐 관리자 OAuth 설정 메뉴 설계

## 📋 제안하는 관리자 메뉴 구조

### 1️⃣ 메인 관리자 대시보드
```
📊 대시보드
📝 콘텐츠 관리
🔐 인증 설정  ← 새로운 메뉴
  ├── OAuth 제공자 설정
  ├── 사용자 관리
  └── 보안 설정
⚙️ 시스템 설정
```

### 2️⃣ OAuth 제공자 설정 화면

```typescript
// 관리자 > 인증 설정 > OAuth 제공자 설정

interface OAuthProviderSettings {
  google: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;  // 자동 생성: https://auth.neture.co.kr/auth/google/callback
  };
  naver: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  kakao: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;  // 카카오는 비활성화
    callbackUrl: string;
  };
}
```

---

## 🎨 UI/UX 설계

### OAuth 설정 페이지 레이아웃
```
┌─────────────────────────────────────────────────────────┐
│ 🔐 OAuth 제공자 설정                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📌 설정 가이드                                           │
│ 각 소셜 로그인 제공자의 OAuth 클라이언트 정보를 입력하세요.   │
│                                                          │
│ ┌─── Google OAuth ─────────────────────────────────┐   │
│ │ ☑️ 활성화                                         │   │
│ │                                                   │   │
│ │ Client ID:                                        │   │
│ │ [________________________________] 👁️            │   │
│ │                                                   │   │
│ │ Client Secret:                                    │   │
│ │ [********************************] 👁️            │   │
│ │                                                   │   │
│ │ Callback URL (자동 생성):                         │   │
│ │ https://auth.neture.co.kr/auth/google/callback   │   │
│ │ 📋 복사                                           │   │
│ │                                                   │   │
│ │ [테스트 연결] [저장]                              │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─── Naver OAuth ──────────────────────────────────┐   │
│ │ ☑️ 활성화                                         │   │
│ │ ...                                               │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─── Kakao OAuth ──────────────────────────────────┐   │
│ │ ☑️ 활성화                                         │   │
│ │ ...                                               │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ [모두 저장] [변경 취소]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ 구현 방안

### 1. React 컴포넌트 (프론트엔드)
```tsx
// src/pages/admin/OAuthSettings.tsx
import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Copy, TestTube } from 'lucide-react';

interface OAuthProvider {
  id: 'google' | 'naver' | 'kakao';
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  hasSecret: boolean;
}

export function OAuthSettings() {
  const [providers, setProviders] = useState<OAuthProvider[]>([
    {
      id: 'google',
      name: 'Google',
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'https://auth.neture.co.kr/auth/google/callback',
      hasSecret: true
    },
    {
      id: 'naver',
      name: 'Naver',
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'https://auth.neture.co.kr/auth/naver/callback',
      hasSecret: true
    },
    {
      id: 'kakao',
      name: 'Kakao',
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'https://auth.neture.co.kr/auth/kakao/callback',
      hasSecret: false
    }
  ]);

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/oauth-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers })
      });
      
      if (response.ok) {
        alert('OAuth 설정이 저장되었습니다.');
      }
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const testConnection = async (providerId: string) => {
    // OAuth 연결 테스트 로직
  };

  return (
    <div className="oauth-settings">
      <h1>🔐 OAuth 제공자 설정</h1>
      
      <div className="guide-box">
        <h3>📌 설정 가이드</h3>
        <p>각 소셜 로그인 제공자의 OAuth 클라이언트 정보를 입력하세요.</p>
      </div>

      {providers.map(provider => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          showSecret={showSecrets[provider.id]}
          onToggleSecret={() => setShowSecrets({
            ...showSecrets,
            [provider.id]: !showSecrets[provider.id]
          })}
          onChange={(updated) => {
            setProviders(providers.map(p => 
              p.id === provider.id ? updated : p
            ));
          }}
          onTest={() => testConnection(provider.id)}
        />
      ))}

      <div className="actions">
        <button onClick={handleSave} className="btn-primary">
          <Save /> 모두 저장
        </button>
        <button className="btn-secondary">변경 취소</button>
      </div>
    </div>
  );
}
```

### 2. API 엔드포인트 (백엔드)
```typescript
// services/api-server/src/routes/admin.routes.ts
router.put('/admin/oauth-settings', requireAdmin, async (req, res) => {
  try {
    const { providers } = req.body;
    
    // 환경변수 파일 업데이트
    const envPath = path.join(__dirname, '../../../auth/backend/.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    providers.forEach(provider => {
      const idKey = `${provider.id.toUpperCase()}_CLIENT_ID`;
      const secretKey = `${provider.id.toUpperCase()}_CLIENT_SECRET`;
      
      envContent = updateEnvVariable(envContent, idKey, provider.clientId);
      if (provider.hasSecret) {
        envContent = updateEnvVariable(envContent, secretKey, provider.clientSecret);
      }
    });
    
    fs.writeFileSync(envPath, envContent);
    
    // PM2로 auth 서버 재시작
    exec('pm2 restart auth-server', (error) => {
      if (error) {
        console.error('PM2 restart failed:', error);
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update OAuth settings' });
  }
});
```

### 3. 보안 강화
```typescript
// 키값 암호화 저장
import crypto from 'crypto';

class OAuthSettingsService {
  private encryptionKey: string;
  
  constructor() {
    this.encryptionKey = process.env.OAUTH_ENCRYPTION_KEY || 'default-key';
  }
  
  encryptSecret(text: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decryptSecret(encrypted: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

---

## 🚀 추가 기능 제안

### 1. OAuth 연결 테스트
```typescript
// 각 제공자별 연결 테스트
async function testOAuthConnection(provider: string) {
  const testUrl = `https://auth.neture.co.kr/auth/${provider}/test`;
  const response = await fetch(testUrl);
  return response.ok;
}
```

### 2. 자동 Callback URL 생성
```typescript
// 현재 도메인 기반으로 자동 생성
function generateCallbackUrl(provider: string) {
  const authDomain = process.env.AUTH_BASE_URL || 'https://auth.neture.co.kr';
  return `${authDomain}/auth/${provider}/callback`;
}
```

### 3. 설정 히스토리
```typescript
// OAuth 설정 변경 이력 저장
interface OAuthSettingHistory {
  id: string;
  changedBy: string;
  changedAt: Date;
  provider: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}
```

### 4. 가이드 링크
```typescript
// 각 제공자별 설정 가이드 직접 링크
const providerGuides = {
  google: 'https://console.cloud.google.com/apis/credentials',
  naver: 'https://developers.naver.com/apps',
  kakao: 'https://developers.kakao.com/console/app'
};
```

---

## 📊 장점

1. **편의성**: 서버 접속 없이 브라우저에서 직접 설정
2. **보안**: 암호화된 저장, 권한 관리
3. **검증**: 연결 테스트로 설정 확인
4. **가이드**: 각 단계별 도움말 제공
5. **이력 관리**: 변경 사항 추적 가능

---

## 🔐 보안 고려사항

1. **접근 권한**: 최고 관리자만 접근 가능
2. **암호화**: Client Secret 암호화 저장
3. **감사 로그**: 모든 변경 사항 기록
4. **2FA**: 중요 설정 변경 시 2차 인증

---

**🎯 이렇게 관리자 화면에 OAuth 설정 메뉴를 추가하면 훨씬 관리가 편해집니다!**

구현하시겠습니까?