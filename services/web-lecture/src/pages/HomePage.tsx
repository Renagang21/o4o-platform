import { Link } from 'react-router-dom';
import { BRAND } from '../config/service';
export default function HomePage() {
  return <main className="page"><section className="hero">
    <span className="eyebrow">Neture Study</span><h1>{BRAND.name}</h1><p>{BRAND.tagline}</p>
    <p className="muted">O4O의 독립 강의 서비스 기반을 준비했습니다. 강의 탐색·수강 기능은 다음 단계에서 연결됩니다.</p>
    <div className="actions"><Link className="button-link" to="/login">서비스 로그인</Link><a className="secondary-link" href="https://neture.co.kr">Neture 홈</a></div>
  </section></main>;
}
