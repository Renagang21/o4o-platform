/**
 * 원내 약품 파일 연결 세션 — 직접 선택한 파일 하나의 연결·재접속·권한·변경 감지
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE §2·§6·§7·§13
 *
 *   최초:    [원내 약품 파일 연결] → showOpenFilePicker → 파일 하나 → handle 을 IndexedDB 에 저장 → 읽기.
 *   재접속:  저장된 handle 로 권한 확인 → granted 면 자동 읽기, 아니면 [읽기 허용] 한 번(파일 재선택 아님).
 *   덮어쓰기: 같은 handle 의 lastModified/size 가 바뀌면 자동 재읽기(구조가 같으면 mapping 재사용).
 *   다른 파일: [파일 변경] → 사용자가 새 파일을 직접 고른다. 폴더·최신 파일 자동 탐색은 없다.
 *
 * React 와 분리해 두어 외부 의존(파일 선택 창 · IndexedDB · 권한 · 파일 읽기)을 주입해 검증한다.
 * 정규화된 행은 이 세션 메모리에만 있다 — 저장소에는 handle · 파일명 · 최소 metadata 만 쓴다(§5·§11).
 */
import type { StoredDrugFile } from './drugFileStore';
import {
  DrugFileError,
  UNSUPPORTED_FILE_MESSAGE,
  hasFileChanged,
  isSupportedDrugFileName,
  type LoadedDrugFile,
  type ReadPermission,
} from './localDrugFile';

export type LocalDrugStatus =
  | 'checking'
  | 'unsupported' // File System Access 없음 — Chrome/Edge 필요
  | 'unconnected' // 파일 미연결(최초)
  | 'needs-permission' // 연결됐지만 이번 접속에서 읽기 허용 필요(클릭 1회)
  | 'unreadable' // 연결한 파일을 열 수 없음(이동·삭제·권한 거부) — 다른 파일 선택 안내
  | 'loading'
  | 'ready'
  | 'error';

export interface DrugFileSessionState {
  status: LocalDrugStatus;
  /** 연결된 실제 파일명(읽기 전에도 저장된 이름을 보여준다). */
  fileName: string | null;
  file: LoadedDrugFile | null;
  error: string | null;
}

export interface DrugFileSessionDeps {
  supportsFilePicker: () => boolean;
  pickFile: () => Promise<FileSystemFileHandle | null>;
  loadStored: () => Promise<StoredDrugFile | null>;
  saveStored: (record: StoredDrugFile) => Promise<boolean>;
  clearLegacyFolder: () => Promise<void>;
  queryPermission: (h: FileSystemFileHandle) => Promise<ReadPermission>;
  requestPermission: (h: FileSystemFileHandle) => Promise<ReadPermission>;
  /** 실제 파일을 연다 — 이동·삭제 등으로 열 수 없으면 throw. */
  getFile: (h: FileSystemFileHandle) => Promise<File>;
  readDrugFile: (f: File) => Promise<LoadedDrugFile>;
}

const INITIAL: DrugFileSessionState = { status: 'checking', fileName: null, file: null, error: null };

export class DrugFileSession {
  private state: DrugFileSessionState = INITIAL;
  private handle: FileSystemFileHandle | null = null;
  private connectedAt = '';
  private inflight: Promise<LoadedDrugFile['rows'] | null> | null = null;

  constructor(
    private readonly deps: DrugFileSessionDeps,
    private readonly onChange: (s: DrugFileSessionState) => void,
  ) {}

  getState(): DrugFileSessionState {
    return this.state;
  }

  private set(patch: Partial<DrugFileSessionState>): void {
    this.state = { ...this.state, ...patch };
    this.onChange(this.state);
  }

  /** 최초 진입 — 저장된 파일이 있으면 권한 확인 후 바로 읽는다. */
  async init(): Promise<void> {
    if (!this.deps.supportsFilePicker()) {
      this.set({ status: 'unsupported' });
      return;
    }
    // 폐기된 폴더 연결 방식의 handle 은 읽지 않고 지운다(§12).
    await this.deps.clearLegacyFolder();
    const stored = await this.deps.loadStored();
    if (!stored?.handle) {
      this.set({ status: 'unconnected' });
      return;
    }
    this.handle = stored.handle;
    this.connectedAt = stored.connectedAt;
    this.set({ fileName: stored.fileName || stored.handle.name });
    if ((await this.deps.queryPermission(stored.handle)) === 'granted') await this.read(true);
    else this.set({ status: 'needs-permission' });
  }

  /** 최초 연결 / [파일 변경] — 사용자 클릭 안에서만 호출한다. */
  async connect(): Promise<void> {
    const handle = await this.deps.pickFile();
    if (!handle) return; // 취소 — 기존 연결 유지
    if (!isSupportedDrugFileName(handle.name)) {
      this.set({ error: UNSUPPORTED_FILE_MESSAGE });
      return;
    }
    if (this.inflight) await this.inflight.catch(() => null);
    this.handle = handle;
    this.connectedAt = new Date().toISOString();
    this.set({ fileName: handle.name, file: null, error: null });
    await this.deps.saveStored({ handle, fileName: handle.name, lastModified: null, size: null, connectedAt: this.connectedAt });
    await this.read(true);
  }

  /** 이번 접속에서 읽기 허용 — 사용자 클릭 안에서만 호출한다. */
  async allowAccess(): Promise<void> {
    const handle = this.handle;
    if (!handle) return;
    if ((await this.deps.requestPermission(handle)) === 'granted') await this.read(true);
    else this.set({ status: 'needs-permission', error: '원내 약품 파일 읽기가 허용되지 않았습니다. 다시 눌러 허용해 주세요.' });
  }

  /** 파일이 바뀌었으면 다시 읽고 현재 행을 돌려준다(조회 직전). */
  ensureFresh(): Promise<LoadedDrugFile['rows'] | null> {
    return this.read(false);
  }

  /** 강제로 다시 읽기(mapping 은 fingerprint 가 같으면 재사용). */
  async reload(): Promise<void> {
    await this.read(true);
  }

  /** 화면 복귀 시 — 연결된 파일이 있고 읽을 수 있는 상태면 변경 감지. */
  onVisible(): void {
    const s = this.state.status;
    if (this.handle && (s === 'ready' || s === 'error' || s === 'unreadable')) void this.read(false);
  }

  /** 실제 파일을 열고, 바뀌었으면(또는 force) 다시 파싱한다. 동시 호출은 하나로 합친다. */
  private read(force: boolean): Promise<LoadedDrugFile['rows'] | null> {
    if (this.inflight) return this.inflight;
    const run = this.doRead(force).finally(() => { this.inflight = null; });
    this.inflight = run;
    return run;
  }

  private async doRead(force: boolean): Promise<LoadedDrugFile['rows'] | null> {
    const handle = this.handle;
    if (!handle) return null;
    const prev = this.state.file;
    const perm = await this.deps.queryPermission(handle);
    if (perm !== 'granted') {
      this.set({ status: 'needs-permission' });
      return prev?.rows ?? null;
    }
    let f: File;
    try {
      f = await this.deps.getFile(handle);
    } catch {
      this.set({ status: 'unreadable', file: null, error: null });
      return null;
    }
    if (!force && !hasFileChanged(prev, f)) return prev!.rows; // 변경 없음 — 메모리 Context 그대로
    if (!prev) this.set({ status: 'loading' });
    try {
      const loaded = await this.deps.readDrugFile(f);
      this.set({ status: 'ready', file: loaded, fileName: loaded.fileName, error: null });
      await this.deps.saveStored({
        handle,
        fileName: loaded.fileName,
        lastModified: loaded.lastModified,
        size: loaded.size,
        connectedAt: this.connectedAt,
      });
      return loaded.rows;
    } catch (e) {
      const message = e instanceof DrugFileError || e instanceof Error ? e.message : '원내 약품 파일을 읽지 못했습니다.';
      this.set(prev ? { error: message } : { status: 'error', error: message });
      return prev?.rows ?? null;
    }
  }
}
