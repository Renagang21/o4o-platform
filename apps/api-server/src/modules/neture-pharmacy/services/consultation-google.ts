import type { DataSource } from 'typeorm';
import { GoogleAuth } from 'google-auth-library';
import { AiAccountedExecution } from '../../ai-policy/ai-accounted-execution.js';
import { NeturePharmacyError } from '../constants.js';
import type { ConsultationTranslationInput, ConsultationTranslationOutput } from './consultation-translation.extension.js';

export const speechLocales: Record<string, string> = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', vi: 'vi-VN', th: 'th-TH', id: 'id-ID' };
export function normalizedConsultationLanguage(language: string): string | null {
  const code = language.toLowerCase().split(/[-_]/)[0];
  return code === 'cmn' ? 'zh' : Object.hasOwn(speechLocales, code) ? code : null;
}
export type ConsultationCloudAccess = { actorId: string; authorize: () => Promise<boolean> };
async function authorize(access: ConsultationCloudAccess) {
  if (!await access.authorize()) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '현재 상담 권한을 확인해 주세요.');
}
export type GoogleConsultationRequest = <T>(host: 'translate' | 'speech' | 'tts', path: string, data: unknown) => Promise<T>;
function googleRequest(): GoogleConsultationRequest {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return async <T>(host: 'translate' | 'speech' | 'tts', path: string, data: unknown): Promise<T> => {
    const project = await auth.getProjectId();
    if (!project || !/^[a-z0-9:.-]+$/i.test(project)) throw new Error('GOOGLE_PROJECT_REQUIRED');
    const origins = { translate: 'translation.googleapis.com', speech: 'speech.googleapis.com', tts: 'texttospeech.googleapis.com' };
    const client = await auth.getClient();
    const response = await client.request<T>({ url: `https://${origins[host]}/${path.replace('{project}', encodeURIComponent(project))}`,
      method: 'POST', data, timeout: 15000, retry: false });
    return response.data;
  };
}

/** Validate the audio itself, never trust a browser supplied billable duration. */
export function readConsultationWav(base64: unknown) {
  if (typeof base64 !== 'string' || base64.length > 2_600_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
    throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_AUDIO', '최대 60초의 16kHz 단일 채널 WAV 음성만 사용할 수 있습니다.');
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE' || buffer.readUInt32LE(4) + 8 !== buffer.length)
    throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_AUDIO', '음성 형식을 확인해 주세요.');
  let format = false, bytes = 0;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const size = buffer.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > buffer.length) throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_AUDIO', '음성 파일이 완전하지 않습니다.');
    const id = buffer.toString('ascii', offset, offset + 4);
    if (id === 'fmt ' && size >= 16) format = buffer.readUInt16LE(start) === 1 && buffer.readUInt16LE(start + 2) === 1 && buffer.readUInt32LE(start + 4) === 16000 && buffer.readUInt16LE(start + 14) === 16 && buffer.readUInt16LE(start + 12) === 2 && buffer.readUInt32LE(start + 8) === 32000;
    if (id === 'data') bytes += size;
    offset = start + size + (size % 2);
  }
  const seconds = bytes / 32000;
  if (!format || seconds < 0.2 || seconds > 60 || bytes % 2) throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_AUDIO', '음성 길이와 형식을 확인해 주세요.');
  return { content: base64, seconds, units: Math.ceil(seconds) };
}

/** Google native adapters share the existing price/quota ledger; no fallback to another provider. */
export class ConsultationGoogleService {
  constructor(private db: DataSource, private request: GoogleConsultationRequest = googleRequest(), private account = new AiAccountedExecution(db)) {}
  async translate(input: ConsultationTranslationInput, access: ConsultationCloudAccess): Promise<ConsultationTranslationOutput> {
    await authorize(access);
    return this.account.invokeNative({ kind: 'translation', provider: 'google-cloud', model: 'general-nmt',
      units: [...input.text].length, unit: 'character', maxOutputTokens: 0 }, { scope: 'CONTENT_TRANSLATION', userId: access.actorId }, async () => {
      await authorize(access);
      const response = await this.request<{ translations?: Array<{ translatedText?: string; detectedLanguageCode?: string }> }>('translate', 'v3/projects/{project}/locations/global:translateText', {
        contents: [input.text], mimeType: 'text/plain', targetLanguageCode: input.target,
        ...(input.source === 'auto' ? {} : { sourceLanguageCode: input.source }),
      });
      const item = response.translations?.[0];
      const detected = input.source === 'auto' ? normalizedConsultationLanguage(item?.detectedLanguageCode ?? '') : null;
      if (!item?.translatedText || (input.source === 'auto' && !detected)) throw new NeturePharmacyError(422, 'CONSULTATION_LANGUAGE_UNCERTAIN', '입력 언어를 확인하지 못했습니다. 언어를 직접 선택하고 다시 시도해 주세요.');
      await authorize(access);
      return { value: { translation: item.translatedText, ...(detected ? { detectedLanguage: detected } : {}) }, usage: { units: [...input.text].length } };
    });
  }
  async recognize(audio: unknown, languages: string[], access: ConsultationCloudAccess) {
    const wav = readConsultationWav(audio);
    if (!languages.length || languages.length > 3 || languages.some(language => !speechLocales[language])) throw new Error('INVALID_SPEECH_LANGUAGES');
    await authorize(access);
    return this.account.invokeNative({ kind: 'stt', provider: 'google-cloud', model: 'stt-short', units: wav.units, unit: 'second', maxOutputTokens: 0 },
      { scope: 'CONTENT_TRANSLATION', userId: access.actorId }, async () => {
        await authorize(access);
        const response = await this.request<{ results?: Array<{ languageCode?: string; alternatives?: Array<{ transcript?: string; confidence?: number }> }> }>('speech', 'v2/projects/{project}/locations/global/recognizers/_:recognize', {
          config: { autoDecodingConfig: {}, languageCodes: languages.map(language => speechLocales[language]), model: 'short' }, content: wav.content,
        });
        const text = (response.results ?? []).map(result => result.alternatives?.[0]?.transcript ?? '').join(' ').trim();
        const language = normalizedConsultationLanguage(response.results?.[0]?.languageCode ?? '');
        if (!text || text.length > 1000 || !language || !languages.includes(language)) throw new NeturePharmacyError(422, 'CONSULTATION_LANGUAGE_UNCERTAIN', '입력 언어를 확인하지 못했습니다. 언어를 직접 선택하고 다시 시도해 주세요.');
        await authorize(access);
        return { value: { text, language }, usage: { units: wav.units } };
      });
  }
  async synthesize(text: string, language: string, access: ConsultationCloudAccess) {
    if (!text.trim() || text.length > 4000 || !speechLocales[language]) throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_SPEECH', '읽을 문장과 언어를 확인해 주세요.');
    const locale = language === 'zh' ? 'cmn-CN' : speechLocales[language];
    await authorize(access);
    return this.account.invokeNative({ kind: 'tts', provider: 'google-cloud', model: 'tts-standard', units: [...text].length, unit: 'character', maxOutputTokens: 0 },
      { scope: 'CONTENT_TRANSLATION', userId: access.actorId }, async () => {
        await authorize(access);
        const response = await this.request<{ audioContent?: string }>('tts', 'v1/text:synthesize', {
          input: { text }, voice: { languageCode: locale, name: `${locale}-Standard-A` }, audioConfig: { audioEncoding: 'MP3' },
        });
        if (!response.audioContent || response.audioContent.length > 8_000_000) throw new Error('INVALID_SPEECH_RESPONSE');
        await authorize(access);
        return { value: { audioBase64: response.audioContent, mimeType: 'audio/mpeg' }, usage: { units: [...text].length } };
      });
  }
}
