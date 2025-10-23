import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { 
  Shield, 
  Mail, 
  Unlink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Chrome,
  MessageCircle,
  Globe
} from 'lucide-react';

interface LinkedAccount {
  id: string;
  provider: 'email' | 'google' | 'kakao' | 'naver';
  email: string;
  displayName?: string;
  profileImage?: string;
  isVerified: boolean;
  isPrimary: boolean;
  linkedAt: string;
  lastUsedAt?: string;
}

const providerIcons = {
  email: Mail,
  google: Chrome,
  kakao: MessageCircle,
  naver: Globe
};

const providerColors = {
  email: 'bg-gray-100 text-gray-700',
  google: 'bg-red-100 text-red-700',
  kakao: 'bg-yellow-100 text-yellow-700',
  naver: 'bg-green-100 text-green-700'
};

export const LinkedAccountsManager: React.FC = () => {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkDialog, setUnlinkDialog] = useState<{ open: boolean; account?: LinkedAccount }>({ open: false });
  const [password, setPassword] = useState('');
  const [unlinking, setUnlinking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    try {
      const response = await apiClient.get('/auth/accounts/linked');
      if (response.data.success) {
        setLinkedAccounts(response.data.data.linkedAccounts);
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '연결된 계정을 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkDialog.account || !password) return;

    setUnlinking(true);
    try {
      const response = await apiClient.post('/auth/accounts/unlink', {
        provider: unlinkDialog.account.provider,
        verification: {
          method: 'password',
          password
        }
      });

      if (response.data.success) {
        toast({
          title: '성공',
          description: '계정 연결이 해제되었습니다.',
        });
        fetchLinkedAccounts();
        setUnlinkDialog({ open: false });
        setPassword('');
      }
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.response?.data?.message || '계정 연결 해제에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setUnlinking(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      const response = await apiClient.post('/auth/accounts/set-primary', { accountId });
      if (response.data.success) {
        toast({
          title: '성공',
          description: '주 계정이 설정되었습니다.',
        });
        fetchLinkedAccounts();
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '주 계정 설정에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            연결된 계정 관리
          </CardTitle>
          <CardDescription>
            다양한 로그인 방법을 연결하여 편리하게 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {linkedAccounts.map((account) => {
              const Icon = providerIcons[account.provider];
              const colorClass = providerColors[account.provider];

              return (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {account.profileImage ? (
                        <AvatarImage src={account.profileImage} alt={account.displayName} />
                      ) : (
                        <AvatarFallback>
                          <Icon className="h-6 w-6" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{account.displayName || account.email}</h4>
                        {account.isPrimary && (
                          <Badge variant="secondary" className="text-xs">주 계정</Badge>
                        )}
                        <Badge className={`text-xs ${colorClass}`}>
                          {account.provider === 'email' ? '이메일' : account.provider.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{account.email}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-400">
                          연결일: {new Date(account.linkedAt).toLocaleDateString()}
                        </span>
                        {account.lastUsedAt && (
                          <span className="text-xs text-gray-400">
                            마지막 사용: {new Date(account.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.isVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    {!account.isPrimary && linkedAccounts.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(account.id)}
                        >
                          주 계정으로 설정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnlinkDialog({ open: true, account })}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {linkedAccounts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>연결된 계정이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={unlinkDialog.open} onOpenChange={(open: boolean) => setUnlinkDialog({ open })}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlink();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>계정 연결 해제</AlertDialogTitle>
              <AlertDialogDescription>
                {unlinkDialog.account && (
                  <>
                    <span className="font-medium">{unlinkDialog.account.email}</span> 계정의 연결을 해제하시겠습니까?
                    <br />
                    보안을 위해 비밀번호를 입력해주세요.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={() => setPassword('')}>취소</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={!password || unlinking}
                className="bg-red-600 hover:bg-red-700"
              >
                {unlinking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    연결 해제 중...
                  </>
                ) : (
                  '연결 해제'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};