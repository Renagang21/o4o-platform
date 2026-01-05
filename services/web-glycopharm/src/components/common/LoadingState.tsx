/**
 * LoadingState - 데이터 로딩 중 표시하는 공통 컴포넌트
 */

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = '데이터를 불러오는 중...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
