/**
 * SuppliersPage - 공급사 참여 안내
 * WO-KCOS-SUPPLIER-ENTRY-UI-V1
 *
 * 목적: 화장품 공급자가 플랫폼 구조를 이해하고 참여를 판단하도록 하는 Entry UI
 * 톤: 중립 / 신뢰 / 차분 (B2B, 제도적)
 *
 * 명시적 금지:
 * - 가격/마진/수수료
 * - 정산 시점
 * - 계약 조건
 * - 상품 업로드 UI
 * - 관리자/백오피스 암시
 */

import { Link } from 'react-router-dom';

export function SuppliersPage() {
  return (
    <div style={styles.page}>
      {/* Hero - Supplier Entry */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>공급사 참여 안내</h1>
          <p style={styles.heroSubtitle}>
            K-Cosmetics Distribution Network는 화장품 브랜드와
            검증된 유통 매장을 연결하는 플랫폼입니다.
          </p>
          <p style={styles.heroNote}>
            본 플랫폼은 직접 판매를 하지 않으며,
            공급사와 매장 간의 유통 구조를 지원합니다.
          </p>
        </div>
      </section>

      {/* How Participation Works */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>참여 구조</h2>
          <p style={styles.sectionDesc}>
            공급사는 다음 단계를 통해 플랫폼에 참여할 수 있습니다.
          </p>

          <div style={styles.stepsContainer}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>참여 문의</h3>
              <p style={styles.stepDesc}>
                플랫폼 운영팀에 참여 의사를 전달하고
                기본 정보를 공유합니다.
              </p>
            </div>

            <div style={styles.stepArrow}>→</div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>검토 및 협의</h3>
              <p style={styles.stepDesc}>
                운영팀이 브랜드 적합성을 검토하고
                참여 조건을 협의합니다.
              </p>
            </div>

            <div style={styles.stepArrow}>→</div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>네트워크 연결</h3>
              <p style={styles.stepDesc}>
                승인 후 파트너 매장 네트워크와
                연결되어 유통이 진행됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What the Platform Provides */}
      <section style={styles.sectionAlt}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>플랫폼이 제공하는 것</h2>

          <div style={styles.providesGrid}>
            <div style={styles.provideItem}>
              <div style={styles.provideIcon}>🏪</div>
              <h3 style={styles.provideTitle}>검증된 매장 네트워크</h3>
              <p style={styles.provideDesc}>
                플랫폼 기준을 충족한 파트너 매장을 통해
                제품이 소비자에게 도달합니다.
              </p>
            </div>

            <div style={styles.provideItem}>
              <div style={styles.provideIcon}>🌐</div>
              <h3 style={styles.provideTitle}>글로벌 노출 기회</h3>
              <p style={styles.provideDesc}>
                관광객 및 해외 바이어에게
                브랜드가 노출될 수 있는 채널을 제공합니다.
              </p>
            </div>

            <div style={styles.provideItem}>
              <div style={styles.provideIcon}>📊</div>
              <h3 style={styles.provideTitle}>시장 피드백</h3>
              <p style={styles.provideDesc}>
                매장 및 소비자 반응에 대한
                정보를 공유받을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What the Platform Does NOT Do */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>플랫폼이 하지 않는 것</h2>
          <p style={styles.sectionDesc}>
            명확한 역할 경계를 위해 다음 사항을 안내드립니다.
          </p>

          <div style={styles.notDoGrid}>
            <div style={styles.notDoItem}>
              <span style={styles.notDoIcon}>✕</span>
              <div>
                <h4 style={styles.notDoTitle}>직접 판매</h4>
                <p style={styles.notDoDesc}>
                  플랫폼은 소비자에게 직접 판매하지 않습니다.
                  모든 판매는 파트너 매장을 통해 이루어집니다.
                </p>
              </div>
            </div>

            <div style={styles.notDoItem}>
              <span style={styles.notDoIcon}>✕</span>
              <div>
                <h4 style={styles.notDoTitle}>재고 보관</h4>
                <p style={styles.notDoDesc}>
                  플랫폼은 제품 재고를 보관하거나
                  물류를 직접 운영하지 않습니다.
                </p>
              </div>
            </div>

            <div style={styles.notDoItem}>
              <span style={styles.notDoIcon}>✕</span>
              <div>
                <h4 style={styles.notDoTitle}>가격 결정</h4>
                <p style={styles.notDoDesc}>
                  소비자 판매가는 각 매장이 결정하며,
                  플랫폼이 가격을 통제하지 않습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 대상 공급사 */}
      <section style={styles.sectionAlt}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>참여 대상</h2>

          <div style={styles.targetGrid}>
            <div style={styles.targetInclude}>
              <h3 style={styles.targetTitle}>참여 가능</h3>
              <ul style={styles.targetList}>
                <li>화장품 제조사</li>
                <li>브랜드 오너</li>
                <li>공식 수입사 / 공급사</li>
              </ul>
            </div>

            <div style={styles.targetExclude}>
              <h3 style={styles.targetTitle}>참여 불가</h3>
              <ul style={styles.targetList}>
                <li>개인 셀러</li>
                <li>리셀러</li>
                <li>일반 소비자</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <h2 style={styles.ctaTitle}>공급사 참여 문의</h2>
          <p style={styles.ctaDesc}>
            참여를 검토 중이시라면 운영팀에 문의해 주세요.
            담당자가 상세 안내를 드립니다.
          </p>
          <Link to="/contact" style={styles.ctaButton}>
            문의하기
          </Link>
          <p style={styles.ctaNote}>
            이메일: supplier@k-cosmetics.site
          </p>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },

  // Hero
  hero: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: '80px 24px',
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: 700,
    margin: '0 0 20px 0',
    letterSpacing: '-0.5px',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#ccc',
    margin: '0 0 16px 0',
    lineHeight: 1.7,
  },
  heroNote: {
    fontSize: '14px',
    color: '#999',
    margin: 0,
    lineHeight: 1.6,
  },

  // Section
  section: {
    padding: '64px 24px',
    backgroundColor: '#fff',
  },
  sectionAlt: {
    padding: '64px 24px',
    backgroundColor: '#fafafa',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 12px 0',
    textAlign: 'center',
  },
  sectionDesc: {
    fontSize: '15px',
    color: '#666',
    margin: '0 0 40px 0',
    textAlign: 'center',
  },

  // Steps
  stepsContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  step: {
    flex: '1 1 200px',
    maxWidth: '240px',
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#2c2c2c',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  stepDesc: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.6,
  },
  stepArrow: {
    fontSize: '24px',
    color: '#ccc',
    alignSelf: 'center',
    padding: '0 8px',
  },

  // Provides
  providesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  provideItem: {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    textAlign: 'center',
  },
  provideIcon: {
    fontSize: '36px',
    marginBottom: '16px',
  },
  provideTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  provideDesc: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.6,
  },

  // Not Do
  notDoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  notDoItem: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  notDoIcon: {
    fontSize: '20px',
    color: '#999',
    fontWeight: 700,
    flexShrink: 0,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    borderRadius: '50%',
  },
  notDoTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 4px 0',
  },
  notDoDesc: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },

  // Target
  targetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  targetInclude: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #c8e6c9',
  },
  targetExclude: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #ffcdd2',
  },
  targetTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 12px 0',
  },
  targetList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.8,
  },

  // CTA
  ctaSection: {
    padding: '64px 24px',
    backgroundColor: '#2c2c2c',
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 12px 0',
  },
  ctaDesc: {
    fontSize: '15px',
    color: '#aaa',
    margin: '0 0 24px 0',
    lineHeight: 1.6,
  },
  ctaButton: {
    display: 'inline-block',
    padding: '14px 40px',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
  },
  ctaNote: {
    fontSize: '13px',
    color: '#888',
    marginTop: '16px',
  },
};
