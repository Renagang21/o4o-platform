import { useState, FC } from 'react';

const HomeEditorPage: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [homeContent, setHomeContent] = useState({
    title: '매장 경쟁력 강화를 지원하는 플랫폼',
    subtitle: 'neture.co.kr에 오신 것을 환영합니다',
    description: '매장 운영에 필요한 다양한 서비스를 제공합니다.'
  });

  const handleSave = () => {
    // TODO: API call to save home content
    setIsEditing(false);
    // console.log('Saving home content:', homeContent);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">홈페이지 에디터</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditing ? '편집 취소' : '편집 모드'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">메인 타이틀</label>
              {isEditing ? (
                <input
                  type="text"
                  value={homeContent.title}
                  onChange={(e) => setHomeContent({...homeContent, title: e.target.value})}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              ) : (
                <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">{homeContent.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">서브 타이틀</label>
              {isEditing ? (
                <input
                  type="text"
                  value={homeContent.subtitle}
                  onChange={(e) => setHomeContent({...homeContent, subtitle: e.target.value})}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              ) : (
                <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">{homeContent.subtitle}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">설명</label>
              {isEditing ? (
                <textarea
                  value={homeContent.description}
                  onChange={(e) => setHomeContent({...homeContent, description: e.target.value})}
                  rows={4}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              ) : (
                <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">{homeContent.description}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex space-x-4">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  저장
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">미리보기</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            이 페이지는 관리자만 접근할 수 있습니다. 홈페이지 내용을 수정하고 저장할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeEditorPage;
