interface SecuritySectionProps {
  onPasswordChange: () => void;
  description?: string;
}

export function SecuritySection({ onPasswordChange, description }: SecuritySectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">보안 설정</h3>
      <button
        onClick={onPasswordChange}
        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm text-gray-700">비밀번호 변경</span>
        <span className="text-xs text-gray-400">{description || ''}</span>
      </button>
    </div>
  );
}
