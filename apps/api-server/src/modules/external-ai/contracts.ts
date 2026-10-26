import { z } from "zod";
import {
  STORE_PRODUCT_CONTENT_LOCALES,
  STORE_PRODUCT_TARGET_KINDS,
} from "../../services/store/store-product-content.service.js";

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
  kind: (typeof targetKinds)[number];
  destinations?: string[];
  products?: boolean;
  productContentTools?: string[];
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
  "store_document",
  "business_content",
  "community_post",
]);
export const workspaceIdSchema = z.union([
  z.string().uuid(),
  z
    .string()
    .regex(
      /^(store|organization|community):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    ),
]);
export const workspaceInput = z
  .object({
    workspaceId: workspaceIdSchema.describe(
      "list_workspaces에서 선택한 작업공간 id",
    ),
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
      .describe(
        "search_products의 productId. 작업공간에서 반환한 식별자를 그대로 사용합니다.",
      ),
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
export const productContentInput = workspaceInput
  .extend({
    contentId: z
      .string()
      .uuid()
      .describe("상품별 콘텐츠 페이지의 id. groupId와 다릅니다."),
  })
  .strict();
export const saveProductContentInput = workspaceInput
  .extend({
    productId: productInput.shape.productId,
    productSource: z
      .enum(STORE_PRODUCT_TARGET_KINDS)
      .describe("search_products가 반환한 source(local/listing)"),
    language: z.enum(STORE_PRODUCT_CONTENT_LOCALES).default("ko"),
    contentKey: z.string().trim().min(1).max(80).default("default"),
    title: body.title.unwrap(),
    content: body.content,
    requestId: body.requestId,
  })
  .strict();
export const updateProductContentInput = productContentInput
  .extend({
    title: body.title.unwrap(),
    content: body.content,
    expectedRevision: z.string().min(1).max(100),
    requestId: body.requestId,
  })
  .strict();
export const productContentTools = new Set<string>([
  "get_product_content",
  "save_product_content_draft",
  "update_product_content_draft",
]);
export const toolSchemas = {
  list_workspaces: z.object({}).strict(),
  search_products: searchInput,
  get_product_context: productInput,
  list_materials: searchInput,
  get_material: materialInput,
  save_content_draft: saveInput,
  update_content_draft: updateInput,
  get_content_draft: contentInput,
  get_product_content: productContentInput,
  save_product_content_draft: saveProductContentInput,
  update_product_content_draft: updateProductContentInput,
};
export type ToolName = keyof typeof toolSchemas;
export const writeTools = new Set<ToolName>([
  "save_content_draft",
  "update_content_draft",
  "save_product_content_draft",
  "update_product_content_draft",
]);
