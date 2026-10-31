import { ConsultationGoogleService, readConsultationWav } from '../services/consultation-google.js';
import { loadAiPriceCatalog } from '../../ai-policy/ai-pricing.js';
import { prepareNativePlan, measuredNativeUsage } from '../../ai-policy/ai-native-metering.js';
import { speechLocales } from '../services/consultation-google.js';

function wav(seconds = 1) {
  const audio = Buffer.alloc(44 + seconds * 32000);
  audio.write('RIFF', 0); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8); audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(16000, 24); audio.writeUInt32LE(32000, 28);
  audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(audio.length - 44, 40);
  return audio;
}
it('measures duration from bounded PCM data and rejects forged or overlong audio', () => {
  expect(readConsultationWav(wav(2).toString('base64'))).toMatchObject({ units: 2, seconds: 2 });
  const forged = wav(); forged.writeUInt32LE(1, 4);
  expect(() => readConsultationWav(forged.toString('base64'))).toThrow();
  expect(() => readConsultationWav(wav(61).toString('base64'))).toThrow();
});
it('requires explicit STT second pricing and settles measured units through the existing plan', () => {
  const catalog = loadAiPriceCatalog(JSON.stringify({ version: 'synthetic-v1', rates: [{ provider: 'google-cloud', model: 'stt-short', currency: 'USD', inputPerMillion: 0, outputPerMillion: 0,
    native: { stt: { maxInputTokens: 0, maxOutputTokens: 0, unit: 'second', perUnit: 0.001 } } }] }));
  const plan = prepareNativePlan({ kind: 'stt', provider: 'google-cloud', model: 'stt-short', units: 3, unit: 'second', maxOutputTokens: 0 }, catalog);
  expect(plan.budget).toEqual({ requests: 1, tokens: 0, cost: 0.003 });
  expect(measuredNativeUsage(plan, { units: 2 })).toEqual({ requests: 1, tokens: 0, cost: 0.002 });
  expect(() => prepareNativePlan({ kind: 'stt', provider: 'google-cloud', model: 'stt-short', units: 3, unit: 'character', maxOutputTokens: 0 }, catalog)).toThrow();
});
it('uses automatic source detection without inventing a source language and rechecks authorization', async () => {
  const transport = jest.fn(async () => ({ translations: [{ translatedText: '안녕하세요', detectedLanguageCode: 'ja' }] }));
  const account = { invokeNative: jest.fn(async (_request, _scope, run) => (await run()).value) } as any;
  const authorize = jest.fn(async () => true);
  const service = new ConsultationGoogleService({} as any, transport as any, account);
  expect(await service.translate({ text: 'こんにちは', source: 'auto', target: 'ko' }, { actorId: 'fixture', authorize })).toEqual({ translation: '안녕하세요', detectedLanguage: 'ja' });
  expect(transport.mock.calls[0][2]).not.toHaveProperty('sourceLanguageCode');
  expect(account.invokeNative.mock.calls[0][0]).toMatchObject({ kind: 'translation', units: 5, unit: 'character' });
  expect(authorize).toHaveBeenCalledTimes(3);
});
it('rejects a revoked result after provider completion and uses the configured candidate languages', async () => {
  const authorize = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('revoked'));
  const transport = jest.fn(async () => ({ results: [{ languageCode: 'en-US', alternatives: [{ transcript: 'hello' }] }] }));
  const account = { invokeNative: jest.fn(async (_request, _scope, run) => (await run()).value) } as any;
  await expect(new ConsultationGoogleService({} as any, transport as any, account).recognize(wav().toString('base64'), ['ko', 'en'], { actorId: 'fixture', authorize })).rejects.toThrow('revoked');
  expect(transport.mock.calls[0][2]).toMatchObject({ config: { languageCodes: ['ko-KR', 'en-US'] } });
});
it('does not dispatch or fall back when native pricing or quota admission fails', async () => {
  for (const reason of ['AI_PRICING_NOT_CONFIGURED', 'QUOTA_EXCEEDED']) {
    const transport = jest.fn(), account = { invokeNative: jest.fn().mockRejectedValue(new Error(reason)) } as any;
    await expect(new ConsultationGoogleService({} as any, transport, account).translate({ text: '합성 문장', source: 'ko', target: 'en' }, { actorId: 'fixture', authorize: async () => true })).rejects.toThrow(reason);
    expect(transport).not.toHaveBeenCalled();
  }
});
it.each(['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'])('retains language %s through recognition and synthesis without claiming live provider quality', async language => {
  const transport = jest.fn().mockResolvedValueOnce({ results: [{ languageCode: speechLocales[language], alternatives: [{ transcript: '합성 문장' }] }] })
    .mockResolvedValueOnce({ audioContent: Buffer.from('synthetic-audio').toString('base64') });
  const account = { invokeNative: jest.fn(async (_request, _scope, run) => (await run()).value) } as any;
  const service = new ConsultationGoogleService({} as any, transport, account), access = { actorId: 'fixture', authorize: async () => true };
  expect(await service.recognize(wav().toString('base64'), [language], access)).toMatchObject({ language, text: '합성 문장' });
  expect(await service.synthesize('합성 문장', language, access)).toHaveProperty('mimeType', 'audio/mpeg');
  expect(account.invokeNative.mock.calls[1][0]).toMatchObject({ kind: 'tts', units: 5, unit: 'character' });
});
it('requests manual confirmation for explicitly low-confidence or mixed-language speech', async () => {
  const account = { invokeNative: jest.fn(async (_request, _scope, run) => (await run()).value) } as any;
  for (const results of [
    [{ languageCode: 'ja-JP', alternatives: [{ transcript: '合成質問', confidence: 0.1 }] }],
    [{ languageCode: 'ja-JP', alternatives: [{ transcript: '合成' }] }, { languageCode: 'en-US', alternatives: [{ transcript: 'question' }] }],
  ]) {
    const transport = jest.fn().mockResolvedValue({ results });
    await expect(new ConsultationGoogleService({} as any, transport, account).recognize(wav().toString('base64'), ['ja', 'en'], { actorId: 'fixture', authorize: async () => true })).rejects.toMatchObject({ code: 'CONSULTATION_LANGUAGE_UNCERTAIN', httpStatus: 422 });
  }
});
