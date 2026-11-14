import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ExternalAiConnectionsCard from "./ExternalAiConnectionsCard";
import {
  listExternalConnections,
  revokeExternalConnection,
} from "../../api/externalAi";
vi.mock("../../api/externalAi", () => ({
  listExternalConnections: vi.fn(),
  revokeExternalConnection: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listExternalConnections).mockResolvedValue([
    {
      id: "connection-a",
      clientName: "Fixture AI",
      workspaceNames: ["공급자 A"],
      scopes: ["o4o:read"],
      expiresAt: "2026-11-01T00:00:00Z",
    },
  ]);
});
afterEach(cleanup);
describe("external AI connection card", () => {
  it("shows workspace names and revokes without deleting content", async () => {
    vi.mocked(revokeExternalConnection).mockResolvedValue();
    render(<ExternalAiConnectionsCard />);
    await screen.findByText("공급자 A");
    fireEvent.click(screen.getByText("연결 해제"));
    await screen.findByText(/저장된 콘텐츠는 유지됩니다/);
    expect(revokeExternalConnection).toHaveBeenCalledWith("connection-a");
    expect(screen.queryByText("Fixture AI")).toBeNull();
  });
  it("does not claim revocation on failure", async () => {
    vi.mocked(revokeExternalConnection).mockRejectedValue(new Error("offline"));
    render(<ExternalAiConnectionsCard />);
    await screen.findByText("공급자 A");
    fireEvent.click(screen.getByText("연결 해제"));
    await screen.findByText(/연결을 해제하지 못했습니다/);
    expect(screen.getByText("공급자 A")).toBeTruthy();
  });
});
it("shows the ChatGPT guide when disconnected without claiming an installed app is connected", async () => {
  vi.mocked(listExternalConnections).mockResolvedValue([]);
  render(<ExternalAiConnectionsCard />);
  await screen.findByText("연결된 외부 AI가 없습니다.");
  fireEvent.click(screen.getByText("ChatGPT에서 O4O 작업하기"));
  expect(screen.getByText(/O4O 서비스 연결/)).toBeTruthy();
  expect(
    screen.getByText(/앱 설치 여부나 지금 ChatGPT에서 사용할 수 있는지는/),
  ).toBeTruthy();
  expect(screen.queryByText("연결 해제")).toBeNull();
});
it("keeps connection guidance available after a list failure and recovers through retry", async () => {
  vi.mocked(listExternalConnections)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue([]);
  render(<ExternalAiConnectionsCard />);
  await screen.findByText(/외부 AI 연결을 확인하지 못했습니다/);
  expect(screen.getByText("ChatGPT에서 O4O 작업하기")).toBeTruthy();
  fireEvent.click(screen.getByText("다시 확인"));
  await screen.findByText("연결된 외부 AI가 없습니다.");
  expect(screen.queryByText(/외부 AI 연결을 확인하지 못했습니다/)).toBeNull();
});
