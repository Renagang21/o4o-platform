import React from 'react';
import { VideoCopyButtonShortcode } from '@/components/apps/VideoCopyButton';

/**
 * Digital Signage 비디오 관련 shortcode 컴포넌트들
 */

// [video_copy_button] shortcode 구현
export const VideoCopyButtonShortcodeWrapper: React.FC<{
  attributes: {
    post_id?: string;
    size?: string;
  };
}> = ({ attributes }) => {
  const { post_id, size = 'default' } = attributes;

  if (!post_id) {
    return (
      <div className="text-sm text-modern-text-tertiary">
        [video_copy_button: post_id 속성이 필요합니다]
      </div>
    );
  }

  return <VideoCopyButtonShortcode postId={post_id} size={size} />;
};

// shortcode 등록 헬퍼
export const registerVideoShortcodes = () => {
  // WordPress 스타일 shortcode 시스템이 있다면 여기서 등록
  // 현재는 React 컴포넌트로만 구현

  return {
    video_copy_button: VideoCopyButtonShortcodeWrapper,
  };
};