import { z } from "zod";

export const scopes = ["o4o:read", "o4o:draft:write"] as const;
export const targetKinds = [
  "supplier",
  "store",
  "organization",
  "community",
] as const;
export const settingsSchema = z
  .object({
    enabled: z.boolean(),
    chatgptEnabled: z.boolean(),
    targets: z
      .object({
        supplier: z.object({ read: z.boolean(), write: z.boolean() }).strict(),
        store: z.object({ read: z.boolean(), write: z.boolean() }).strict(),
        organization: z
          .object({ read: z.boolean(), write: z.boolean() })
          .strict(),
        community: z.object({ read: z.boolean(), write: z.boolean() }).strict(),
      })
      .strict(),
    examples: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().trim().min(1).max(100),
            purpose: z.enum(["product_description", "general_content"]),
            prompt: z.string().trim().min(1).max(10000),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export type ExternalAiSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: ExternalAiSettings = {
  enabled: false,
  chatgptEnabled: false,
  targets: Object.fromEntries(
    targetKinds.map((k) => [k, { read: false, write: false }]),
  ) as ExternalAiSettings["targets"],
  examples: [],
};
export interface Workspace {
  id: string;
  name: string;
  kind: "supplier";
  writable: boolean;
}
export interface Connection {
  id: string;
  userId: string;
  clientId: string;
  workspaces: string[];
  scopes: string[];
  expiresAt: Date;
}
export class ExternalAiError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const destinationSchema = z.enum([
  "library_document",
  "store_description",
]);
export const workspaceInput = z
  .object({
    workspaceId: z
      .string()
      .uuid()
      .describe("list_workspaces에서 선택한 작업공간 id"),
  })
  .strict();
const pagination = {
  query: z.string().trim().max(150).default(""),
  page: z.number().int().min(1).max(10000).default(1),
  limit: z.number().int().min(1).max(50).default(20),
};
export const searchInput = workspaceInput.extend(pagination).strict();
export const productInput = workspaceInput
  .extend({
    productId: z
      .string()
      .uuid()
      .describe("search_products의 productId. masterId가 아닙니다."),
  })
  .strict();
export const materialInput = workspaceInput
  .extend({ materialId: z.string().uuid() })
  .strict();
export const contentInput = workspaceInput
  .extend({ destination: destinationSchema, contentId: z.string().uuid() })
  .strict();
const body = {
  content: z
    .string()
    .trim()
    .min(1)
    .max(200000)
    .describe("기존 편집기에 저장할 HTML 또는 텍스트 본문"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "자료함 문서 생성 시 필수. 상품 설명서의 제목은 기존 상품명을 사용합니다.",
    ),
  language: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
  requestId: z
    .string()
    .uuid()
    .describe("저장 작업마다 새 UUID. 동일한 내용의 실패 재시도에만 재사용"),
};
export const saveInput = workspaceInput
  .extend({
    ...body,
    destination: destinationSchema,
    productId: z.string().uuid().optional(),
  })
  .strict();
export const updateInput = contentInput
  .extend({ ...body, expectedRevision: z.string().min(1).max(100) })
  .omit({ language: true })
  .strict();
export const toolSchemas = {
  list_workspaces: z.object({}).strict(),
  search_products: searchInput,
  get_product_context: productInput,
  list_materials: searchInput,
  get_material: materialInput,
  save_content_draft: saveInput,
  update_content_draft: updateInput,
  get_content_draft: contentInput,
};
export type ToolName = keyof typeof toolSchemas;
export const writeTools = new Set<ToolName>([
  "save_content_draft",
  "update_content_draft",
]);
