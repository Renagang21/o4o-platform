/**
 * 환경 표시 배지 컴포넌트
 * develop 브랜치에서 배포 시 화면 상단에 경고 표시
 */

export const EnvBadge = () => {
  // GitHub Actions에서 주입되는 환경 변수 확인
  // vite.config.ts에서 define으로 설정 필요
  const isDevelopment = import.meta.env.MODE === 'development';
  const isDevBranch = import.meta.env.VITE_GIT_BRANCH === 'develop';

  // develop 브랜치에서 배포된 경우에만 표시
  if (!isDevBranch && !isDevelopment) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 text-sm font-bold z-[9999] shadow-lg rounded-b-md flex items-center gap-2"
      role="alert"
    >
      <span>⚠️</span>
      <span>테스트 버전 (develop) - 프로덕션 아님</span>
    </div>
  );
};
