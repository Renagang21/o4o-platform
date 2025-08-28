import { FC, ReactNode } from 'react';

interface EditorLayoutProps {
  children: ReactNode;
}

/**
 * 독립형 편집기 레이아웃
 * 관리자 UI와 완전히 분리된 풀스크린 편집기 환경 제공
 */
const EditorLayout: FC<EditorLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full bg-white">
      {children}
    </div>
  );
};

export default EditorLayout;