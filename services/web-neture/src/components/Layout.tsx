import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { FloatingAiButton } from './ai/FloatingAiButton';

interface LayoutProps {
  serviceName: string;
  children: ReactNode;
  // Phase 2: AI 컨텍스트 정보
  storeId?: string;
  productId?: string;
  categoryId?: string;
  pageType?: 'home' | 'store' | 'product' | 'category' | 'content';
  contextData?: Record<string, any>;
}

export function Layout({
  serviceName,
  children,
  storeId,
  productId,
  categoryId,
  pageType,
  contextData
}: LayoutProps) {
  return (
    <div style={styles.container}>
      <Header serviceName={serviceName} />
      <main style={styles.main}>{children}</main>
      <Footer />
      {/* Phase 2: Floating AI Button */}
      <FloatingAiButton
        serviceId="neture"
        storeId={storeId}
        productId={productId}
        categoryId={categoryId}
        pageType={pageType}
        contextData={contextData}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
  },
};
