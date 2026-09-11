import { FC, useState, useEffect } from 'react';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { settingsService, EmailSettings as EmailSettingsType } from '@/api/settings';
import { useToast } from '@/hooks/use-toast';

/**
 * 이메일(SMTP) 설정 — backend `GET/PUT /api/v1/settings/email` 만 존재한다.
 * "테스트 이메일 발송" 카드는 대응 endpoint 가 없어 항상 실패하던 UI 라 제거했다
 * (WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1 §7·§8 REMOVE_BROKEN_UI).
 */
const EmailSettings: FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<Partial<EmailSettingsType>>({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpSecure: false,
    fromEmail: '',
    fromName: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getEmailSettings();
      setSettings(data);
    } catch (error) {
      // Error log removed
      // 에러 시 기본값 유지
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.fromEmail) {
      toast({
        title: '오류',
        description: '모든 필수 항목을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await settingsService.updateEmailSettings(settings);
      toast({
        title: '성공',
        description: 'SMTP 설정이 저장되었습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: 'SMTP 설정 저장에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EmailSettingsType, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="o4o-card">
        <div className="o4o-card-body">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-o4o-text-primary">이메일 설정</h2>
              <p className="text-sm text-o4o-text-secondary mt-1">
                O4O 플랫폼 전체에서 이메일을 발송하기 위한 SMTP 설정을 구성합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SMTP Settings Form */}
      <form onSubmit={handleSubmit} className="o4o-card">
        <div className="o4o-card-header">
          <h3 className="o4o-card-title">SMTP 서버 설정</h3>
        </div>
        <div className="o4o-card-body space-y-6">
          {/* SMTP Host */}
          <div>
            <label className="o4o-label">
              SMTP 호스트 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="smtpHost"
              name="smtpHost"
              value={settings.smtpHost || ''}
              onChange={(e) => handleInputChange('smtpHost', e.target.value)}
              className="o4o-input"
              placeholder="예: smtp.gmail.com"
              required
            />
            <p className="mt-1 text-sm text-o4o-text-secondary">
              이메일 서비스 제공자의 SMTP 서버 주소
            </p>
          </div>

          {/* SMTP Port & Secure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="o4o-label">
                SMTP 포트 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="smtpPort"
                name="smtpPort"
                value={settings.smtpPort || 587}
                onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                className="o4o-input"
                placeholder="587"
                required
              />
              <p className="mt-1 text-sm text-o4o-text-secondary">
                일반적으로 587 (TLS) 또는 465 (SSL)
              </p>
            </div>
            <div>
              <label className="o4o-label">암호화</label>
              <select
                id="smtpSecure"
                name="smtpSecure"
                value={settings.smtpSecure ? 'ssl' : 'tls'}
                onChange={(e) => handleInputChange('smtpSecure', e.target.value === 'ssl')}
                className="o4o-input"
              >
                <option value="tls">TLS (권장)</option>
                <option value="ssl">SSL</option>
              </select>
              <p className="mt-1 text-sm text-o4o-text-secondary">
                포트 587은 TLS, 포트 465는 SSL 사용
              </p>
            </div>
          </div>

          {/* SMTP Authentication */}
          <div>
            <label className="o4o-label">
              SMTP 사용자명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="smtpUser"
              name="smtpUser"
              value={settings.smtpUser || ''}
              onChange={(e) => handleInputChange('smtpUser', e.target.value)}
              className="o4o-input"
              placeholder="예: your-email@gmail.com"
              required
            />
            <p className="mt-1 text-sm text-o4o-text-secondary">
              일반적으로 이메일 주소와 동일
            </p>
          </div>

          <div>
            <label className="o4o-label">
              SMTP 비밀번호 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="smtpPass"
                name="smtpPass"
                value={settings.smtpPass || ''}
                onChange={(e) => handleInputChange('smtpPass', e.target.value)}
                className="o4o-input pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-o4o-text-secondary hover:text-o4o-text-primary"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-sm text-o4o-text-secondary">
              Gmail의 경우 앱 비밀번호를 사용하세요
            </p>
          </div>

          {/* From Email Settings */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-o4o-text-primary mb-4">발신자 정보</h4>
            
            <div className="space-y-4">
              <div>
                <label className="o4o-label">
                  발신자 이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="fromEmail"
                  name="fromEmail"
                  value={settings.fromEmail || ''}
                  onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                  className="o4o-input"
                  placeholder="예: noreply@yourdomain.com"
                  required
                />
                <p className="mt-1 text-sm text-o4o-text-secondary">
                  받는 사람에게 표시될 발신자 이메일 주소
                </p>
              </div>

              <div>
                <label className="o4o-label">발신자 이름</label>
                <input
                  type="text"
                  id="fromName"
                  name="fromName"
                  value={settings.fromName || ''}
                  onChange={(e) => handleInputChange('fromName', e.target.value)}
                  className="o4o-input"
                  placeholder="예: WordPress Site"
                />
                <p className="mt-1 text-sm text-o4o-text-secondary">
                  받는 사람에게 표시될 발신자 이름 (선택사항)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="o4o-button-primary"
            >
              {loading ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </form>

      {/* Common SMTP Settings Help */}
      <div className="o4o-card">
        <div className="o4o-card-header">
          <h3 className="o4o-card-title">주요 이메일 서비스 SMTP 설정</h3>
        </div>
        <div className="o4o-card-body">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Gmail</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">호스트:</dt>
                    <dd>smtp.gmail.com</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">포트:</dt>
                    <dd>587 (TLS) / 465 (SSL)</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">비밀번호:</dt>
                    <dd>앱 비밀번호 사용 필요</dd>
                  </div>
                </dl>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Naver</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">호스트:</dt>
                    <dd>smtp.naver.com</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">포트:</dt>
                    <dd>587 (TLS)</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">사용자명:</dt>
                    <dd>네이버 아이디</dd>
                  </div>
                </dl>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Outlook/Office 365</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">호스트:</dt>
                    <dd>smtp.office365.com</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">포트:</dt>
                    <dd>587 (TLS)</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">사용자명:</dt>
                    <dd>전체 이메일 주소</dd>
                  </div>
                </dl>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">SendGrid</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">호스트:</dt>
                    <dd>smtp.sendgrid.net</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">포트:</dt>
                    <dd>587 (TLS) / 465 (SSL)</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-o4o-text-secondary w-20">사용자명:</dt>
                    <dd>apikey</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;