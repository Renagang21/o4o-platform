import { test, expect } from "@playwright/test";
test("external draft deep link resolves the selected store and opens the existing material editor", async ({
  page,
}) => {
  const storeId = "61bdc2d3-d864-4e0c-b04a-93c9a940e449";
  const id = "8c3dc260-fcde-43da-a646-3e788f380208";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("o4o_accessToken", "synthetic-browser-token"),
  );
  let loaded = false;
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname;
      const json = (data: unknown) =>
        route.fulfill({ json: { success: true, data } });
      if (path.endsWith("/auth/me"))
        return json({
          user: {
            id: "fixture-owner",
            email: "owner@example.invalid",
            name: "합성 약국",
            roles: [],
            memberships: [],
            status: "active",
            isActive: true,
          },
        });
      if (path.endsWith("/work-scope/accessible-stores"))
        return json({
          stores: [
            {
              organizationId: storeId,
              organizationName: "합성 약국 A",
              memberRole: "owner",
            },
            {
              organizationId: "other-store",
              organizationName: "합성 약국 B",
              memberRole: "owner",
            },
          ],
        });
      if (path.endsWith("/work-scope/store-services")) {
        expect(url.searchParams.get("organizationId")).toBe(storeId);
        return json({
          status: "resolved",
          organizationId: storeId,
          services: [
            {
              organizationId: storeId,
              serviceKey: "kpa-society",
              serviceName: "약국",
              enrollmentStatus: "active",
              workspaceMode: "standard",
              workspaceAvailable: true,
            },
          ],
          reason: null,
        });
      }
      if (path.endsWith(`/store/assets/${id}`)) {
        expect(route.request().headers()["x-store-organization-id"]).toBe(
          storeId,
        );
        loaded = true;
        return json({
          id,
          organizationId: storeId,
          title: "외부 AI가 만든 설명 초안",
          htmlContent:
            "<h2>상품 설명</h2><p>확인된 자료를 바탕으로 검토할 내용입니다.</p>",
          assetType: "content",
          usageType: null,
          sourceType: "generated",
          isActive: true,
          updatedAt: "2026-10-22T00:00:00Z",
        });
      }
      if (path.includes("policy-acceptances")) return json({ pending: [] });
      if (path.endsWith("/auth/google/config"))
        return json({ enabled: false, clientId: null });
      return json([]);
    },
  );
  await page.goto(`/external-ai/drafts/${id}?organizationId=${storeId}`);
  await expect(page).toHaveURL(
    new RegExp(`/store/library/production-materials/${id}/edit`),
  );
  await expect(
    page.getByRole("heading", { name: "제작 자료 편집", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('input[value="외부 AI가 만든 설명 초안"]'),
  ).toBeVisible();
  expect(loaded).toBe(true);
  expect(errors).toEqual([]);
});
