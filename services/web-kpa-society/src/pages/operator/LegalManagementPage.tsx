/**
 * LegalManagementPage - 약관 관리 페이지
 *
 * 운영자가 이용약관과 개인정보처리방침을 편집할 수 있는 페이지
 * WO-KPA-LEGAL-PAGES-V1
 *
 * TODO: API 연동하여 DB에서 콘텐츠 관리
 * 현재는 로컬 스토리지에 임시 저장
 */

import { useState, useEffect } from 'react';
import { Save, FileText, Shield, Eye, AlertCircle, CheckCircle } from 'lucide-react';

type TabType = 'policy' | 'privacy';

const STORAGE_KEY_POLICY = 'kpa_legal_policy';
const STORAGE_KEY_PRIVACY = 'kpa_legal_privacy';

// 기본 템플릿 내용
const DEFAULT_POLICY = `# 이용약관

## 제1조 (목적)
이 약관은 KPA Society(이하 "서비스")의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

## 제2조 (용어의 정의)
1. "서비스"란 회사가 제공하는 KPA Society 온라인 서비스를 말합니다.
2. "회원"이란 서비스에 접속하여 이 약관에 동의하고 회원가입을 완료한 자를 말합니다.

## 제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스 화면에 게시함으로써 효력을 발생합니다.
2. 회사는 필요시 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다.

(이하 내용을 작성해 주세요)
`;

const DEFAULT_PRIVACY = `# 개인정보처리방침

## 제1조 (수집하는 개인정보 항목)
회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.

### 필수 항목
- 이메일 주소
- 비밀번호
- 성명
- 연락처 (휴대폰 번호)
- 약사면허번호

### 선택 항목
- 소속 분회
- 약국명

## 제2조 (개인정보의 수집 및 이용 목적)
1. 회원 관리: 본인확인, 개인식별, 가입의사 확인
2. 서비스 제공: 교육 콘텐츠 제공, 커뮤니티 서비스 제공

(이하 내용을 작성해 주세요)
`;

export function LegalManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('policy');
  const [policyContent, setPolicyContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    const savedPolicy = localStorage.getItem(STORAGE_KEY_POLICY);
    const savedPrivacy = localStorage.getItem(STORAGE_KEY_PRIVACY);
    setPolicyContent(savedPolicy || DEFAULT_POLICY);
    setPrivacyContent(savedPrivacy || DEFAULT_PRIVACY);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // TODO: API 호출로 DB에 저장
      // const response = await fetch('/api/v1/operator/legal', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     type: activeTab,
      //     content: activeTab === 'policy' ? policyContent : privacyContent,
      //   }),
      // });

      // 현재는 로컬 스토리지에 저장
      if (activeTab === 'policy') {
        localStorage.setItem(STORAGE_KEY_POLICY, policyContent);
      } else {
        localStorage.setItem(STORAGE_KEY_PRIVACY, privacyContent);
      }

      // 저장 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 500));

      setSaveMessage({
        type: 'success',
        text: `${activeTab === 'policy' ? '이용약관' : '개인정보처리방침'}이 저장되었습니다.`,
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: '저장에 실패했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const path = activeTab === 'policy' ? '/policy' : '/privacy';
    window.open(path, '_blank');
  };

  const currentContent = activeTab === 'policy' ? policyContent : privacyContent;
  const setCurrentContent = activeTab === 'policy' ? setPolicyContent : setPrivacyContent;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">약관 관리</h1>
        <p className="text-slate-600 mt-1">
          서비스 이용약관과 개인정보처리방침을 편집합니다.
          회원가입 시 사용자가 동의해야 하는 내용입니다.
        </p>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">약관 작성 안내</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Markdown 형식으로 작성할 수 있습니다. (# 제목, ## 소제목, - 목록 등)</li>
              <li>변경된 약관은 저장 후 즉시 반영됩니다.</li>
              <li>중요한 변경사항은 회원에게 별도로 안내해 주세요.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'policy'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          이용약관
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'privacy'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          개인정보처리방침
        </button>
      </div>

      {/* 저장 메시지 */}
      {saveMessage && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{saveMessage.text}</span>
        </div>
      )}

      {/* 에디터 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-sm font-medium text-slate-700">
            {activeTab === 'policy' ? '이용약관' : '개인정보처리방침'} 편집
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Eye className="w-4 h-4" />
              미리보기
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <textarea
          value={currentContent}
          onChange={(e) => setCurrentContent(e.target.value)}
          className="w-full h-[500px] p-4 font-mono text-sm text-slate-800 resize-none focus:outline-none"
          placeholder={`${activeTab === 'policy' ? '이용약관' : '개인정보처리방침'} 내용을 입력하세요...`}
        />
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 text-sm text-slate-500">
        <p>
          * 현재 버전에서는 임시로 브라우저에 저장됩니다.
          서버 연동 후에는 모든 사용자에게 동일한 내용이 표시됩니다.
        </p>
      </div>
    </div>
  );
}
