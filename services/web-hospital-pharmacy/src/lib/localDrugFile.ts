/**
 * 원내 약품 파일 읽기 — 실제 PC 의 hospital-drugs.xlsx 가 정본(§2·§5·§6·§8)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION
 *
 *   directory handle → hospital-drugs.xlsx → (브라우저) decode → StructureProfile → fingerprint
 *     → 같은 구조면 저장된 mapping 재사용, 아니면 서버 GFU 구조 추론(profile 만 전송)
 *     → (브라우저) 결정론적 정규화 → HospitalDrugRecord[] (메모리 Local Context)
 *
 * decode·profile·fingerprint·normalize 는 공용 @o4o/file-understanding-core — 서버와 **같은 구현**이다.
 * 병원 특화 파서·헤더 alias 는 없다. 전체 파일·전체 행은 서버로 가지 않는다(§18).
 * 파일명은 고정이다 — 자동 탐색·최신파일 탐색·복수파일 선택은 하지 않는다(§2).
 */
import {
  decodeWorkbook,
  profileWorkbook,
  computeStructureFingerprint,
  normalizeRows,
  evaluateConfidence,
  buildFileConfidenceQuestion,
  type FileStructureInference,
} from '@o4o/file-understanding-core';
import {
  HOSPITAL_DRUG_TARGET_SCHEMA,
  normalizedRecordsToHospitalRows,
  type HospitalDrugRecord,
} from '@o4o/hospital-pharmacy-core';
import { requestFileStructure } from './aiRequest';
import { loadMapping, saveMapping } from './folderStore';

/** V1 고정 파일명(§2). 약제부는 새 목록을 같은 이름으로 덮어쓴다. */
export const HOSPITAL_DRUG_FILE_NAME = 'hospital-drugs.xlsx';

// File System Access 권한 API 는 TS DOM lib 에 아직 없다 — 쓰는 부분만 최소 선언한다.
type ReadPermission = 'granted' | 'denied' | 'prompt';
interface PermissionCapableHandle {
  queryPermission?: (d: { mode: 'read' }) => Promise<ReadPermission>;
  requestPermission?: (d: { mode: 'read' }) => Promise<ReadPermission>;
}

export async function queryReadPermission(handle: FileSystemDirectoryHandle): Promise<ReadPermission> {
  const h = handle as FileSystemDirectoryHandle & PermissionCapableHandle;
  if (!h.queryPermission) return 'granted';
  try {
    return await h.queryPermission({ mode: 'read' });
  } catch {
    return 'prompt';
  }
}

/** 사용자 클릭(user activation) 안에서만 호출한다 — 브라우저 권한 창을 띄운다. */
export async function requestReadPermission(handle: FileSystemDirectoryHandle): Promise<ReadPermission> {
  const h = handle as FileSystemDirectoryHandle & PermissionCapableHandle;
  if (!h.requestPermission) return 'granted';
  try {
    return await h.requestPermission({ mode: 'read' });
  } catch {
    return 'denied';
  }
}

/** 폴더 선택 창(사용자 클릭 안에서만). 취소하면 null. */
export async function pickDrugFolder(): Promise<FileSystemDirectoryHandle | null> {
  const picker = (window as Window & {
    showDirectoryPicker?: (o: { id?: string; mode?: 'read' }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  if (!picker) return null;
  try {
    return await picker({ id: 'o4o-hospital-drugs', mode: 'read' });
  } catch {
    return null; // AbortError(사용자 취소) 포함
  }
}

/** 고정 파일명 파일을 연다. 없으면 null(이름이 바뀌었거나 삭제됨). */
export async function openDrugFile(folder: FileSystemDirectoryHandle): Promise<File | null> {
  try {
    const fh = await folder.getFileHandle(HOSPITAL_DRUG_FILE_NAME);
    return await fh.getFile();
  } catch {
    return null;
  }
}

export interface LoadedDrugFile {
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

export class DrugFileError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'DrugFileError';
  }
}

async function inferAndCache(
  profile: Parameters<typeof requestFileStructure>[0],
  fingerprint: string,
): Promise<FileStructureInference> {
  const { inference, model } = await requestFileStructure(profile, HOSPITAL_DRUG_TARGET_SCHEMA);
  await saveMapping({
    fingerprint,
    targetSchemaId: HOSPITAL_DRUG_TARGET_SCHEMA.id,
    inference,
    model,
    createdAt: new Date().toISOString(),
  });
  return inference;
}

/** 실제 파일 → 정규화된 원내 약품 행(메모리). */
export async function readDrugFile(file: File): Promise<LoadedDrugFile> {
  let decoded;
  try {
    decoded = decodeWorkbook(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new DrugFileError(`${HOSPITAL_DRUG_FILE_NAME} 파일을 열지 못했습니다. 엑셀에서 열려 있지 않은지, 손상되지 않았는지 확인해 주세요.`, 'FILE_DECODE_FAILED');
  }
  const profile = profileWorkbook(decoded);
  const fingerprint = computeStructureFingerprint(profile);

  const cached = await loadMapping();
  const reusable = cached && cached.fingerprint === fingerprint && cached.targetSchemaId === HOSPITAL_DRUG_TARGET_SCHEMA.id;
  let inference = reusable ? cached.inference : await inferAndCache(profile, fingerprint);
  let mappingReused = Boolean(reusable);

  let normalized = normalizeRows(decoded, inference, HOSPITAL_DRUG_TARGET_SCHEMA);
  let converted = normalizedRecordsToHospitalRows(normalized.records);
  if (converted.rows.length === 0 && mappingReused) {
    // 캐시된 구조로 0건이면 한 번만 새로 이해한다(구조 시그니처가 같아도 내용 배치가 바뀐 경우 방어).
    inference = await inferAndCache(profile, fingerprint);
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
