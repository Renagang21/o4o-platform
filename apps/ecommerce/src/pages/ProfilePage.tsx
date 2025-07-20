import { useAuth } from '@o4o/auth-context';
import { Card, CardHeader, CardContent } from '@o4o/ui';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">내 프로필</h1>
      
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">회원 정보</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">이름</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">이메일</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">회원 등급</p>
            <p className="font-medium capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">가입일</p>
            <p className="font-medium">
              {new Date(user.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}