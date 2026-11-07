const policy = jest.fn();
const account = jest.fn();
const dbQuery = jest.fn();
const checkQuota = jest.fn();
const apiKey = jest.fn();
jest.mock('../../../database/connection', () => ({
  AppDataSource: { query: (...args: unknown[]) => dbQuery(...args), getRepository: () => ({ findOneBy: policy }) },
}));
jest.mock('../../../modules/ai-policy/ai-accounted-execution', () => ({
  executeAccountedAi: (...args: unknown[]) => account(...args),
}));
jest.mock('../../../modules/ai-policy/ai-quota.service', () => ({
  AiQuotaService: class { checkQuota = checkQuota; },
}));
jest.mock('../../../utils/ai-editing-model-resolver', () => ({ resolveEditingModel: async () => 'configured-model' }));
jest.mock('../../../utils/ai-key.util', () => ({ resolveAiApiKey: (...args: unknown[]) => apiKey(...args) }));
jest.mock('../../../utils/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn() } }));

import { FORUM_AI_DAILY_CEILING, getForumAiStatus, requestForumComposeAssist, requestForumSimilarKeywords } from '../community-forum-ai.service';

const boards = [{ id: 'writable-board', name: '자유게시판' }];
const input = { title: '재고 관리 문의', body: '재고를 어떻게 관리하시나요' };
const goodOutput = JSON.stringify({ titles: ['하나', '둘', '셋'], body: null, tags: [], boardId: 'writable-board', boardReason: '' });
const invocation = (content: string) => ({ content, provider: 'gemini', model: 'configured-model', promptTokens: 1, completionTokens: 1, requestId: 'r' });

beforeEach(() => {
  jest.clearAllMocks();
  policy.mockResolvedValue({ aiEnabled: true, freeDailyLimit: 10 });
  apiKey.mockResolvedValue('fixture-key');
  dbQuery.mockResolvedValue([{ used: 0 }]);
  checkQuota.mockResolvedValue({ allowed: true, warnings: [], exceeded: [] });
  account.mockResolvedValue(invocation(goodOutput));
});

describe('cost limits', () => {
  it('one attempt, capped output, configured model, existing community accounting', async () => {
    await requestForumComposeAssist(input, boards, 'author');
    expect(account).toHaveBeenCalledTimes(1);
    expect(account.mock.calls[0][1]).toMatchObject({
      retry: { maxAttempts: 1 }, timeoutMs: 24000, config: { maxTokens: 2600, model: 'configured-model' },
    });
    expect(account.mock.calls[0][2]).toEqual({ scope: 'SERVICE_QUERY', serviceKey: 'community', userId: 'author' });
  });
  it('keyword search spends far fewer output tokens', async () => {
    account.mockResolvedValue(invocation(JSON.stringify({ keywords: ['재고'] })));
    await expect(requestForumSimilarKeywords('재고 관리', 'author')).resolves.toEqual(['재고']);
    expect(account.mock.calls[0][1]).toMatchObject({ retry: { maxAttempts: 1 }, config: { maxTokens: 200 } });
  });
  it('the daily limit comes from the existing ledger and blocks before the provider', async () => {
    dbQuery.mockResolvedValue([{ used: 10 }]);
    await expect(requestForumComposeAssist(input, boards, 'author')).rejects.toMatchObject({ code: 'AI_DAILY_LIMIT_EXCEEDED', status: 429 });
    expect(account).not.toHaveBeenCalled();
    const [sql, params] = dbQuery.mock.calls[0];
    expect(sql).toContain('ai_usage_reservations');
    expect(sql).toContain("status <> 'released'");
    expect(params).toEqual(['author', 'SERVICE_QUERY', 'community', new Date().toISOString().slice(0, 10)]);
  });
  it('the operator limit cannot exceed the hard ceiling', async () => {
    policy.mockResolvedValue({ aiEnabled: true, freeDailyLimit: 100000 });
    await expect(getForumAiStatus('author')).resolves.toMatchObject({ dailyLimit: FORUM_AI_DAILY_CEILING, remainingToday: FORUM_AI_DAILY_CEILING });
  });
  it('a zero limit closes AI', async () => {
    policy.mockResolvedValue({ aiEnabled: true, freeDailyLimit: 0 });
    await expect(getForumAiStatus('author')).resolves.toMatchObject({ available: false, reason: 'AI_DAILY_LIMIT_EXCEEDED' });
  });
  it('one user cannot race the count with parallel requests in one instance', async () => {
    let release!: (value: unknown) => void;
    account.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const first = requestForumComposeAssist(input, boards, 'author');
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    await expect(requestForumComposeAssist(input, boards, 'author')).rejects.toMatchObject({ code: 'AI_REQUEST_IN_PROGRESS', status: 409 });
    release(invocation(goodOutput));
    await expect(first).resolves.toBeTruthy();
    expect(account).toHaveBeenCalledTimes(1);
    await expect(requestForumComposeAssist(input, boards, 'author')).resolves.toBeTruthy();
  });
});

describe('AI off and over quota', () => {
  it('never calls the provider when disabled or unconfigured', async () => {
    policy.mockResolvedValue({ aiEnabled: false, freeDailyLimit: 10 });
    await expect(requestForumComposeAssist(input, boards, 'author')).rejects.toMatchObject({ code: 'AI_DISABLED', status: 503 });
    policy.mockResolvedValue({ aiEnabled: true, freeDailyLimit: 10 });
    apiKey.mockResolvedValue(null);
    await expect(requestForumSimilarKeywords('재고 관리', 'author')).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
    expect(account).not.toHaveBeenCalled();
  });
  it('checks the existing quota on the community service layer', async () => {
    checkQuota.mockResolvedValue({ allowed: false, warnings: [], exceeded: [{}] });
    await expect(requestForumComposeAssist(input, boards, 'author')).rejects.toMatchObject({ code: 'AI_QUOTA_EXCEEDED', status: 429 });
    expect(checkQuota).toHaveBeenCalledWith('SERVICE_QUERY', 'author', 'community');
    expect(account).not.toHaveBeenCalled();
  });
  it('a quota rejection at reservation time reads as over quota', async () => {
    account.mockRejectedValue(new Error('QUOTA_EXCEEDED'));
    await expect(requestForumComposeAssist(input, boards, 'author')).rejects.toMatchObject({ code: 'AI_QUOTA_EXCEEDED', status: 429 });
  });
  it('a storage failure reads as unavailable, not as an error page', async () => {
    dbQuery.mockRejectedValue(new Error('connection detail'));
    await expect(getForumAiStatus('author')).resolves.toEqual({ available: false, reason: 'AI_UNAVAILABLE', dailyLimit: 0, remainingToday: 0 });
  });
});

describe('AI mock behavior', () => {
  it('a forged board id from the model is rejected, with no retry', async () => {
    account.mockResolvedValue(invocation(JSON.stringify({ titles: ['하나', '둘', '셋'], body: null, tags: [], boardId: 'closed-board' })));
    await expect(requestForumComposeAssist(input, boards, 'author')).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID', status: 502 });
    expect(account).toHaveBeenCalledTimes(1);
  });
  it('a provider failure does not retry or leak its message', async () => {
    account.mockRejectedValue(new Error('provider said secret'));
    const error = await requestForumComposeAssist(input, boards, 'author').catch((e) => e);
    expect(error).toMatchObject({ code: 'AI_UNAVAILABLE', status: 503 });
    expect(String(error.message)).not.toContain('secret');
    expect(account).toHaveBeenCalledTimes(1);
  });
  it('the host only returns the suggestion; it issues no write beyond the usage count read', async () => {
    await requestForumComposeAssist(input, boards, 'author');
    for (const [sql] of dbQuery.mock.calls) expect(sql).toMatch(/^\s*SELECT/);
  });
});
