import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Page from "./CooperativeBusinessOperator";
const shared = vi.hoisted(() => ({
  configure: vi.fn(),
  operator: vi.fn(),
  editor: vi.fn(),
}));
vi.mock("@o4o/operator-core-ui/modules/pharmacy-management", () => ({
  configurePharmacyManagementClient: shared.configure,
  OperatorSemiFranchisePage: (props: unknown) => {
    shared.operator(props);
    return <div>Shared operator</div>;
  },
  SemiFranchiseContentFormPage: (props: unknown) => {
    shared.editor(props);
    return <div>Shared editor</div>;
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const client = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
it("reuses the scoped supply, own-content and supplier-approval operator workflows for each cooperative", () => {
  render(
    <MemoryRouter>
      <Page businessKey="business-a" slug="coop-a" client={client} />
    </MemoryRouter>,
  );
  expect(screen.getByText("Shared operator")).toBeTruthy();
  expect(shared.configure).toHaveBeenCalledWith(client);
  const props = shared.operator.mock.calls.at(-1)![0] as {
    businessKey: string;
    tabs: string[];
    contentEditHref: (key: string, id?: string) => string;
  };
  expect(props.businessKey).toBe("business-a");
  expect(props.tabs).toEqual(["proposals", "contents", "content-submissions"]);
  expect(props.contentEditHref("business-a")).toBe(
    "/coop-a/operator/contents/new",
  );
  expect(props.contentEditHref("business-a", "content-a")).toBe(
    "/coop-a/operator/contents/content-a/edit",
  );
});
it("keeps own authoring inside the cooperative URL with an explicit backend business binding", () => {
  render(
    <MemoryRouter>
      <Page businessKey="business-b" slug="coop-b" client={client} editor />
    </MemoryRouter>,
  );
  expect(screen.getByText("Shared editor")).toBeTruthy();
  expect(shared.editor).toHaveBeenCalledWith({
    businessKey: "business-b",
    returnPath: "/coop-b/operator?tab=contents",
  });
});
