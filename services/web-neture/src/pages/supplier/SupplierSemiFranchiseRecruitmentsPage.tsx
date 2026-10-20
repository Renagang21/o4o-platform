import { Link } from 'react-router-dom';

/** 과거 북마크의 안내 화면. 신규 협업체 취급매장 모집은 종료했다. */
export default function SupplierSemiFranchiseRecruitmentsPage() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">세미프랜차이즈 모집 종료</h1>
      <p>별도 협업체 취급매장 모집 기능은 더 이상 제공하지 않습니다.</p>
      <p>협업체별 거래 조건은 공급 제안에서 관리할 수 있습니다. 기존 모집 내역은 판매자 모집에서 확인할 수 있습니다.</p>
      <div className="flex flex-wrap gap-4">
        <Link to="/supplier/supply-proposals" className="text-blue-700 underline">공급 제안으로 이동</Link>
        <Link to="/supplier/recruitments" className="text-blue-700 underline">기존 모집 내역 확인</Link>
      </div>
    </div>
  );
}
