import { registerShortcode } from '@o4o/shortcodes';
import { allShortcodes } from '@/components/shortcodes';

/**
 * 모든 숏코드를 등록하는 함수
 */
export function registerAllShortcodes() {
  allShortcodes.forEach(shortcodeDef => {
    registerShortcode(shortcodeDef);
  });
  
  console.log('✅ All shortcodes registered:', allShortcodes.map(s => s.name));
}

/**
 * 특정 숏코드만 등록하는 함수
 */
export function registerShortcodeByName(name: string) {
  const shortcode = allShortcodes.find(s => s.name === name);
  
  if (shortcode) {
    registerShortcode(shortcode);
    console.log(`✅ Shortcode "${name}" registered`);
  } else {
    console.warn(`⚠️ Shortcode "${name}" not found`);
  }
}