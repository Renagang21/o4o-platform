/**
 * Forum Icon Samples
 * 카테고리별 이모지 아이콘 샘플
 *
 * WO-O4O-FORUM-HUB-PINNED-FORUM-V1
 */

export interface IconSampleGroup {
  categoryKey: string;
  label: string;
  emojis: string[];
}

export const FORUM_ICON_SAMPLES: IconSampleGroup[] = [
  { categoryKey: 'life', label: '생활', emojis: ['🏠', '💬', '✅', '📋', '🏡', '🛒', '🚗', '📷'] },
  { categoryKey: 'health', label: '건강', emojis: ['❤️', '💊', '🏥', '🩺', '🧬', '🏃', '🧘', '🥗'] },
  { categoryKey: 'gaming', label: '게임', emojis: ['🎮', '👾', '🕹️', '🎯', '🏆', '⚔️', '🎲', '🃏'] },
  { categoryKey: 'beauty', label: '뷰티', emojis: ['💄', '🪞', '✨', '💅', '🌸', '🧴', '💎', '🎀'] },
  { categoryKey: 'education', label: '학문', emojis: ['📚', '✏️', '🎓', '🔬', '📐', '💡', '🧪', '📝'] },
  { categoryKey: 'location', label: '지역', emojis: ['📍', '🗺️', '🏙️', '🌏', '🚶', '🏔️', '🌊', '🏖️'] },
  { categoryKey: 'business', label: '비즈니스', emojis: ['💼', '📊', '📈', '🏢', '🤝', '💰', '📱', '🖥️'] },
  { categoryKey: 'tech', label: '기술', emojis: ['💻', '🔧', '⚙️', '🖥️', '📱', '🤖', '🔌', '🛠️'] },
  { categoryKey: 'food', label: '음식', emojis: ['🍽️', '🍳', '☕', '🧁', '🥗', '🍕', '🍜', '🍰'] },
  { categoryKey: 'community', label: '커뮤니티', emojis: ['👥', '🗣️', '📢', '🎉', '🤗', '💬', '❓', '⭐'] },
];
