/**
 * Cosmetics Partner AI Tools Page
 *
 * Phase 6-F: Influencer Tools Expansion
 * - AI Routine Generator
 * - AI Product Description Generator
 */

import React, { useState } from 'react';

// Types
interface RoutineStep {
  order: number;
  category: string;
  productName: string;
  description: string;
  duration?: string;
  tips?: string;
}

interface GeneratedRoutine {
  title: string;
  description: string;
  routineType: string;
  skinTypes: string[];
  concerns: string[];
  steps: RoutineStep[];
  reasoning: string;
  estimatedTime: string;
  difficulty: string;
}

interface GeneratedDescription {
  title: string;
  mainDescription: string;
  shortDescription: string;
  callToAction: string;
  hashtags: string[];
  platform: string;
  tone: string;
  characterCount: number;
}

// Skin Types and Concerns
const SKIN_TYPES = ['건성', '지성', '복합성', '민감성', '중성'];
const SKIN_CONCERNS = ['주름', '색소침착', '모공', '여드름', '건조', '유수분불균형'];
const ROUTINE_TYPES = [
  { id: 'morning', name: '모닝 루틴' },
  { id: 'evening', name: '이브닝 루틴' },
  { id: 'weekly', name: '주간 스페셜' },
  { id: 'special', name: '집중 케어' },
];

const TONES = [
  { id: 'casual', name: '캐주얼', desc: '친근하고 일상적인' },
  { id: 'professional', name: '프로페셔널', desc: '전문적이고 신뢰감' },
  { id: 'friendly', name: '프렌들리', desc: '따뜻하고 공감하는' },
  { id: 'trendy', name: '트렌디', desc: '신선하고 힙한' },
];

const PLATFORMS = [
  { id: 'instagram', name: '인스타그램', max: 2200 },
  { id: 'facebook', name: '페이스북', max: 63206 },
  { id: 'twitter', name: '트위터(X)', max: 280 },
  { id: 'blog', name: '블로그', max: 10000 },
];

const CosmeticsPartnerAITools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'routine' | 'description'>('routine');

  // Routine Generator State
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([]);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [routineType, setRoutineType] = useState('morning');
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(null);
  const [routineLoading, setRoutineLoading] = useState(false);

  // Description Generator State
  const [productName, setProductName] = useState('');
  const [selectedTone, setSelectedTone] = useState('casual');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [generatedDescription, setGeneratedDescription] = useState<GeneratedDescription | null>(null);
  const [descLoading, setDescLoading] = useState(false);

  // Toggle skin type
  const toggleSkinType = (type: string) => {
    setSelectedSkinTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Toggle concern
  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  // Generate Routine (Mock)
  const generateRoutine = async () => {
    if (selectedSkinTypes.length === 0 || selectedConcerns.length === 0) {
      alert('피부 타입과 피부 고민을 선택해주세요.');
      return;
    }

    setRoutineLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockRoutine: GeneratedRoutine = {
      title: `${selectedSkinTypes[0]} 피부를 위한 ${selectedConcerns[0]} 개선 ${routineType === 'morning' ? '모닝' : '이브닝'} 루틴`,
      description: `${selectedSkinTypes.join(', ')} 피부 타입에 최적화된 ${selectedConcerns.join(', ')} 케어 루틴입니다.`,
      routineType,
      skinTypes: selectedSkinTypes,
      concerns: selectedConcerns,
      steps: [
        { order: 1, category: 'cleanser', productName: '저자극 클렌저', description: '피부 노폐물을 깨끗이 제거합니다.', duration: '1-2분' },
        { order: 2, category: 'toner', productName: '히알루론산 토너', description: 'pH 밸런스를 맞추고 수분을 공급합니다.', duration: '30초' },
        { order: 3, category: 'serum', productName: `${selectedConcerns[0]} 케어 세럼`, description: '집중 케어 성분을 전달합니다.', duration: '1분', tips: '★ 핵심 단계' },
        { order: 4, category: 'moisturizer', productName: '수분 보습제', description: '수분을 가두고 피부 장벽을 강화합니다.', duration: '1분' },
      ],
      reasoning: `피부 타입(${selectedSkinTypes.join(', ')})과 고민(${selectedConcerns.join(', ')})을 분석했습니다. 총 4단계의 루틴으로 효과적인 케어가 가능합니다.`,
      estimatedTime: '약 5분',
      difficulty: 'beginner',
    };

    setGeneratedRoutine(mockRoutine);
    setRoutineLoading(false);
  };

  // Generate Description (Mock)
  const generateDescription = async () => {
    if (!productName.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    setDescLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const emoji = includeEmoji ? '✨' : '';
    const mockDescription: GeneratedDescription = {
      title: `${emoji} 요즘 빠져있는 ${productName}`,
      mainDescription: `요즘 빠져있는 ${productName} ${emoji}\n\n정말 좋아서 공유해요!\n\n${selectedTone === 'professional' ? '임상 테스트를 통해 검증된' : '매일 쓰고 있는'} 제품이에요.\n\n${selectedTone === 'trendy' ? '이게 바로 트렌드!' : '강추!'}`,
      shortDescription: `${emoji} 요즘 빠져있는 ${productName} - 스킨케어 필수템 💫`,
      callToAction: selectedPlatform === 'instagram' ? '👉 프로필 링크에서 만나보세요!' : '지금 바로 확인하세요!',
      hashtags: includeHashtags ? ['스킨케어', '피부관리', '뷰티', '화장품추천', productName.replace(/\s+/g, '')] : [],
      platform: selectedPlatform,
      tone: selectedTone,
      characterCount: 150,
    };

    setGeneratedDescription(mockDescription);
    setDescLoading(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">AI 도구</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('routine')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'routine'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          AI 루틴 생성기
        </button>
        <button
          onClick={() => setActiveTab('description')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'description'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          AI 설명 생성기
        </button>
      </div>

      {/* Routine Generator Tab */}
      {activeTab === 'routine' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">루틴 생성 조건</h2>

            {/* Skin Types */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">피부 타입</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleSkinType(type)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedSkinTypes.includes(type)
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Concerns */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">피부 고민</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_CONCERNS.map((concern) => (
                  <button
                    key={concern}
                    onClick={() => toggleConcern(concern)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedConcerns.includes(concern)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {concern}
                  </button>
                ))}
              </div>
            </div>

            {/* Routine Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">루틴 타입</label>
              <select
                value={routineType}
                onChange={(e) => setRoutineType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {ROUTINE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generateRoutine}
              disabled={routineLoading}
              className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 disabled:bg-pink-300"
            >
              {routineLoading ? '생성 중...' : 'AI 루틴 생성하기'}
            </button>
          </div>

          {/* Result Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">생성된 루틴</h2>

            {generatedRoutine ? (
              <div>
                <h3 className="text-xl font-bold text-pink-600 mb-2">{generatedRoutine.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{generatedRoutine.description}</p>

                <div className="flex gap-2 mb-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {generatedRoutine.estimatedTime}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    {generatedRoutine.difficulty === 'beginner' ? '초급' : '중급'}
                  </span>
                </div>

                <div className="space-y-3">
                  {generatedRoutine.steps.map((step) => (
                    <div key={step.order} className="border-l-4 border-pink-400 pl-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-pink-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                          {step.order}
                        </span>
                        <span className="font-medium">{step.productName}</span>
                        {step.tips && <span className="text-yellow-500 text-sm">{step.tips}</span>}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                      {step.duration && (
                        <span className="text-gray-400 text-xs">{step.duration}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{generatedRoutine.reasoning}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>피부 타입과 고민을 선택하고</p>
                <p>AI 루틴을 생성해보세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description Generator Tab */}
      {activeTab === 'description' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">설명 생성 조건</h2>

            {/* Product Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">제품명</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 히알루론산 수분 세럼"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            {/* Tone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">톤</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`p-2 rounded-lg text-left ${
                      selectedTone === tone.id
                        ? 'bg-pink-100 border-2 border-pink-600'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-sm">{tone.name}</div>
                    <div className="text-xs text-gray-500">{tone.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">플랫폼</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name} (최대 {platform.max}자)
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div className="mb-6 flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeEmoji}
                  onChange={(e) => setIncludeEmoji(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">이모지 포함</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">해시태그 포함</span>
              </label>
            </div>

            <button
              onClick={generateDescription}
              disabled={descLoading}
              className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 disabled:bg-pink-300"
            >
              {descLoading ? '생성 중...' : 'AI 설명 생성하기'}
            </button>
          </div>

          {/* Result Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">생성된 설명</h2>

            {generatedDescription ? (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">메인 설명</span>
                    <button
                      onClick={() => copyToClipboard(generatedDescription.mainDescription)}
                      className="text-pink-600 text-sm hover:underline"
                    >
                      복사
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {generatedDescription.mainDescription}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">짧은 설명</span>
                    <button
                      onClick={() => copyToClipboard(generatedDescription.shortDescription)}
                      className="text-pink-600 text-sm hover:underline"
                    >
                      복사
                    </button>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {generatedDescription.shortDescription}
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700 block mb-2">CTA</span>
                  <div className="bg-pink-50 p-3 rounded-lg text-sm text-pink-700">
                    {generatedDescription.callToAction}
                  </div>
                </div>

                {generatedDescription.hashtags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">해시태그</span>
                      <button
                        onClick={() =>
                          copyToClipboard(generatedDescription.hashtags.map((h) => `#${h}`).join(' '))
                        }
                        className="text-pink-600 text-sm hover:underline"
                      >
                        복사
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {generatedDescription.hashtags.map((tag) => (
                        <span key={tag} className="text-blue-600 text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  글자 수: {generatedDescription.characterCount}자
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>제품명과 옵션을 설정하고</p>
                <p>AI 설명을 생성해보세요</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerAITools;
