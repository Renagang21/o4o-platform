/**
 * 원내 약품 파일 읽기 — 사용자가 직접 고른 실제 파일이 정본
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE §2·§3·§4·§9
 *
 *   showOpenFilePicker → FileSystemFileHandle → (브라우저) decode → StructureProfile → fingerprint
 *     → 같은 구조면 저장된 mapping 재사용, 아니면 서버 GFU 구조 추론(profile 만 전송)
 *     → (브라우저) 결정론적 정규화 → HospitalDrugRecord[] (메모리 Local Context)
 *
 * decode·profile·fingerprint·normalize 는 공용 @o4o/file-understanding-core — 서버와 **같은 구현**이다.
 * 병원 특화 파서·헤더 alias 는 없다. 전체 파일·전체 행은 서버로 가지 않는다(§16).
 * 파일명은 고정하지 않는다. 폴더 탐색·최신 파일 탐색·복수 파일 선택은 하지 않는다(§8·§23).
 */
import {
  decodeWorkbook,
  profileWorkbook,
  computeStructureFingerprint,
  normalizeRows,
  evaluateConfidence,
  buildFileConfidenceQuestion,
  type FileStructureInference,
  type StructureProfile,
} from '@o4o/file-understanding-core';
import {
  HOSPITAL_DRUG_TARGET_SCHEMA,
  normalizedRecordsToHospitalRows,
  type HospitalDrugRecord,
} from '@o4o/hospital-pharmacy-core';
import { requestFileStructure } from './aiRequest';
import { loadMapping, saveMapping, type StoredMapping } from './drugFileStore';

/** V1 공식 지원 형식 — Generic File Understanding decode 범위와 같다(§3). */
export const SUPPORTED_DRUG_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;

/** 파일 선택 창 옵션 — Excel 중심으로 보이되 CSV 도 허용. 한 개만 고른다(§2·§23). */
export const DRUG_FILE_PICKER_OPTIONS = {
  id: 'o4o-hospital-drug-file',
  startIn: 'downloads',
  multiple: false,
  excludeAcceptAllOption: true,
  types: [
    {
      description: '원내 약품 목록 (Excel · CSV)',
      accept: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls'],
        'text/csv': ['.csv'],
      },
    },
  ],
} as const;

export function isSupportedDrugFileName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return SUPPORTED_DRUG_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const UNSUPPORTED_FILE_MESSAGE = '원내 약품 파일은 Excel(.xlsx · .xls) 또는 CSV(.csv) 파일이어야 합니다.';

// File System Access 권한 API 는 TS DOM lib 에 아직 없다 — 쓰는 부분만 최소 선언한다.
export type ReadPermission = 'granted' | 'denied' | 'prompt';
interface PermissionCapableHandle {
  queryPermission?: (d: { mode: 'read' }) => Promise<ReadPermission>;
  requestPermission?: (d: { mode: 'read' }) => Promise<ReadPermission>;
}

export async function queryReadPermission(handle: FileSystemHandle): Promise<ReadPermission> {
  const h = handle as FileSystemHandle & PermissionCapableHandle;
  if (!h.queryPermission) return 'granted';
  try {
    return await h.queryPermission({ mode: 'read' });
  } catch {
    return 'prompt';
  }
}

/** 사용자 클릭(user activation) 안에서만 호출한다 — 브라우저 권한 창을 띄운다. */
export async function requestReadPermission(handle: FileSystemHandle): Promise<ReadPermission> {
  const h = handle as FileSystemHandle & PermissionCapableHandle;
  if (!h.requestPermission) return 'granted';
  try {
    return await h.requestPermission({ mode: 'read' });
  } catch {
    return 'denied';
  }
}

type OpenFilePicker = (o: typeof DRUG_FILE_PICKER_OPTIONS) => Promise<FileSystemFileHandle[]>;

/** 파일 선택 창(사용자 클릭 안에서만). 취소하면 null. */
export async function pickDrugFile(): Promise<FileSystemFileHandle | null> {
  const picker = (window as Window & { showOpenFilePicker?: OpenFilePicker }).showOpenFilePicker;
  if (!picker) return null;
  try {
    const [handle] = await picker(DRUG_FILE_PICKER_OPTIONS);
    return handle ?? null;
  } catch {
    return null; // AbortError(사용자 취소) 포함
  }
}

export interface LoadedDrugFile {
  /** 사용자가 고른 실제 파일명. */
  fileName: string;
  lastModified: number;
  size: number;
  rows: HospitalDrugRecord[];
  totalRows: number;
  skipped: number;
  fingerprint: string;
  /** 저장된 mapping 을 재사용했는가(같은 구조 → AI 재호출 없음). */
  mappingReused: boolean;
  /** 낮은 신뢰도 열이 있으면 사용자에게 보여줄 확인 문구. */
  question: string | null;
}

/** 같은 파일이 덮어써졌는가 — lastModified/size 가 하나라도 바뀌면 다시 읽는다(§7). */
export function hasFileChanged(prev: Pick<LoadedDrugFile, 'lastModified' | 'size'> | null, next: { lastModified: number; size: number }): boolean {
  return !prev || prev.lastModified !== next.lastModified || prev.size !== next.size;
}

export class DrugFileError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'DrugFileError';
  }
}

/** 읽기 파이프라인의 외부 의존 — 테스트에서 IndexedDB·서버 AI 를 대체한다. */
export interface ReadDrugFileDeps {
  loadMapping: () => Promise<StoredMapping | null>;
  saveMapping: (m: StoredMapping) => Promise<boolean>;
  inferStructure: (profile: StructureProfile) => Promise<{ inference: FileStructureInference; model: string }>;
}

const defaultReadDeps: ReadDrugFileDeps = {
  loadMapping,
  saveMapping,
  inferStructure: (profile) => requestFileStructure(profile, HOSPITAL_DRUG_TARGET_SCHEMA),
};

async function inferAndCache(deps: ReadDrugFileDeps, profile: StructureProfile, fingerprint: string): Promise<FileStructureInference> {
  const { inference, model } = await deps.inferStructure(profile);
  await deps.saveMapping({
    fingerprint,
    targetSchemaId: HOSPITAL_DRUG_TARGET_SCHEMA.id,
    inference,
    model,
    createdAt: new Date().toISOString(),
  });
  return inference;
}

/** 실제 파일 → 정규화된 원내 약품 행(메모리). */
export async function readDrugFile(file: File, deps: ReadDrugFileDeps = defaultReadDeps): Promise<LoadedDrugFile> {
  let decoded;
  try {
    decoded = decodeWorkbook(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new DrugFileError(`${file.name} 파일을 열지 못했습니다. 엑셀에서 열려 있지 않은지, 손상되지 않았는지 확인해 주세요.`, 'FILE_DECODE_FAILED');
  }
  const profile = profileWorkbook(decoded);
  const fingerprint = computeStructureFingerprint(profile);

  const cached = await deps.loadMapping();
  const reusable = cached && cached.fingerprint === fingerprint && cached.targetSchemaId === HOSPITAL_DRUG_TARGET_SCHEMA.id;
  let inference = reusable ? cached.inference : await inferAndCache(deps, profile, fingerprint);
  let mappingReused = Boolean(reusable);

  let normalized = normalizeRows(decoded, inference, HOSPITAL_DRUG_TARGET_SCHEMA);
  let converted = normalizedRecordsToHospitalRows(normalized.records);
  if (converted.rows.length === 0 && mappingReused) {
    // 캐시된 구조로 0건이면 한 번만 새로 이해한다(구조 시그니처가 같아도 내용 배치가 바뀐 경우 방어).
    inference = await inferAndCache(deps, profile, fingerprint);
    mappingReused = false;
    normalized = normalizeRows(decoded, inference, HOSPITAL_DRUG_TARGET_SCHEMA);
    converted = normalizedRecordsToHospitalRows(normalized.records);
  }
  if (converted.rows.length === 0) {
    throw new DrugFileError('이 파일에서 원내 약품 행을 찾지 못했습니다. 제품명 열이 있는 목록인지 확인해 주세요.', 'NO_ROWS');
  }

  const verdict = evaluateConfidence(inference, HOSPITAL_DRUG_TARGET_SCHEMA);
  return {
    fileName: file.name,
    lastModified: file.lastModified,
    size: file.size,
    rows: converted.rows,
    totalRows: normalized.totalRows,
    skipped: normalized.skipped + converted.skipped,
    fingerprint,
    mappingReused,
    question: buildFileConfidenceQuestion(verdict, HOSPITAL_DRUG_TARGET_SCHEMA),
  };
}
