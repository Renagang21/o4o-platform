import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { CooperationMemberSpace } from "./CooperationMemberSpace";
import { COOPERATION_MODELS } from "./models";

afterEach(cleanup);
it.each(["no-store", "pending", "active", "error"])(
  "routes support according to the selected pharmacy: %s",
  async (status) => {
    const client = {
      get: vi.fn(async (path: string) => {
        let data: any = {};
        if (path.endsWith("/businesses/carepharm"))
          data = { key: "carepharm", name: "검증 협업체" };
        else if (path.endsWith("/access"))
          data = {
            kind: "semi-franchise",
            businessKey: "carepharm",
            allowed: true,
            canManage: false,
          };
        else if (path.endsWith("/accessible-stores"))
          data = {
            stores:
              status === "no-store"
                ? []
                : [
                    {
                      organizationId: "store",
                      organizationName: "검증 약국",
                      memberRole: "owner",
                    },
                  ],
          };
        else if (path.endsWith("/store-access")) {
          if (status === "error") throw new Error("일시 조회 실패");
          data = {
            businessKey: "carepharm",
            organizationId: "store",
            allowed: status === "active",
            membershipStatus: status,
          };
        } else if (path.includes("/cooperation-workflows/"))
          data = {
            notices: [],
            activities: [],
            totals: { notices: 0, activities: 0 },
            pending: { notices: 0, applications: 0 },
            materials: { items: [], total: 0 },
            support: { items: [], total: 0 },
          };
        else data = { items: [], total: 0 };
        return { data: { data } };
      }),
      post: vi.fn(async () => ({})),
    };
    render(
      <MemoryRouter>
        <CooperationMemberSpace
          model={COOPERATION_MODELS.carepharm}
          client={client}
          accountId="member"
          onLogin={() => {}}
          onEnterStore={async () => "/"}
        />
      </MemoryRouter>,
    );
    if (status === "no-store")
      await screen.findByText("회원 업무를 이용할 약국을 선택해 주세요.");
    else if (status === "pending") await screen.findByText("승인 대기");
    else if (status === "error")
      await screen.findByText(
        "선택한 약국의 서비스 이용 상태를 확인하지 못했습니다.",
      );
    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: "지원", exact: true })
          .getAttribute("href"),
      ).toBe(
        status === "active" ? "/?store=store#cooperation-support" : "/contact",
      ),
    );
  },
);
