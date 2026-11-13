/**
 * 소비자 태블릿(키오스크) 화면 문구. 상담 언어 목록(ko · en · zh · ja · vi · th · id)과 같다.
 * 언어별 문구는 kioskLocale.json 에 둔다(번역 사전은 코드가 아니라 데이터다).
 */
import copiesJson from './kioskLocale.json';

export interface KioskCopy {
  title: string; connectTitle: string; connectHelp: string; code: string; connect: string;
  language: string; auto: string; searchLabel: string; searchPlaceholder: string; speak: string; finish: string;
  find: string; results: string; noResults: string; location: string; details: string;
  questionLabel: string; questionPlaceholder: string; ask: string; pharmacist: string;
  listen: string; stop: string; fallback: string; back: string; privacy: string; failed: string; busy: string;
}

const copies: Record<string, KioskCopy> = copiesJson;

export function kioskUi(language: string): KioskCopy {
  return copies[language] ?? copies.ko;
}
