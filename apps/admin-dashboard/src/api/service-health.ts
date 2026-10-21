import { z } from "zod";
import { authClient } from "@o4o/auth-client";
const check = z.object({
  name: z.string(),
  state: z.enum(["passed", "failed", "unknown"]),
  detail: z.string(),
});
const row = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  checkedAt: z.string().datetime(),
  checks: z.array(check).min(1),
});
const schema = z
  .object({
    checkedAt: z.string().datetime(),
    cacheSeconds: z.number().positive(),
    cached: z.boolean(),
    scope: z.string(),
    infrastructure: z.array(check).min(1),
    services: z.array(row).min(1),
  })
  .superRefine((v, ctx) => {
    if (
      new Set(v.services.map((x) => x.id)).size !== v.services.length ||
      v.services.some((x) => new URL(x.url).protocol !== "https:")
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid service health response",
      });
  });
export type ServiceHealth = z.infer<typeof schema>;
export async function getServiceHealth(): Promise<ServiceHealth> {
  const response = await authClient.api.get("/platform/hub/summary");
  if (response.data?.success !== true)
    throw new Error("서비스 상태 조회에 실패했습니다.");
  return schema.parse(response.data.data);
}
