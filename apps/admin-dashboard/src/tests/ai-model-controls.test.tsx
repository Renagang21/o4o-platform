import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { unifiedApi } from "../api/unified-client";
import {
  AiModelCatalog,
  ModelControlStatus,
  UsageModelSelection,
  useAiModelControls,
} from "../pages/settings/AiModelControls";
import type {
  AiModelControls,
  AiManagementSnapshot,
} from "../api/ai-management";
vi.mock("../api/unified-client", () => ({
  unifiedApi: {
    raw: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  },
}));
const api = vi.mocked(unifiedApi.raw);
let state: AiModelControls;
const reply = () => ({ data: { success: true, data: structuredClone(state) } });
const providers = [
  {
    id: "openai",
    name: "OpenAI",
    support: "텍스트·이미지",
    credential: "present",
    databaseRead: "read",
    models: [],
    modelSource: "code",
  },
  {
    id: "gemini",
    name: "Gemini",
    support: "텍스트",
    credential: "present",
    databaseRead: "read",
    models: [],
    modelSource: "code",
  },
] as AiManagementSnapshot["providers"];
function Page() {
  const control = useAiModelControls();
  return (
    <>
      <ModelControlStatus control={control} />
      <AiModelCatalog providers={providers} control={control} />
      <UsageModelSelection usageId="home.chat" control={control} />
    </>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  state = {
    revision: 0,
    models: [
      {
        provider: "gemini",
        id: "gemini-default",
        name: "기본 모델",
        capabilities: ["text", "image"],
      },
    ],
    selections: {},
    deleted: [],
    protectedModels: ["gemini:gemini-default"],
    targets: [
      {
        id: "home.chat",
        name: "홈 대화",
        providers: ["gemini", "openai"],
        capability: "text",
      },
    ],
    usageTargets: { "home.chat": "home.chat" },
  };
  api.get.mockImplementation(async () => reply());
  api.post.mockImplementation(async (_url, body: any) => {
    expect(body.revision).toBe(state.revision);
    state = {
      ...state,
      revision: state.revision + 1,
      models: [...state.models, body.model],
    };
    return reply();
  });
  api.put.mockImplementation(async (url: any, body: any) => {
    expect(body.revision).toBe(state.revision);
    if (url.includes("/model-selections/")) {
      const selections = body.selection ? { "home.chat": body.selection } : {};
      state = {
        ...state,
        revision: state.revision + 1,
        selections,
        protectedModels: [
          "gemini:gemini-default",
          ...Object.values(selections).map(
            (x: any) => x.provider + ":" + x.model,
          ),
        ],
      };
    } else {
      state = {
        ...state,
        revision: state.revision + 1,
        models: state.models.map((model) =>
          url.endsWith("/" + model.id) ? body.model : model,
        ),
      };
    }
    return reply();
  });
  api.delete.mockImplementation(async (_url, options: any) => {
    expect(options.data.revision).toBe(state.revision);
    state = {
      ...state,
      revision: state.revision + 1,
      models: state.models.filter((x) => x.provider !== "openai"),
      deleted: ["openai:gpt-new"],
    };
    return reply();
  });
});
it("registers, edits, selects and deletes only after releasing the selection; persists after remount", async () => {
  const view = render(<Page />);
  await screen.findByRole("button", { name: "gemini-default 수정" });
  const openai = screen
    .getByRole("heading", { name: "OpenAI" })
    .closest("article")!;
  fireEvent.click(within(openai).getByRole("button", { name: "모델 등록" }));
  let dialog = screen.getByRole("dialog", { name: "모델 등록" });
  fireEvent.change(within(dialog).getByLabelText("모델 ID"), {
    target: { value: "gpt-new" },
  });
  fireEvent.change(within(dialog).getByLabelText("표시 이름"), {
    target: { value: "합성 신규 모델" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(api.post).toHaveBeenCalledWith("/ai/admin/management/models", {
    revision: 0,
    model: {
      provider: "openai",
      id: "gpt-new",
      name: "합성 신규 모델",
      capabilities: ["text"],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "gpt-new 수정" }));
  dialog = screen.getByRole("dialog", { name: "모델 수정" });
  fireEvent.change(within(dialog).getByLabelText("표시 이름"), {
    target: { value: "합성 수정 모델" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.change(screen.getByLabelText("홈 대화 · 사용 모델"), {
    target: { value: "openai:gpt-new" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사용 모델 저장" }));
  await screen.findByText(/사용 모델을 저장했습니다/);
  expect(screen.getByRole("button", { name: "gpt-new 삭제" })).toBeDisabled();
  expect(api.put).toHaveBeenLastCalledWith(
    "/ai/admin/management/model-selections/home.chat",
    { revision: 2, selection: { provider: "openai", model: "gpt-new" } },
  );
  fireEvent.change(screen.getByLabelText("홈 대화 · 사용 모델"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사용 모델 저장" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "gpt-new 삭제" }),
    ).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "gpt-new 삭제" }));
  await screen.findByText("모델을 삭제했습니다.");
  view.unmount();
  render(<Page />);
  await screen.findByRole("button", { name: "gemini-default 수정" });
  expect(
    screen.queryByRole("button", { name: "gpt-new 수정" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "gemini-default 삭제" }),
  ).toBeDisabled();
});
it("allows only a label edit for a protected runtime model", async () => {
  render(<Page />);
  fireEvent.click(
    await screen.findByRole("button", { name: "gemini-default 수정" }),
  );
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByLabelText("모델 ID")).toBeDisabled();
  expect(within(dialog).getByLabelText("이미지·PDF")).toBeDisabled();
  expect(within(dialog).getByLabelText("표시 이름")).not.toBeDisabled();
});
it("keeps entered values on a server conflict without claiming success or retrying the write", async () => {
  api.post.mockRejectedValue({
    response: { data: { error: "다른 관리자가 변경했습니다." } },
  });
  render(<Page />);
  await screen.findByRole("button", { name: "gemini-default 수정" });
  fireEvent.click(
    within(
      screen.getByRole("heading", { name: "OpenAI" }).closest("article")!,
    ).getByRole("button", { name: "모델 등록" }),
  );
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("모델 ID"), {
    target: { value: "gpt-new" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await within(dialog).findByRole("alert");
  expect(within(dialog).getByLabelText("모델 ID")).toHaveValue("gpt-new");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/모델을 등록했습니다/)).not.toBeInTheDocument();
});
it("shows unavailable registry separately and disables mutations when reads fail", async () => {
  api.get.mockRejectedValue(new Error("temporary read failure"));
  render(<Page />);
  await screen.findByRole("alert");
  expect(
    screen
      .getAllByRole("button", { name: "모델 등록" })
      .every((x) => (x as HTMLButtonElement).disabled),
  ).toBe(true);
  expect(api.post).not.toHaveBeenCalled();
});
