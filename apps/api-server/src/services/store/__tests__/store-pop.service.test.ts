/**
 * store-pop.service 계약 테스트
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1
 *
 * 이 service 는 KPA · GlycoPharm · K-Cosmetics · Pharmacy-Hub 가 공유한다.
 * pop.controller.ts 를 위임 전환하면서 계약이 바뀌지 않았음을 고정한다.
 *
 * 특히 지키려는 불변식:
 *   1. 조회·수정·삭제는 **author_role='store' 사본만** 대상 (운영자 원본 무접촉)
 *   2. 경계는 (store_id, service_key) 복합
 *   3. import 는 값 복사 — 새 id · 매장 store_id · status='draft' (원본 FK 없음)
 *   4. publishedAt 은 최초 발행에만 기록 (재발행이 최초 발행일을 덮지 않는다)
 */

import {
  listStorePops,
  findStorePop,
  createStorePop,
  importStorePop,
  updateStorePop,
  setStorePopStatus,
  deleteStorePop,
  POP_ORIGIN_PREFIX,
  type PopFailure,
} from '../store-pop.service';

const STORE = '11111111-1111-4111-8111-111111111111';
const SERVICE = 'pharmacy-hub';

function makeDataSource(repoOverrides: Partial<Record<string, jest.Mock>> = {}) {
  const repo = {
    find: jest.fn(),
    findAndCount: jest.fn(async () => [[], 0]),
    findOne: jest.fn(async () => null),
    create: jest.fn((v: any) => ({ ...v })),
    save: jest.fn(async (v: any) => ({ id: 'saved-id', ...v })),
    remove: jest.fn(async () => undefined),
    ...repoOverrides,
  } as any;
  return { ds: { getRepository: () => repo } as any, repo };
}

describe('listStorePops', () => {
  it('author_role=store + (store_id, service_key) 로만 조회한다', async () => {
    const { ds, repo } = makeDataSource();
    await listStorePops(ds, STORE, SERVICE, {});

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE, serviceKey: SERVICE, authorRole: 'store' },
        order: { updatedAt: 'DESC' },
      }),
    );
  });

  it('허용된 status 만 필터로 반영한다', async () => {
    const { ds, repo } = makeDataSource();

    await listStorePops(ds, STORE, SERVICE, { status: 'published' });
    expect(repo.findAndCount.mock.calls[0][0].where.status).toBe('published');

    repo.findAndCount.mockClear();
    await listStorePops(ds, STORE, SERVICE, { status: 'nonsense' });
    expect(repo.findAndCount.mock.calls[0][0].where.status).toBeUndefined();
  });

  it('limit 은 50 을 넘지 않는다', async () => {
    const { ds, repo } = makeDataSource();
    await listStorePops(ds, STORE, SERVICE, { limit: 999 });
    expect(repo.findAndCount.mock.calls[0][0].take).toBe(50);
  });
});

describe('createStorePop', () => {
  it('title 이 없으면 400', async () => {
    const { ds } = makeDataSource();
    const result = (await createStorePop(ds, STORE, SERVICE, { content: 'x' })) as PopFailure;
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('author_role=store · storeId · draft 를 서버가 강제한다', async () => {
    const { ds, repo } = makeDataSource();

    await createStorePop(ds, STORE, SERVICE, {
      title: '환절기 안내',
      content: '<p>본문</p>',
      // body 로 뒤집으려는 시도 — service 는 이 값을 읽지 않는다.
      authorRole: 'operator',
      storeId: 'someone-else',
      status: 'published',
    } as any);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: STORE,
        serviceKey: SERVICE,
        authorRole: 'store',
        status: 'draft',
        title: '환절기 안내',
      }),
    );
  });
});

describe('importStorePop', () => {
  it('sourceId 가 없으면 400', async () => {
    const { ds } = makeDataSource();
    const result = (await importStorePop(ds, STORE, SERVICE, undefined)) as PopFailure;
    expect(result.status).toBe(400);
  });

  it('운영자 발행 원본이 아니면 404', async () => {
    const { ds, repo } = makeDataSource({ findOne: jest.fn(async () => null) });
    const result = (await importStorePop(ds, STORE, SERVICE, 'src-1')) as PopFailure;

    expect(result.status).toBe(404);
    expect(result.code).toBe('SOURCE_NOT_FOUND');
    // 원본 조회 조건이 operator + published + 같은 서비스로 고정되어야 한다.
    expect(repo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'src-1',
        serviceKey: SERVICE,
        authorRole: 'operator',
        status: 'published',
      },
    });
  });

  it('원본을 값 복사해 매장 소유 draft 사본을 만든다 (원본 FK 없음)', async () => {
    const source = {
      id: 'src-1',
      title: '운영자 POP',
      slug: 'operator-pop',
      excerpt: '요약',
      content: '<p>원본 본문</p>',
      serviceKey: SERVICE,
      authorRole: 'operator',
    };
    const findOne = jest
      .fn()
      .mockResolvedValueOnce(source) // 원본
      .mockResolvedValueOnce(null); // 매장 내 slug 충돌 없음
    const { ds, repo } = makeDataSource({ findOne });

    const result = await importStorePop(ds, STORE, SERVICE, 'src-1');

    expect(result.ok).toBe(true);
    const created = repo.create.mock.calls[0][0];
    expect(created).toEqual(
      expect.objectContaining({
        storeId: STORE,
        serviceKey: SERVICE,
        authorRole: 'store',
        status: 'draft',
        title: source.title,
        content: source.content,
      }),
    );
    // 원본을 가리키는 FK 필드를 만들지 않는다 (독립 사본).
    expect(created).not.toHaveProperty('sourceId');
    expect(created).not.toHaveProperty('copiedFromId');
    // 출처는 excerpt 접두어로만 표시한다.
    expect(created.excerpt).toBe(`${POP_ORIGIN_PREFIX}요약`);
  });

  it('매장 내 slug 가 이미 있으면 suffix 를 붙여 회피한다', async () => {
    const source = { id: 's', title: 'T', slug: 'dup', excerpt: null, content: '', serviceKey: SERVICE, authorRole: 'operator' };
    const findOne = jest
      .fn()
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce({ id: 'existing' }); // slug 충돌
    const { ds, repo } = makeDataSource({ findOne });

    await importStorePop(ds, STORE, SERVICE, 's');

    const created = repo.create.mock.calls[0][0];
    expect(created.slug).not.toBe('dup');
    expect(created.slug.startsWith('dup-')).toBe(true);
  });
});

describe('updateStorePop', () => {
  it('없는 사본은 404 (운영자 원본도 여기서 조회되지 않는다)', async () => {
    const { ds, repo } = makeDataSource({ findOne: jest.fn(async () => null) });
    const result = (await updateStorePop(ds, STORE, SERVICE, 'p1', { title: 'x' })) as PopFailure;

    expect(result.status).toBe(404);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'p1', storeId: STORE, serviceKey: SERVICE, authorRole: 'store' },
    });
  });

  it('slug 를 매장 내 중복 값으로 바꾸면 409', async () => {
    const post: any = { id: 'p1', slug: 'old' };
    const findOne = jest.fn().mockResolvedValueOnce(post).mockResolvedValueOnce({ id: 'other' });
    const { ds } = makeDataSource({ findOne });

    const result = (await updateStorePop(ds, STORE, SERVICE, 'p1', { slug: 'taken' })) as PopFailure;
    expect(result.status).toBe(409);
    expect(result.code).toBe('SLUG_CONFLICT');
  });

  it('제목·본문·요약만 반영한다', async () => {
    const post: any = { id: 'p1', slug: 'x', title: 'before', content: 'c', excerpt: 'e' };
    const { ds } = makeDataSource({
      findOne: jest.fn(async () => post),
      save: jest.fn(async (v: any) => v),
    });

    const result = await updateStorePop(ds, STORE, SERVICE, 'p1', {
      title: 'after',
      content: '<p>new</p>',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe('after');
    expect(result.data.content).toBe('<p>new</p>');
  });
});

describe('setStorePopStatus', () => {
  it('허용되지 않은 status 는 400', async () => {
    const { ds } = makeDataSource();
    const result = (await setStorePopStatus(ds, STORE, SERVICE, 'p1', 'nope' as any)) as PopFailure;
    expect(result.status).toBe(400);
  });

  it('최초 발행에만 publishedAt 을 찍는다', async () => {
    const post: any = { id: 'p1', status: 'draft', publishedAt: undefined };
    const { ds } = makeDataSource({
      findOne: jest.fn(async () => post),
      save: jest.fn(async (v: any) => v),
    });

    const result = await setStorePopStatus(ds, STORE, SERVICE, 'p1', 'published');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.publishedAt).toBeInstanceOf(Date);
  });

  it('보관 후 재발행이 최초 발행일을 덮어쓰지 않는다', async () => {
    const firstPublished = new Date('2026-01-01T00:00:00Z');
    const post: any = { id: 'p1', status: 'archived', publishedAt: firstPublished };
    const { ds } = makeDataSource({
      findOne: jest.fn(async () => post),
      save: jest.fn(async (v: any) => v),
    });

    const result = await setStorePopStatus(ds, STORE, SERVICE, 'p1', 'published');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.publishedAt).toBe(firstPublished);
  });

  it('보관은 status 만 바꾼다', async () => {
    const post: any = { id: 'p1', status: 'published', publishedAt: new Date() };
    const { ds } = makeDataSource({
      findOne: jest.fn(async () => post),
      save: jest.fn(async (v: any) => v),
    });

    const result = await setStorePopStatus(ds, STORE, SERVICE, 'p1', 'archived');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('archived');
  });
});

describe('findStorePop / deleteStorePop', () => {
  it('타 서비스 사본은 조회되지 않는다', async () => {
    const { ds, repo } = makeDataSource({ findOne: jest.fn(async () => null) });
    const result = (await findStorePop(ds, STORE, 'kpa', 'p1')) as PopFailure;

    expect(result.status).toBe(404);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'p1', storeId: STORE, serviceKey: 'kpa', authorRole: 'store' },
    });
  });

  it('삭제는 사본만 제거한다', async () => {
    const post: any = { id: 'p1' };
    const remove = jest.fn(async () => undefined);
    const { ds } = makeDataSource({ findOne: jest.fn(async () => post), remove });

    const result = await deleteStorePop(ds, STORE, SERVICE, 'p1');
    expect(result.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith(post);
  });
});
