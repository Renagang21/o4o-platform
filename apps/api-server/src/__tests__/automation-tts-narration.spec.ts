/**
 * WO-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1 — TTS narrow 서비스 계약 테스트 (provider 는 fetch mock)
 *
 * provider/model allowlist · 입력 검증 · key 미설정 503 · provider 오류 502(본문 비노출) · Gemini PCM→WAV 래핑 ·
 * key 가 URL 에 실리지 않음(헤더 전달).
 */
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  TTS_MAX_TEXT_LENGTH,
  TTS_PROVIDERS,
  TtsNarrationService,
  pcmToWav,
  validateTtsRequest,
} from '../modules/automation/services/tts-narration.service.js';
import { MediaCatalogError } from '../modules/media/services/media-catalog.service.js';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof MediaCatalogError ? e.code : 'NOT_MEDIA_CATALOG_ERROR';
  }
  return 'NO_ERROR';
};
const asyncCode = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e instanceof MediaCatalogError ? `${e.code}:${e.status}` : 'NOT_MEDIA_CATALOG_ERROR';
  }
  return 'NO_ERROR';
};
const okResponse = (body: BodyInit, init: ResponseInit = {}) => new Response(body, { status: 200, ...init });

describe('TTS narrow endpoint — validateTtsRequest', () => {
  it('provider allowlist: openai/gemini 만 허용, model 은 서버 고정', () => {
    expect(code(() => validateTtsRequest({ provider: 'elevenlabs', text: 'a' }))).toBe('TTS_INVALID_PROVIDER');
    expect(code(() => validateTtsRequest({ provider: 'toString', text: 'a' }))).toBe('TTS_INVALID_PROVIDER');
    const r = validateTtsRequest({ provider: 'openai', text: ' 미네락 육백 ', model: 'gpt-4o' });
    expect(r).toEqual({ provider: 'openai', text: '미네락 육백', voice: 'nova', style: null, format: 'mp3' });
    expect(TTS_PROVIDERS.openai.model).toBe('gpt-4o-mini-tts');
    expect(TTS_PROVIDERS.gemini.model).toBe('gemini-3.1-flash-tts-preview');
  });
  it('text 필수 · 길이 제한', () => {
    expect(code(() => validateTtsRequest({ provider: 'openai', text: '   ' }))).toBe('TTS_TEXT_REQUIRED');
    expect(code(() => validateTtsRequest({ provider: 'openai', text: 'x'.repeat(TTS_MAX_TEXT_LENGTH + 1) }))).toBe('TTS_TEXT_TOO_LONG');
  });
  it('format 은 provider 별 allowlist (gemini 는 wav 만)', () => {
    expect(validateTtsRequest({ provider: 'gemini', text: 'a' }).format).toBe('wav');
    expect(code(() => validateTtsRequest({ provider: 'gemini', text: 'a', format: 'mp3' }))).toBe('TTS_INVALID_FORMAT');
    expect(validateTtsRequest({ provider: 'openai', text: 'a', format: 'wav' }).format).toBe('wav');
    expect(code(() => validateTtsRequest({ provider: 'openai', text: 'a', format: 'ogg' }))).toBe('TTS_INVALID_FORMAT');
  });
  it('voice 는 식별자 패턴만 · style 길이 제한', () => {
    expect(validateTtsRequest({ provider: 'gemini', text: 'a', voice: '' }).voice).toBe('Kore');
    expect(code(() => validateTtsRequest({ provider: 'openai', text: 'a', voice: 'nova; rm' }))).toBe('TTS_INVALID_VOICE');
    expect(code(() => validateTtsRequest({ provider: 'openai', text: 'a', style: 'x'.repeat(501) }))).toBe('TTS_STYLE_TOO_LONG');
    expect(validateTtsRequest({ provider: 'openai', text: 'a', style: ' 차분하게 ' }).style).toBe('차분하게');
  });
});

describe('TTS narrow endpoint — TtsNarrationService', () => {
  const req = validateTtsRequest({ provider: 'openai', text: '미네락 육백은, 어떤 물일까요?', style: '차분한 약사 톤' });

  it('key 미설정 → 503 TTS_PROVIDER_NOT_CONFIGURED, provider 호출 없음', async () => {
    const fetchMock = jest.fn();
    const svc = new TtsNarrationService(async () => '', fetchMock);
    expect(await asyncCode(svc.synthesize(req))).toBe('TTS_PROVIDER_NOT_CONFIGURED:503');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('openai: canonical model · instructions · Bearer 헤더 · mp3 바이너리 반환', async () => {
    const fetchMock = jest.fn(async () => okResponse(Buffer.from('ID3mp3')));
    const svc = new TtsNarrationService(async () => 'sk-test', fetchMock);
    const r = await svc.synthesize(req);
    expect(r.model).toBe('gpt-4o-mini-tts');
    expect(r.mimeType).toBe('audio/mpeg');
    expect(r.audio.toString()).toBe('ID3mp3');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/audio/speech');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: '미네락 육백은, 어떤 물일까요?',
      instructions: '차분한 약사 톤',
      response_format: 'mp3',
    });
  });

  it('gemini: key 는 헤더로만(URL 에 없음) · PCM inlineData → WAV 래핑(24kHz mono 16bit)', async () => {
    const pcm = Buffer.alloc(4800, 1);
    const fetchMock = jest.fn(async () =>
      okResponse(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm.toString('base64') } }] } }],
        }),
      ),
    );
    const svc = new TtsNarrationService(async () => 'AIza-test', fetchMock);
    const g = validateTtsRequest({ provider: 'gemini', text: '경도 육백', style: '차분하게' });
    const r = await svc.synthesize(g);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent');
    expect(url).not.toContain('AIza-test');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIza-test');
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts[0].text).toBe('차분하게\n\n경도 육백');
    expect(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');
    expect(r.mimeType).toBe('audio/wav');
    expect(r.audio.length).toBe(44 + 4800);
    expect(r.audio.subarray(0, 4).toString()).toBe('RIFF');
    expect(r.audio.readUInt32LE(24)).toBe(24000);
    expect(r.audio.readUInt16LE(22)).toBe(1);
    expect(r.audio.readUInt32LE(40)).toBe(4800);
    expect(r.audio.subarray(44).equals(pcm)).toBe(true);
  });

  it('gemini: 오디오 파트 없음 → 502 TTS_PROVIDER_NO_AUDIO', async () => {
    const svc = new TtsNarrationService(async () => 'k', async () => okResponse(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'no' }] } }] })));
    expect(await asyncCode(svc.synthesize(validateTtsRequest({ provider: 'gemini', text: 'a' })))).toBe('TTS_PROVIDER_NO_AUDIO:502');
  });

  it('provider HTTP 오류 → 502 (429 는 RATE_LIMITED) · 네트워크 실패 → 502 UNREACHABLE · 응답에 provider 본문 비노출', async () => {
    const failing = new TtsNarrationService(async () => 'k', async () => new Response('{"error":"secret detail sk-xyz"}', { status: 401 }));
    expect(await asyncCode(failing.synthesize(req))).toBe('TTS_PROVIDER_FAILED:502');
    const limited = new TtsNarrationService(async () => 'k', async () => new Response('slow down', { status: 429 }));
    expect(await asyncCode(limited.synthesize(req))).toBe('TTS_PROVIDER_RATE_LIMITED:502');
    const down = new TtsNarrationService(async () => 'k', async () => {
      throw new Error('ECONNRESET');
    });
    expect(await asyncCode(down.synthesize(req))).toBe('TTS_PROVIDER_UNREACHABLE:502');
  });

  it('pcmToWav 헤더 크기 계산', () => {
    const wav = pcmToWav(Buffer.alloc(10), 16000);
    expect(wav.readUInt32LE(4)).toBe(36 + 10);
    expect(wav.readUInt32LE(28)).toBe(32000);
  });
});
