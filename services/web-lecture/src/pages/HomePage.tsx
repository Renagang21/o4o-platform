import { Link } from 'react-router-dom';
import { BRAND } from '../config/service';
import { useAuth } from '../contexts/AuthContext';
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return <main className="page"><section className="hero">
    <span className="eyebrow">Neture Study</span><h1>{BRAND.name}</h1><p>{BRAND.tagline}</p>
    <p className="muted">공개 강의는 누구나 볼 수 있고, 수강·진행·수료증은 {BRAND.name} 회원에게 열립니다.</p>
    <div className="actions">
      <Link className="button-link" to="/courses">강의 둘러보기</Link>
      {isAuthenticated ? <Link className="secondary-link" to="/my/enrollments">내 학습</Link> : <Link className="secondary-link" to="/login">서비스 로그인</Link>}
    </div>
  </section></main>;
}
