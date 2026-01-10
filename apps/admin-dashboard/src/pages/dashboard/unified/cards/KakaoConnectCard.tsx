/**
 * KakaoTalk Connect Card
 * PoC: 카카오톡 연결 버튼 - 모든 사용자에게 항상 노출
 */

import React from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import type { UnifiedCardProps } from '../types';

// 카카오 채널 URL (고정값 - 실제 운영 시 환경변수로 관리)
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xnxnxn'; // 예시 URL

export const KakaoConnectCard: React.FC<UnifiedCardProps> = ({ config }) => {
  const handleConnect = () => {
    window.open(KAKAO_CHANNEL_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Kakao Icon */}
      <div className="w-14 h-14 rounded-full bg-[#FEE500] flex items-center justify-center mb-3">
        <MessageCircle className="w-7 h-7 text-[#3C1E1E]" />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center mb-4">
        카카오톡으로 빠르게 상담받으세요
      </p>

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-6 py-3 bg-[#FEE500] text-[#3C1E1E] font-medium rounded-lg hover:bg-[#FDD835] transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        카카오톡 연결하기
        <ExternalLink className="w-4 h-4" />
      </button>

      {/* Additional Info */}
      <p className="text-xs text-gray-400 mt-3">
        운영시간: 평일 09:00 - 18:00
      </p>
    </div>
  );
};

export default KakaoConnectCard;
