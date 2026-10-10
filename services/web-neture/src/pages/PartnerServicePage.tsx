import { Link } from 'react-router-dom';

export default function PartnerServicePage() {
  return <main className="mx-auto min-h-screen max-w-2xl px-4 py-12">
    <p className="text-sm font-medium text-slate-500">준비 중</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-900">O4O Partner</h1>
    <p className="mt-6 leading-relaxed text-slate-700">O4O Partner는 O4O의 새로운 서비스로 준비하고 있습니다. 구체적인 제공 기능과 이용 방법은 확정 후 이 페이지에서 안내하겠습니다.</p>
    <p className="mt-3 text-sm text-slate-500">현재 가입이나 업무 기능은 제공하지 않습니다.</p>
    <nav aria-label="Partner 안내" className="mt-8 flex flex-wrap gap-4">
      <Link to="/" className="rounded-lg bg-slate-900 px-4 py-2 text-white">O4O 메인으로</Link>
      <Link to="/contact" className="rounded-lg border border-slate-300 px-4 py-2 text-slate-800">Contact Us</Link>
    </nav>
  </main>;
}
