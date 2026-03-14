import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CopilotEntry } from './copilot';

interface LayoutProps {
  serviceName: string;
  children: ReactNode;
  // AI 컨텍스트 정보
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
}: LayoutProps) {
  return (
    <div style={styles.container}>
      <Header serviceName={serviceName} />
      <main style={styles.main}>{children}</main>
      <Footer />
      <CopilotEntry
        serviceId="neture"
        storeId={storeId}
        productId={productId}
        categoryId={categoryId}
        pageType={pageType}
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
