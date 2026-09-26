import { Link } from 'react-router-dom';
import { BRAND } from '../config/service';
import { HOSPITAL_DRUG_FILE_NAME } from '../lib/localDrugFile';

export default function HomePage() {
  return (
    <div className="page">
      <div className="hero">
        <span className="eyebrow">Neture · Hospital Pharmacy</span>
        <h1>{BRAND.name}</h1>
        <p className="muted">{BRAND.tagline}. 원내 보유 약품 확인, 동일성분·대체약 조사, 성분·주의사항 조사를 한 화면에서. 원내 목록은 이 PC 의 {HOSPITAL_DRUG_FILE_NAME} 에서 바로 읽고 환자 정보는 다루지 않습니다.</p>
      </div>
      <div className="cards">
        <Link to="/ward" className="tile">
          <h3>병동 — 약품 조사 · 원내 확인</h3>
          <p>"타이레놀정 효능 조사", "우리 원내에 아세트아미노펜 있어?", "아모디핀정과 같은 성분 원내약 있어?" 처럼 물으면 조사 결과와 원내 보유 현황을 함께 확인합니다.</p>
        </Link>
        <Link to="/pharmacy" className="tile">
          <h3>원내 약품 파일</h3>
          <p>연결된 {HOSPITAL_DRUG_FILE_NAME} 의 상태(최종 수정 · 품목 수)를 확인합니다. 새 목록은 같은 이름으로 덮어쓰면 자동으로 다시 읽습니다.</p>
        </Link>
      </div>
    </div>
  );
}
