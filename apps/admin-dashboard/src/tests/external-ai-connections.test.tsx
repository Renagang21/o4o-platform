import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import ExternalAiConnections from "../pages/settings/external-ai/ExternalAiConnections";
import {
  getExternalAi,
  saveExternalAi,
  type ExternalAiSnapshot,
} from "../api/external-ai";
vi.mock("../api/external-ai", () => ({
  getExternalAi: vi.fn(),
  saveExternalAi: vi.fn(),
}));
const snapshot = (): ExternalAiSnapshot => ({
  revision: 1,
  configured: true,
  mcpUrl: "https://api.example.invalid/api/external-ai/mcp",
  settings: {
    enabled: false,
    chatgptEnabled: true,
    targets: {
      supplier: { read: true, write: true },
      store: { read: false, write: false },
      organization: { read: false, write: false },
      community: { read: false, write: false },
    },
    examples: [],
  },
  adapters: [
    { kind: "supplier", ready: true },
    { kind: "store", ready: true },
    { kind: "organization", ready: true },
    { kind: "community", ready: true },
  ],
  errors: [],
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getExternalAi).mockResolvedValue(snapshot());
  vi.mocked(saveExternalAi).mockResolvedValue();
});
describe("external AI management", () => {
  it("shows prepared targets and no external model/cost controls", async () => {
    render(<ExternalAiConnections />);
    await screen.findByLabelText("외부 AI 연결 사용");
    expect(screen.queryByText("연결 준비 중")).not.toBeInTheDocument();
    for (const name of ["공급자", "약국", "협력조직", "커뮤니티"])
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    expect(screen.queryByText("모델 선택")).not.toBeInTheDocument();
    expect(screen.queryByText("토큰 사용량")).not.toBeInTheDocument();
  });
  it("changes read/write together and saves the current revision", async () => {
    render(<ExternalAiConnections />);
    const read = await screen
      .findAllByLabelText("자료 조회")
      .then((inputs) => inputs[0]);
    fireEvent.click(read);
    expect(screen.getAllByLabelText("초안 저장·수정")[0]).not.toBeChecked();
    expect(screen.getAllByLabelText("초안 저장·수정")[0]).toBeDisabled();
    fireEvent.click(screen.getByText("설정 저장"));
    await waitFor(() =>
      expect(saveExternalAi).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          targets: expect.objectContaining({
            supplier: { read: false, write: false },
          }),
        }),
      ),
    );
  });
  it("supports example create/edit/delete without empty submissions", async () => {
    render(<ExternalAiConnections />);
    await screen.findByText("예제 추가");
    fireEvent.click(screen.getByText("예제 추가"));
    expect(screen.getByText("설정 저장")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("예제 이름"), {
      target: { value: "직원 안내" },
    });
    fireEvent.change(screen.getByLabelText("예제 요청문"), {
      target: { value: "확인된 정보로 안내문을 작성해 주세요." },
    });
    fireEvent.click(screen.getByText("설정 저장"));
    await waitFor(() =>
      expect(saveExternalAi).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          examples: [expect.objectContaining({ name: "직원 안내" })],
        }),
      ),
    );
    fireEvent.click(screen.getByText("예제 추가"));
    fireEvent.click(screen.getByText("이 예제 삭제"));
    expect(screen.queryByLabelText("예제 이름")).not.toBeInTheDocument();
  });
  it("keeps edits and reports save conflict/failure", async () => {
    vi.mocked(saveExternalAi).mockRejectedValue(new Error("conflict"));
    render(<ExternalAiConnections />);
    fireEvent.click(await screen.findByLabelText("외부 AI 연결 사용"));
    fireEvent.click(screen.getByText("설정 저장"));
    await screen.findByText(/저장하지 못했습니다/);
    expect(screen.getByLabelText("외부 AI 연결 사용")).toBeChecked();
  });
  it("requires server configuration and supports failed-load retry", async () => {
    vi.mocked(getExternalAi)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ...snapshot(), configured: false });
    render(<ExternalAiConnections />);
    await screen.findByText(/연결 설정을 불러오지 못했습니다/);
    fireEvent.click(screen.getByText("다시 불러오기"));
    expect(await screen.findByLabelText("외부 AI 연결 사용")).toBeDisabled();
    expect(
      within(
        screen.getByRole("region", { name: "외부 AI 연결 설정" }),
      ).getByText(/연결 서버 준비/),
    ).toBeInTheDocument();
  });
});
