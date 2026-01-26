import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authClient } from '@o4o/auth-client';
import { 
  Link2, 
  Mail, 
  Chrome, 
  MessageCircle, 
  Globe,
  Loader2,
  ArrowRight
} from 'lucide-react';

interface AccountLinkingCardProps {
  onSuccess?: () => void;
}

const providers = [
  {
    id: 'google',
    name: 'Google',
    icon: Chrome,
    color: 'bg-red-500 hover:bg-red-600',
    description: 'Google 계정으로 로그인'
  },
  {
    id: 'kakao',
    name: 'Kakao',
    icon: MessageCircle,
    color: 'bg-yellow-400 hover:bg-yellow-500',
    description: '카카오 계정으로 로그인'
  },
  {
    id: 'naver',
    name: 'Naver',
    icon: Globe,
    color: 'bg-green-500 hover:bg-green-600',
    description: '네이버 계정으로 로그인'
  }
];

export const AccountLinkingCard: React.FC<AccountLinkingCardProps> = ({ onSuccess }) => {
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOAuthLink = async (provider: string) => {
    try {
      // OAuth 연동은 실제로는 OAuth 플로우를 시작해야 함
      // 여기서는 데모를 위한 구현
      window.location.href = `/api/v1/auth/oauth/${provider}/link`;
    } catch (error) {
      toast({
        title: '오류',
        description: '계정 연결에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email || !emailForm.password) return;

    setLoading(true);
    try {
      const response = await authClient.api.post('/auth/accounts/link/email', {
        email: emailForm.email,
        password: emailForm.password
      });

      if (response.data.success) {
        toast({
          title: '성공',
          description: response.data.requiresVerification 
            ? '인증 이메일이 발송되었습니다. 이메일을 확인해주세요.'
            : '이메일 계정이 연결되었습니다.',
        });
        setEmailForm({ email: '', password: '' });
        setLinkingEmail(false);
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.response?.data?.message || '계정 연결에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          계정 연결하기
        </CardTitle>
        <CardDescription>
          새로운 로그인 방법을 추가하여 더 편리하게 접속하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!linkingEmail ? (
          <div className="space-y-3">
            {providers.map((provider) => {
              const Icon = provider.icon;
              return (
                <Button
                  key={provider.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleOAuthLink(provider.id)}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {provider.description}
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              );
            })}
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">또는</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLinkingEmail(true)}
            >
              <Mail className="mr-2 h-5 w-5" />
              이메일로 계정 연결
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmailLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-email">이메일</Label>
              <Input
                id="link-email"
                type="email"
                placeholder="email@example.com"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-password">비밀번호</Label>
              <Input
                id="link-password"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호"
                value={emailForm.password}
                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLinkingEmail(false);
                  setEmailForm({ email: '', password: '' });
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading || !emailForm.email || !emailForm.password}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    연결 중...
                  </>
                ) : (
                  '계정 연결'
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};