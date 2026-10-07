import { Link } from 'react-router-dom';
import { O4OPublicHero } from '@o4o/auth-react';
import { BRAND, STUDY_HERO } from '../config/service';
import { useAuth } from '../contexts/AuthContext';
// WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1: 공통 O4OPublicHero · 확정 문구.
//   CTA 는 실제 경로만 — 강의 목록(/courses), 로그인 시 내 학습 · 아니면 서비스 로그인.
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return <main>
    <O4OPublicHero
      eyebrow={BRAND.name}
      title={STUDY_HERO.title}
      description={STUDY_HERO.description}
      accent={STUDY_HERO.accent}
      actions={<>
        <Link className="o4o-cta" to="/courses" data-testid="study-hero-primary">강의 둘러보기</Link>
        {isAuthenticated ? <Link className="o4o-cta-secondary" to="/my/enrollments">내 학습</Link> : <Link className="o4o-cta-secondary" to="/login">서비스 로그인</Link>}
      </>}
    >
      <p className="muted">공개 강의는 누구나 볼 수 있고, 수강·진행·수료증은 {BRAND.name} 회원에게 열립니다.</p>
    </O4OPublicHero>
  </main>;
}
