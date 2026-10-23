import { unifiedApi } from "./unified-client";

export interface ExternalAiSettings {
  enabled: boolean;
  chatgptEnabled: boolean;
  targets: Record<
    "supplier" | "store" | "organization" | "community",
    { read: boolean; write: boolean }
  >;
  examples: Array<{
    id: string;
    name: string;
    purpose: "product_description" | "general_content";
    prompt: string;
  }>;
}
export interface ExternalAiSnapshot {
  revision: number;
  settings: ExternalAiSettings;
  configured: boolean;
  mcpUrl: string | null;
  adapters: Array<{
    kind: keyof ExternalAiSettings["targets"];
    ready: boolean;
  }>;
  errors: Array<{ tool: string; code: string; createdAt: string }>;
}
export async function getExternalAi() {
  const response = await unifiedApi.raw.get("/ai/admin/external-connections");
  if (!response.data?.success)
    throw new Error("외부 AI 연결 설정을 불러오지 못했습니다.");
  return response.data.data as ExternalAiSnapshot;
}
export async function saveExternalAi(
  revision: number,
  settings: ExternalAiSettings,
) {
  const response = await unifiedApi.raw.put("/ai/admin/external-connections", {
    revision,
    settings,
  });
  if (!response.data?.success) throw new Error("설정을 저장하지 못했습니다.");
}
