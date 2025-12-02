import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RoutineStepEditor, { RoutineStep } from '../../components/partner/RoutineStepEditor';
import RoutinePreview from '../../components/partner/RoutinePreview';
import { fetchInfluencerRoutine, updateInfluencerRoutine, deleteInfluencerRoutine } from '../../services/api';

export default function PartnerRoutineEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skinType, setSkinType] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [timeOfUse, setTimeOfUse] = useState<'morning' | 'evening' | 'both'>('morning');
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoutine();
  }, [id]);

  const loadRoutine = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetchInfluencerRoutine(id);
      const routine = response.data;

      setTitle(routine.metadata?.title || '');
      setDescription(routine.metadata?.description || '');
      setSkinType(routine.metadata?.skinType || []);
      setConcerns(routine.metadata?.concerns || []);
      setTimeOfUse(routine.metadata?.timeOfUse || 'morning');
      setSteps(routine.metadata?.routine || []);
      setIsPublished(routine.metadata?.isPublished || false);
    } catch (err) {
      console.error('Failed to load routine:', err);
      setError('루틴을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkinTypeToggle = (type: string) => {
    if (skinType.includes(type)) {
      setSkinType(skinType.filter((t) => t !== type));
    } else {
      setSkinType([...skinType, type]);
    }
  };

  const handleConcernToggle = (concern: string) => {
    if (concerns.includes(concern)) {
      setConcerns(concerns.filter((c) => c !== concern));
    } else {
      setConcerns([...concerns, concern]);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError('루틴 제목을 입력해주세요');
      return false;
    }
    if (skinType.length === 0) {
      setError('피부타입을 최소 1개 이상 선택해주세요');
      return false;
    }
    if (concerns.length === 0) {
      setError('피부고민을 최소 1개 이상 선택해주세요');
      return false;
    }
    if (steps.length < 2) {
      setError('루틴은 최소 2단계 이상이어야 합니다');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !id) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await updateInfluencerRoutine(id, {
        title,
        description,
        skinType,
        concerns,
        timeOfUse,
        routine: steps,
        isPublished,
      });

      navigate('/partner/routines');
    } catch (err) {
      console.error('Failed to update routine:', err);
      setError('루틴 업데이트에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    if (!confirm('정말로 이 루틴을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setSaving(true);
      await deleteInfluencerRoutine(id);
      navigate('/partner/routines');
    } catch (err) {
      console.error('Failed to delete routine:', err);
      setError('루틴 삭제에 실패했습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">루틴 수정</h1>
        <p className="text-gray-600">루틴 정보를 수정하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  루틴 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 여드름 진정 루틴"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="루틴에 대한 설명을 입력하세요"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사용 시간대 <span className="text-red-500">*</span>
                </label>
                <select
                  value={timeOfUse}
                  onChange={(e) => setTimeOfUse(e.target.value as 'morning' | 'evening' | 'both')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="morning">아침</option>
                  <option value="evening">저녁</option>
                  <option value="both">아침/저녁 모두</option>
                </select>
              </div>
            </div>
          </div>

          {/* Skin Type */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              피부타입 <span className="text-red-500">*</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {['dry', 'oily', 'combination', 'sensitive', 'normal'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleSkinTypeToggle(type)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    skinType.includes(type)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {type === 'dry' ? '건성' : type === 'oily' ? '지성' : type === 'combination' ? '복합성' : type === 'sensitive' ? '민감성' : '중성'}
                </button>
              ))}
            </div>
          </div>

          {/* Concerns */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              피부고민 <span className="text-red-500">*</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {['acne', 'whitening', 'wrinkle', 'pore', 'soothing', 'moisturizing', 'elasticity', 'trouble'].map((concern) => (
                <button
                  key={concern}
                  onClick={() => handleConcernToggle(concern)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    concerns.includes(concern)
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                  }`}
                >
                  {concern === 'acne' ? '여드름' : concern === 'whitening' ? '미백' : concern === 'wrinkle' ? '주름' : concern === 'pore' ? '모공' : concern === 'soothing' ? '진정' : concern === 'moisturizing' ? '보습' : concern === 'elasticity' ? '탄력' : '트러블'}
                </button>
              ))}
            </div>
          </div>

          {/* Routine Steps */}
          <div className="bg-white p-6 rounded-lg shadow">
            <RoutineStepEditor steps={steps} onChange={setSteps} />
          </div>

          {/* Publish Option */}
          <div className="bg-white p-6 rounded-lg shadow">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">루틴 공개</div>
                <div className="text-sm text-gray-600">
                  체크하면 고객들이 이 루틴을 볼 수 있습니다
                </div>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/partner/routines')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              삭제
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-8 h-fit">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">미리보기</h2>
          <RoutinePreview
            title={title}
            description={description}
            timeOfUse={timeOfUse}
            steps={steps}
            skinType={skinType}
            concerns={concerns}
          />
        </div>
      </div>
    </div>
  );
}
