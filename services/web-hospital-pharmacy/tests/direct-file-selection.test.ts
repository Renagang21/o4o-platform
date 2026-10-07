/**
 * 원내 약품 파일 직접 선택 계약 (WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE §19)
 *
 * 브라우저 의존(파일 선택 창 · IndexedDB · 권한 · 서버 AI)은 주입한 가짜로 대체하고,
 * decode · profile · fingerprint · normalize 는 실제 @o4o/file-understanding-core 를 그대로 쓴다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FileStructureInference, StructureProfile } from '@o4o/file-understanding-core';
import { HOSPITAL_DRUG_TARGET_SCHEMA } from '@o4o/hospital-pharmacy-core';
import {
  DRUG_FILE_PICKER_OPTIONS,
  SUPPORTED_DRUG_FILE_EXTENSIONS,
  hasFileChanged,
  isSupportedDrugFileName,
  pickDrugFile,
  readDrugFile,
  type LoadedDrugFile,
  type ReadDrugFileDeps,
  type ReadPermission,
} from '../src/lib/localDrugFile';
import type { StoredDrugFile, StoredMapping } from '../src/lib/drugFileStore';
import { DrugFileSession, type DrugFileSessionDeps, type DrugFileSessionState } from '../src/lib/drugFileSession';

// ── 픽스처 ──────────────────────────────────────────────────────────────────

// 상단 4행이 구조 fingerprint 시그니처다 — 행 추가만으로 구조가 바뀌지 않도록 데이터 4행 이상으로 둔다.
const CSV_A = '제품명,성분,함량\n타이레놀정500mg,아세트아미노펜,500mg\n아모디핀정,암로디핀,5mg\n가스모틴정,모사프리드,5mg\n리피토정,아토르바스타틴,10mg\n';
const CSV_A_UPDATED = `${CSV_A}무코스타정,레바미피드,100mg\n`;
const CSV_B = '약품코드,품명,주성분,규격,제조사\nA01,써스펜좌약,아세트아미노펜,125mg,한미\n';

function csvFile(name: string, text: string, lastModified = 1_000): File {
  return new File([text], name, { type: 'text/csv', lastModified });
}

/** 헤더 1행 + 데이터 — 헤더 텍스트로 열을 대응시키는 가짜 GFU(서버 AI 대역). */
function fakeInference(profile: StructureProfile): FileStructureInference {
  const sheet = profile.sheets[0];
  const header = sheet.sampleRows[0];
  const byLabel: Record<string, string> = { 제품명: 'product_name', 품명: 'product_name', 성분: 'ingredient', 주성분: 'ingredient', 함량: 'strength', 규격: 'strength', 제조사: 'manufacturer' };
  const columns = header
    .map((label, i) => ({ sourceColumn: i, sourceLabel: label, targetField: byLabel[label], confidence: 0.95 }))
    .filter((c) => c.targetField);
  return {
    confidence: 0.95,
    warnings: [],
    sheets: [{ sheetName: sheet.sheetName, regions: [{ startRow: 0, headerRow: 0, dataStartRow: 1, columns, confidence: 0.95 }], unmappedColumns: [] }],
  };
}

function memoryReadDeps() {
  let stored: StoredMapping | null = null;
  const inferStructure = vi.fn(async (p: StructureProfile) => ({ inference: fakeInference(p), model: 'fake' }));
  const deps: ReadDrugFileDeps = {
    loadMapping: async () => stored,
    saveMapping: async (m) => { stored = m; return true; },
    inferStructure,
  };
  return { deps, inferStructure, getStored: () => stored };
}

/** 사용자 PC 의 실제 파일을 흉내내는 file handle — 내용을 바꾸거나 지울 수 있다. */
class FakeFileHandle {
  readonly kind = 'file';
  permission: ReadPermission = 'granted';
  private file: File | null;
  constructor(readonly name: string, text: string, lastModified = 1_000) {
    this.file = csvFile(name, text, lastModified);
  }
  overwrite(text: string, lastModified: number) { this.file = csvFile(this.name, text, lastModified); }
  remove() { this.file = null; }
  async getFile(): Promise<File> {
    if (!this.file) throw new DOMException('not found', 'NotFoundError');
    return this.file;
  }
}
const asHandle = (h: FakeFileHandle) => h as unknown as FileSystemFileHandle;

function makeSession(opts: { stored?: StoredDrugFile | null; pick?: FakeFileHandle[]; supports?: boolean; grantOnRequest?: boolean } = {}) {
  const read = memoryReadDeps();
  const saved: StoredDrugFile[] = [];
  let stored = opts.stored ?? null;
  const pickQueue = [...(opts.pick ?? [])];
  const states: DrugFileSessionState[] = [];
  const deps: DrugFileSessionDeps = {
    supportsFilePicker: () => opts.supports ?? true,
    pickFile: vi.fn(async () => { const h = pickQueue.shift(); return h ? asHandle(h) : null; }),
    loadStored: async () => stored,
    saveStored: async (r) => { saved.push(r); stored = r; return true; },
    clearLegacyFolder: vi.fn(async () => {}),
    queryPermission: async (h) => (h as unknown as FakeFileHandle).permission,
    requestPermission: async (h) => {
      const fh = h as unknown as FakeFileHandle;
      if (opts.grantOnRequest ?? true) fh.permission = 'granted';
      else fh.permission = 'denied';
      return fh.permission;
    },
    getFile: (h) => h.getFile(),
    readDrugFile: vi.fn((f: File) => readDrugFile(f, read.deps)),
  };
  const session = new DrugFileSession(deps, (s) => states.push(s));
  return { session, deps, saved, read, states };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── file picker contract ───────────────────────────────────────────────────

describe('file picker contract', () => {
  it('파일 하나만 · Excel/CSV 형식만 고르게 한다', () => {
    expect(DRUG_FILE_PICKER_OPTIONS.multiple).toBe(false);
    const accepted = DRUG_FILE_PICKER_OPTIONS.types.flatMap((t) => Object.values(t.accept).flat());
    expect(accepted.sort()).toEqual([...SUPPORTED_DRUG_FILE_EXTENSIONS].sort());
    expect(SUPPORTED_DRUG_FILE_EXTENSIONS).toEqual(['.xlsx', '.xls', '.csv']);
  });

  it('showOpenFilePicker 를 쓰고 폴더 선택 창은 쓰지 않는다', async () => {
    const handle = new FakeFileHandle('원내약품목록_2026-09.xlsx', CSV_A);
    const showOpenFilePicker = vi.fn(async () => [handle]);
    const showDirectoryPicker = vi.fn();
    vi.stubGlobal('window', { showOpenFilePicker, showDirectoryPicker });
    const picked = await pickDrugFile();
    expect(picked).toBe(handle);
    expect(showOpenFilePicker).toHaveBeenCalledWith(DRUG_FILE_PICKER_OPTIONS);
    expect(showDirectoryPicker).not.toHaveBeenCalled();
  });

  it('사용자가 취소하면 null(기존 연결 유지)', async () => {
    vi.stubGlobal('window', { showOpenFilePicker: vi.fn(async () => { throw new DOMException('abort', 'AbortError'); }) });
    expect(await pickDrugFile()).toBeNull();
  });

  it('고정 파일명 가정 없음 — 어떤 이름이든 지원 확장자면 허용', () => {
    for (const name of ['hospital-drugs.xlsx', '원내약품목록.xlsx', '2026년9월_원내약품.xlsx', '약제부_원내약품_최종.XLSX', 'list.xls', 'list.csv']) {
      expect(isSupportedDrugFileName(name)).toBe(true);
    }
    for (const name of ['원내약품.pdf', '원내약품.docx', 'hospital-drugs']) {
      expect(isSupportedDrugFileName(name)).toBe(false);
    }
  });

  it('소스 어디에도 폴더 선택 · 고정 파일명이 남아 있지 않다', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(__dirname, '..', 'src');
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
    const code = walk(root).filter((p) => /\.(ts|tsx)$/.test(p)).map((p) => readFileSync(p, 'utf8')).join('\n');
    expect(code).not.toMatch(/showDirectoryPicker|getFileHandle\(|hospital-drugs\.xlsx|FileSystemDirectoryHandle/);
  });
});

// ── 연결 · handle 재사용 · 권한 ───────────────────────────────────────────

describe('file handle persistence & permission states', () => {
  it('직접 고른 파일을 연결하고 실제 파일명을 보존한다', async () => {
    const handle = new FakeFileHandle('2026년9월_원내약품.xlsx', CSV_A);
    const { session, saved } = makeSession({ pick: [handle] });
    await session.init();
    expect(session.getState().status).toBe('unconnected');
    await session.connect();
    const s = session.getState();
    expect(s.status).toBe('ready');
    expect(s.fileName).toBe('2026년9월_원내약품.xlsx');
    expect(s.file?.fileName).toBe('2026년9월_원내약품.xlsx');
    expect(s.file?.rows.map((r) => r.product_name)).toEqual(['타이레놀정500mg', '아모디핀정', '가스모틴정', '리피토정']);
    expect(saved.at(-1)?.handle).toBe(asHandle(handle));
    expect(saved.at(-1)?.fileName).toBe('2026년9월_원내약품.xlsx');
  });

  it('지원하지 않는 형식을 고르면 연결하지 않고 안내만', async () => {
    const { session, saved } = makeSession({ pick: [new FakeFileHandle('원내약품.pdf', CSV_A)] });
    await session.init();
    await session.connect();
    expect(session.getState().status).toBe('unconnected');
    expect(session.getState().error).toMatch(/xlsx/);
    expect(saved).toHaveLength(0);
  });

  it('재접속: 저장된 handle 이 granted 면 파일 재선택 없이 자동으로 읽는다', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A);
    const { session, deps } = makeSession({ stored: { handle: asHandle(handle), fileName: '원내약품목록.xlsx', lastModified: 1_000, size: 10, connectedAt: 't' } });
    await session.init();
    expect(session.getState().status).toBe('ready');
    expect(deps.pickFile).not.toHaveBeenCalled();
    expect(deps.clearLegacyFolder).toHaveBeenCalled();
  });

  it('재접속: 권한 재확인이 필요하면 needs-permission → [읽기 허용] 1회로 ready(재선택 없음)', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A);
    handle.permission = 'prompt';
    const { session, deps } = makeSession({ stored: { handle: asHandle(handle), fileName: '원내약품목록.xlsx', lastModified: null, size: null, connectedAt: 't' } });
    await session.init();
    expect(session.getState()).toMatchObject({ status: 'needs-permission', fileName: '원내약품목록.xlsx' });
    await session.allowAccess();
    expect(session.getState().status).toBe('ready');
    expect(deps.pickFile).not.toHaveBeenCalled();
  });

  it('권한을 거부하면 needs-permission 에 머물고 안내한다', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A);
    handle.permission = 'prompt';
    const { session } = makeSession({ grantOnRequest: false, stored: { handle: asHandle(handle), fileName: '원내약품목록.xlsx', lastModified: null, size: null, connectedAt: 't' } });
    await session.init();
    await session.allowAccess();
    expect(session.getState().status).toBe('needs-permission');
    expect(session.getState().error).toMatch(/허용되지 않았습니다/);
  });

  it('연결했던 파일이 옮겨지거나 삭제되면 unreadable(다른 파일 선택 안내)', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A);
    handle.remove();
    const { session } = makeSession({ stored: { handle: asHandle(handle), fileName: '원내약품목록.xlsx', lastModified: null, size: null, connectedAt: 't' } });
    await session.init();
    expect(session.getState()).toMatchObject({ status: 'unreadable', fileName: '원내약품목록.xlsx' });
  });

  it('File System Access 가 없는 브라우저는 unsupported', async () => {
    const { session } = makeSession({ supports: false });
    await session.init();
    expect(session.getState().status).toBe('unsupported');
  });
});

// ── 변경 감지 · 파일 교체 · mapping 재사용 ──────────────────────────────────

describe('file change detection & replacement', () => {
  it('hasFileChanged — lastModified/size 가 같으면 그대로, 하나라도 바뀌면 재읽기', () => {
    expect(hasFileChanged(null, { lastModified: 1, size: 1 })).toBe(true);
    expect(hasFileChanged({ lastModified: 1, size: 1 }, { lastModified: 1, size: 1 })).toBe(false);
    expect(hasFileChanged({ lastModified: 1, size: 1 }, { lastModified: 2, size: 1 })).toBe(true);
    expect(hasFileChanged({ lastModified: 1, size: 1 }, { lastModified: 1, size: 2 })).toBe(true);
  });

  it('같은 파일이 덮어써지면 자동 재읽기 · 같은 구조라 mapping 재사용(AI 재호출 없음)', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A, 1_000);
    const { session, deps, read } = makeSession({ pick: [handle] });
    await session.init();
    await session.connect();
    expect(read.inferStructure).toHaveBeenCalledTimes(1);

    // 변경 없음 → 다시 파싱하지 않는다
    await session.ensureFresh();
    expect(deps.readDrugFile).toHaveBeenCalledTimes(1);

    handle.overwrite(CSV_A_UPDATED, 2_000);
    const rows = await session.ensureFresh();
    expect(rows?.map((r) => r.product_name)).toContain('무코스타정');
    expect(deps.readDrugFile).toHaveBeenCalledTimes(2);
    expect(read.inferStructure).toHaveBeenCalledTimes(1);
    expect(session.getState().file?.mappingReused).toBe(true);
  });

  it('구조가 바뀌면 Generic File Understanding 을 다시 실행한다', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A, 1_000);
    const { session, read } = makeSession({ pick: [handle] });
    await session.init();
    await session.connect();
    handle.overwrite(CSV_B, 3_000);
    await session.ensureFresh();
    expect(read.inferStructure).toHaveBeenCalledTimes(2);
    expect(session.getState().file?.mappingReused).toBe(false);
    expect(session.getState().file?.rows[0]).toMatchObject({ product_name: '써스펜좌약', manufacturer: '한미' });
  });

  it('[파일 변경] — 사용자가 고른 새 파일로 handle 을 교체한다(자동 탐색 없음)', async () => {
    const first = new FakeFileHandle('원내약품목록_2026-08.xlsx', CSV_A);
    const second = new FakeFileHandle('원내약품목록_2026-09.csv', CSV_B);
    const { session, deps, saved } = makeSession({ pick: [first, second] });
    await session.init();
    await session.connect();
    await session.connect();
    expect(deps.pickFile).toHaveBeenCalledTimes(2);
    expect(session.getState().fileName).toBe('원내약품목록_2026-09.csv');
    expect(session.getState().file?.rows.map((r) => r.product_name)).toEqual(['써스펜좌약']);
    expect(saved.at(-1)?.handle).toBe(asHandle(second));
  });

  it('[파일 변경] 을 취소하면 기존 연결을 유지한다', async () => {
    const first = new FakeFileHandle('원내약품목록.xlsx', CSV_A);
    const { session } = makeSession({ pick: [first] });
    await session.init();
    await session.connect();
    await session.connect(); // 큐가 비어 취소(null)
    expect(session.getState()).toMatchObject({ status: 'ready', fileName: '원내약품목록.xlsx' });
  });
});

// ── Local Context · 저장 경계 ─────────────────────────────────────────────

describe('Local Context & no full dataset persistence', () => {
  it('정규화 행은 메모리에만 — 저장 레코드에는 handle · 파일명 · metadata 만 있다', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A_UPDATED, 5_000);
    const { session, saved, read } = makeSession({ pick: [handle] });
    await session.init();
    await session.connect();
    for (const rec of saved) {
      expect(Object.keys(rec).sort()).toEqual(['connectedAt', 'fileName', 'handle', 'lastModified', 'size']);
      expect(JSON.stringify({ ...rec, handle: undefined })).not.toContain('타이레놀');
    }
    expect(saved.at(-1)).toMatchObject({ lastModified: 5_000, size: new Blob([CSV_A_UPDATED]).size });
    // mapping 캐시는 구조(inference)뿐 — 행 값이 아닌 열 대응만 담는다.
    const mapping = read.getStored();
    expect(mapping?.targetSchemaId).toBe(HOSPITAL_DRUG_TARGET_SCHEMA.id);
    expect(JSON.stringify(mapping?.inference)).not.toContain('무코스타정');
  });

  it('조회 직전 ensureFresh 는 메모리 Local Context 행을 돌려준다', async () => {
    const handle = new FakeFileHandle('원내약품목록.xlsx', CSV_A_UPDATED);
    const { session } = makeSession({ pick: [handle] });
    await session.init();
    await session.connect();
    const rows = (await session.ensureFresh()) as LoadedDrugFile['rows'];
    expect(rows.find((r) => r.ingredient === '아세트아미노펜')?.product_name).toBe('타이레놀정500mg');
  });

  it('readDrugFile 은 서버에 profile 만 넘긴다(전체 행 없음)', async () => {
    const { deps, inferStructure } = memoryReadDeps();
    const many = '제품명,성분\n' + Array.from({ length: 200 }, (_, i) => `약품${i},성분${i}`).join('\n');
    const loaded = await readDrugFile(csvFile('big.csv', many), deps);
    expect(loaded.rows).toHaveLength(200);
    const sent = inferStructure.mock.calls[0][0];
    expect(sent.sheets[0].sampleRows.length).toBeLessThanOrEqual(20);
    expect(JSON.stringify(sent)).not.toContain('약품199');
  });
});
