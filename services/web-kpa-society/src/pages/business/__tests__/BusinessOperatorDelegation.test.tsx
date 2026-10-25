import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PharmacyOperatorPage } from "../PharmacyOperatorPages";
const state = vi.hoisted(() => ({
  business: "pharmacy",
  roles: [] as string[],
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../../config/businessSite", () => ({
  BUSINESS_SITE: {
    get key() {
      return state.business;
    },
  },
}));
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "actor", roles: state.roles } }),
  authClient: {
    api: { get: state.get, post: state.post, delete: state.delete },
  },
}));
vi.mock("@o4o/operator-core-ui/modules/pharmacy-management", () => ({
  OperatorSemiFranchisePage: () => null,
  SemiFranchiseContentFormPage: () => null,
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.get.mockResolvedValue({
    data: {
      data: {
        operators: [],
        candidates: [],
        truncated: false,
        role: "operator",
      },
    },
  });
});
afterEach(cleanup);
it.each(["pharmacy", "megapharm"])(
  "%s admin reaches its own designation API inside its business page",
  async (business) => {
    state.business = business;
    state.roles = [`neture:${business}_admin`];
    render(<MemoryRouter><PharmacyOperatorPage /></MemoryRouter>);
    await screen.findByText("지정된 Operator가 없습니다.");
    expect(state.get).toHaveBeenCalledWith(
      `/service-operator-management/${business}`,
    );
  },
);
it.each(["neture:pharmacy_operator", "neture:megapharm_admin", "neture:admin"])(
  "%s does not expose pharmacy role delegation",
  (role) => {
    state.business = "pharmacy";
    state.roles = [role];
    render(<MemoryRouter><PharmacyOperatorPage /></MemoryRouter>);
    expect(screen.queryByText("운영자 지정 · 해제")).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
  },
);
