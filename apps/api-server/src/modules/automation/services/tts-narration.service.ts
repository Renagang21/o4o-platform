/**
 * TTS Narration — WO-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1
 *
 * 영상 제작(VIDEO Job)용 내레이션 음성 생성 narrow 서비스. "창작 AI" 가 아니라 표준 제작 실행 기능이다
 * (docs/baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md §2 O4O Assembly 축).
 *
 * 경계:
 *  - provider · model 은 서버 allowlist 고정. 클라이언트는 provider 키만 고를 수 있고 model/endpoint 를 넘길 수 없다.
 *  - API key 는 기존 resolveAiApiKey(ai_settings → env) 재사용. 응답·로그·오류 메시지에 key 를 싣지 않는다
 *    (Gemini 도 URL `?key=` 대신 헤더로 전달해 access log 노출을 막는다).
 *  - `@o4o/ai-core` text model registry · AIProxyService · ai-model-registry(-tts 제외 정책)는 건드리지 않는다.
 *  - 결과는 audio 바이너리만 반환. DB 저장 · Media Library 등록 · Job attachment 없음(최초 구현).
 */
import { MediaCatalogError } from '../../media/services/media-catalog.service.js';
import logger from '../../../utils/logger.js';

export type TtsProvider = 'openai' | 'gemini';
export type TtsFormat = 'mp3' | 'wav';

export interface TtsProviderSpec {
  model: string;
  defaultVoice: string;
  formats: readonly TtsFormat[];
}

/** provider → canonical 모델. 여기 없는 provider/model 은 호출 불가. */
export const TTS_PROVIDERS: Readonly<Record<TtsProvider, TtsProviderSpec>> = {
  openai: { model: 'gpt-4o-mini-tts', defaultVoice: 'nova', formats: ['mp3', 'wav'] },
  // Gemini TTS 는 raw PCM(L16, 24kHz mono) 을 돌려주므로 서버가 WAV 컨테이너로 감싼다. mp3 변환은 하지 않는다(클라이언트 ffmpeg).
  gemini: { model: 'gemini-3.1-flash-tts-preview', defaultVoice: 'Kore', formats: ['wav'] },
};

export const TTS_MAX_TEXT_LENGTH = 2000;
export const TTS_MAX_STYLE_LENGTH = 500;
const VOICE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export interface TtsRequest {
  provider: TtsProvider;
  text: string;
  voice: string;
  style: string | null;
  format: TtsFormat;
}

export interface TtsResult {
  audio: Buffer;
  mimeType: string;
  provider: TtsProvider;
  model: string;
  voice: string;
  format: TtsFormat;
}

export function validateTtsRequest(body: unknown): TtsRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  const provider = b.provider;
  if (typeof provider !== 'string' || !Object.prototype.hasOwnProperty.call(TTS_PROVIDERS, provider)) throw new MediaCatalogError('TTS_INVALID_PROVIDER');
  const spec = TTS_PROVIDERS[provider as TtsProvider];
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text) throw new MediaCatalogError('TTS_TEXT_REQUIRED');
  if (text.length > TTS_MAX_TEXT_LENGTH) throw new MediaCatalogError('TTS_TEXT_TOO_LONG');
  const format = b.format === undefined ? spec.formats[0] : b.format;
  if (typeof format !== 'string' || !spec.formats.includes(format as TtsFormat)) throw new MediaCatalogError('TTS_INVALID_FORMAT');
  const voice = b.voice === undefined || b.voice === null || b.voice === '' ? spec.defaultVoice : b.voice;
  if (typeof voice !== 'string' || !VOICE_PATTERN.test(voice)) throw new MediaCatalogError('TTS_INVALID_VOICE');
  let style: string | null = null;
  if (b.style !== undefined && b.style !== null && b.style !== '') {
    if (typeof b.style !== 'string') throw new MediaCatalogError('TTS_INVALID_STYLE');
    style = b.style.trim();
    if (style.length > TTS_MAX_STYLE_LENGTH) throw new MediaCatalogError('TTS_STYLE_TOO_LONG');
  }
  return { provider: provider as TtsProvider, text, voice, style, format: format as TtsFormat };
}

/** PCM(L16) → WAV 컨테이너. */
export function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class TtsNarrationService {
  constructor(
    private readonly resolveKey: (provider: TtsProvider) => Promise<string>,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const apiKey = await this.resolveKey(req.provider);
    if (!apiKey) throw new MediaCatalogError('TTS_PROVIDER_NOT_CONFIGURED', 503);
    const spec = TTS_PROVIDERS[req.provider];
    const audio = req.provider === 'openai' ? await this.openai(req, spec, apiKey) : await this.gemini(req, spec, apiKey);
    return {
      audio,
      mimeType: req.format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      provider: req.provider,
      model: spec.model,
      voice: req.voice,
      format: req.format,
    };
  }

  private async call(provider: TtsProvider, url: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (err) {
      logger.error('[TTS] provider request failed', { provider, error: (err as Error)?.message });
      throw new MediaCatalogError('TTS_PROVIDER_UNREACHABLE', 502);
    }
    if (!res.ok) {
      // 본문은 로그에만, 짧게. 응답에는 status 코드만 — provider 오류 본문에 요청 echo 가 있을 수 있다.
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      logger.warn('[TTS] provider returned error', { provider, status: res.status, detail });
      throw new MediaCatalogError(res.status === 429 ? 'TTS_PROVIDER_RATE_LIMITED' : 'TTS_PROVIDER_FAILED', 502);
    }
    return res;
  }

  private async openai(req: TtsRequest, spec: TtsProviderSpec, apiKey: string): Promise<Buffer> {
    const res = await this.call('openai', 'https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: spec.model,
        voice: req.voice,
        input: req.text,
        ...(req.style ? { instructions: req.style } : {}),
        response_format: req.format,
      }),
    });
    return Buffer.from(await res.arrayBuffer());
  }

  private async gemini(req: TtsRequest, spec: TtsProviderSpec, apiKey: string): Promise<Buffer> {
    // Gemini TTS 는 스타일을 자연어 지시로 텍스트 앞에 둔다.
    const text = req.style ? `${req.style}\n\n${req.text}` : req.text;
    const res = await this.call(
      'gemini',
      `https://generativelanguage.googleapis.com/v1beta/models/${spec.model}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: req.voice } } },
          },
        }),
      },
    );
    const json = (await res.json().catch(() => null)) as
      | { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] }
      | null;
    const inline = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!inline?.data) {
      logger.warn('[TTS] gemini response has no audio part');
      throw new MediaCatalogError('TTS_PROVIDER_NO_AUDIO', 502);
    }
    const pcm = Buffer.from(inline.data, 'base64');
    const mime = inline.mimeType ?? '';
    if (mime.startsWith('audio/wav')) return pcm;
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    return pcmToWav(pcm, rate);
  }
}
