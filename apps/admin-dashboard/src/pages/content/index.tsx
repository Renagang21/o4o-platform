import { Link } from 'react-router-dom';

const TASKS = [
  { path: '/content-resource/media-assets', label: '미디어 라이브러리', description: '공용 이미지·영상 등 자료를 찾고 정보를 관리합니다.' },
  { path: '/admin/cms/contents', label: '콘텐츠 관리', description: '플랫폼 콘텐츠의 내용과 공개·게시 상태를 관리합니다.' },
  { path: '/admin/cms/slots', label: '게시 위치', description: '화면에 보여줄 콘텐츠와 게시 위치를 설정합니다.' },
];

export default function ContentOverviewPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900">콘텐츠·자료</h1>
      <p className="mt-2 mb-6 text-sm text-gray-600">자료 관리와 콘텐츠 게시 작업을 선택하세요. 각 작업 화면에서 관리 도움말을 확인할 수 있습니다.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TASKS.map(({ path, label, description }) => <Link key={path} to={path} className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-400">
          <h2 className="font-semibold text-gray-900">{label}</h2>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </Link>)}
      </div>
    </div>
  );
}
