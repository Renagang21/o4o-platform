import type { LocalAgentHealth } from "../api/localAgent";
export interface PcRelease {
  format: "o4o-pc-release-v1";
  releaseId: string;
  sourceSha: string;
  version: string;
  nodeVersion: string;
  dataSchemaVersion: number;
  filename: string;
  sha256: string;
  bytes: number;
  setup?: { filename: string; sha256: string; bytes: number };
}
export const PC_RELEASE_BASE = "/downloads/pc-connection/";
export function validatePcRelease(value: unknown): PcRelease {
  const r = value as Partial<PcRelease> | null;
  if (
    !r ||
    [
      "releaseId",
      "sourceSha",
      "version",
      "nodeVersion",
      "filename",
      "sha256",
    ].some((key) => typeof (r as Record<string, unknown>)[key] !== "string") ||
    r.format !== "o4o-pc-release-v1" ||
    !/^[a-f0-9]{64}$/.test(r.releaseId ?? "") ||
    !/^[a-f0-9]{40}$/.test(r.sourceSha ?? "") ||
    !/^\d+\.\d+\.\d+$/.test(r.version ?? "") ||
    r.nodeVersion !== "22.18.0" ||
    !Number.isInteger(r.dataSchemaVersion) ||
    r.dataSchemaVersion! < 1 ||
    !/^o4o-pc-connection-[a-f0-9]{12}-[a-f0-9]{12}\.zip$/.test(
      r.filename ?? "",
    ) ||
    !/^[a-f0-9]{64}$/.test(r.sha256 ?? "") ||
    !Number.isSafeInteger(r.bytes) ||
    r.bytes! <= 0 ||
    r.bytes! > 150 * 1024 * 1024
  )
    throw new Error("PC 설치 자료를 확인하지 못했습니다.");
  if (
    r.filename !==
    `o4o-pc-connection-${r.sourceSha!.slice(0, 12)}-${r.releaseId!.slice(0, 12)}.zip`
  )
    throw new Error("PC 설치 자료의 버전을 확인하지 못했습니다.");
  if (
    r.setup !== undefined &&
    (!r.setup ||
      typeof r.setup !== "object" ||
      typeof r.setup.filename !== "string" ||
      typeof r.setup.sha256 !== "string" ||
      r.setup.filename !== r.filename!.replace(".zip", "-setup.cmd") ||
      !/^[a-f0-9]{64}$/.test(r.setup.sha256 ?? "") ||
      !Number.isSafeInteger(r.setup.bytes) ||
      r.setup.bytes <= 0 ||
      r.setup.bytes >= 32 * 1024 * 1024)
  )
    throw new Error("설치 파일을 확인하지 못했습니다.");
  return r as PcRelease;
}
export function pcReleaseStatus(
  release: PcRelease,
  health: LocalAgentHealth | null,
): "unknown" | "update" | "data_error" | "current" {
  if (!health) return "unknown";
  if (
    health.releaseId !== release.releaseId ||
    health.agentVersion !== release.version
  )
    return "update";
  return health.localData?.ready === true &&
    health.localData.schemaVersion === release.dataSchemaVersion
    ? "current"
    : "data_error";
}
export async function downloadPcRelease(
  release: PcRelease,
  signal: AbortSignal,
  onProgress?: (received: number, total: number) => void,
): Promise<Blob> {
  const artifact = release.setup ?? release;
  const response = await fetch(PC_RELEASE_BASE + artifact.filename, {
    credentials: "omit",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("설치 파일을 내려받지 못했습니다.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("이 브라우저에서 파일을 확인할 수 없습니다.");
  onProgress?.(0, artifact.bytes);
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > artifact.bytes)
        throw new Error("설치 파일 크기 검증에 실패했습니다.");
      parts.push(chunk.value);
      onProgress?.(length, artifact.bytes);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (length !== artifact.bytes)
    throw new Error("설치 파일을 끝까지 받지 못했습니다.");
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== artifact.sha256)
    throw new Error("설치 파일 검증에 실패했습니다. 다시 내려받아 주세요.");
  return new Blob([bytes], {
    type: release.setup ? "application/octet-stream" : "application/zip",
  });
}
