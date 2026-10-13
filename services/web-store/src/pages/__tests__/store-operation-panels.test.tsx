import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState, type ComponentProps } from "react";
import { ChannelPublicUrlCard } from "../pharmacy/channels/ChannelPublicUrlCard";
import { StoreSignageScheduleForm } from "../pharmacy/StoreSignageScheduleForm";
import {
  TabletCommonIdlePicker,
  TabletOperationNotice,
} from "../pharmacy/tablet/TabletOperationPanels";
import {
  StoreQrOutputGuide,
  StoreQrPrintToolbar,
} from "../pharmacy/qr/StoreQrOutput";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../api/storeHub", () => ({ updateStoreSlug: mocks.update }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

it.each(["B2C", "TABLET"] as const)(
  "공개 %s 주소가 작업 호스트를 가리키지 않는다",
  (channelType) => {
    render(
      <MemoryRouter>
        <ChannelPublicUrlCard
          channelType={channelType}
          orgCode="sample-slug"
          canChangeSlug={false}
          showToast={vi.fn()}
          onSlugChanged={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "열기" }).getAttribute("href"),
    ).toBe(
      channelType === "B2C"
        ? "https://pharmacy.neture.co.kr/store/sample-slug/blog"
        : "https://pharmacy.neture.co.kr/tablet/sample-slug",
    );
    expect(
      (screen.getByRole("button", { name: "주소 변경" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  },
);
it("주소 저장 실패는 공개 URL을 바꾸지 않고 수정 입력을 유지한다", async () => {
  mocks.update.mockRejectedValue({ code: "SLUG_DUPLICATE" });
  const notify = vi.fn(),
    changed = vi.fn();
  render(
    <MemoryRouter>
      <ChannelPublicUrlCard
        channelType="B2C"
        orgCode="original"
        canChangeSlug
        showToast={notify}
        onSlugChanged={changed}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "주소 변경" }));
  fireEvent.change(screen.getByLabelText("매장 공개 주소"), {
    target: { value: "duplicate" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() =>
    expect(notify).toHaveBeenCalledWith("error", "이미 사용 중인 주소입니다."),
  );
  expect(changed).not.toHaveBeenCalled();
  expect(
    (screen.getByLabelText("매장 공개 주소") as HTMLInputElement).value,
  ).toBe("duplicate");
  expect(
    (screen.getByRole("button", { name: "저장" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  mocks.update.mockResolvedValue({ slug: "updated" });
  fireEvent.change(screen.getByLabelText("매장 공개 주소"), {
    target: { value: "updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(changed).toHaveBeenCalledWith("updated"));
});

function scheduleProps(): ComponentProps<typeof StoreSignageScheduleForm> {
  return {
    editing: false,
    playlists: [],
    schName: "예시 일정",
    schPlaylistId: "published",
    schPriority: 0,
    schDays: [],
    schStartTime: "09:00",
    schEndTime: "18:00",
    schValidFrom: "",
    schValidUntil: "",
    schIsActive: true,
    schSaving: false,
    saveError: null,
    setSchName: vi.fn(),
    setSchPlaylistId: vi.fn(),
    setSchPriority: vi.fn(),
    setSchStartTime: vi.fn(),
    setSchEndTime: vi.fn(),
    setSchValidFrom: vi.fn(),
    setSchValidUntil: vi.fn(),
    setSchIsActive: vi.fn(),
    toggleSchDay: vi.fn(),
    handleSaveSchedule: vi.fn(),
    resetScheduleForm: vi.fn(),
  };
}
it("스케줄은 게시된 플레이리스트만 선택하고 요일 없는 저장을 막는다", () => {
  const value = scheduleProps();
  const playlists = [
    { id: "published", name: "게시 목록", publishStatus: "published" },
    { id: "draft", name: "초안 목록", publishStatus: "draft" },
  ] as ComponentProps<typeof StoreSignageScheduleForm>["playlists"];
  const { rerender } = render(
    <StoreSignageScheduleForm {...value} playlists={playlists} />,
  );
  expect(screen.getByRole("option", { name: "게시 목록" })).toBeTruthy();
  expect(screen.getByLabelText("우선순위")).toBeTruthy();
  expect(screen.getByRole("group", { name: "요일 선택 *" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "초안 목록" })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "저장" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  rerender(
    <StoreSignageScheduleForm
      {...value}
      playlists={playlists}
      schDays={[1]}
      saveError="저장 실패"
    />,
  );
  expect(screen.getByRole("alert").textContent).toBe("저장 실패");
  expect(
    (screen.getByPlaceholderText("스케줄명 *") as HTMLInputElement).value,
  ).toBe("예시 일정");
  expect(
    (screen.getByRole("button", { name: "저장" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
it("공통 영상은 만료된 후보를 숨기고 조회 실패를 빈 상태와 구분한다", () => {
  const callbacks = { onRetry: vi.fn(), onSelect: vi.fn(), onClose: vi.fn() };
  const candidates = [
    {
      id: "expired",
      title: "만료 자료",
      status: "expired",
      sourceType: "youtube",
      startAt: "2026-01-01",
      endAt: "2026-01-02",
      videoUrl: "",
      thumbnailUrl: null,
      tabletDurationSeconds: null,
    },
  ] as ComponentProps<typeof TabletCommonIdlePicker>["ocCandidates"];
  const { rerender } = render(
    <TabletCommonIdlePicker
      ocLoading={false}
      ocLoadError={false}
      ocCandidates={candidates}
      ocStatusLabel={{}}
      ocBusy={false}
      {...callbacks}
    />,
  );
  expect(screen.queryByText("만료 자료")).toBeNull();
  const dialog = screen.getByRole("dialog", {
    name: "서비스 공통 대기 영상 선택",
  });
  expect(dialog.tagName).toBe("DIALOG");
  fireEvent.click(
    screen.getByText("현재 사용 가능한 서비스 공통 영상이 없습니다."),
  );
  expect(callbacks.onClose).not.toHaveBeenCalled();
  expect(
    screen.getByText("현재 사용 가능한 서비스 공통 영상이 없습니다."),
  ).toBeTruthy();
  rerender(
    <TabletCommonIdlePicker
      ocLoading={false}
      ocLoadError
      ocCandidates={candidates}
      ocStatusLabel={{}}
      ocBusy={false}
      {...callbacks}
    />,
  );
  expect(
    screen.queryByText("현재 사용 가능한 서비스 공통 영상이 없습니다."),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(callbacks.onRetry).toHaveBeenCalledOnce();
  fireEvent(
    screen.getByRole("dialog", { name: "서비스 공통 대기 영상 선택" }),
    new Event("cancel", { bubbles: false, cancelable: true }),
  );
  expect(callbacks.onClose).toHaveBeenCalledOnce();
});
it("되돌리기 동작 전에 알림을 해제해 같은 액션을 남겨두지 않는다", () => {
  const order: string[] = [];
  render(
    <TabletOperationNotice
      toast={{
        type: "success",
        message: "적용 완료",
        action: { label: "되돌리기", onClick: () => order.push("action") },
      }}
      onDismiss={() => order.push("dismiss")}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(order).toEqual(["dismiss", "action"]);
});
it("출력 가능한 QR이 없으면 전체 선택을 표시하지 않고 출력 중 중복 조작을 막는다", () => {
  const { rerender } = render(
    <StoreQrPrintToolbar
      selectedCount={0}
      printableCount={0}
      printing={false}
      onToggleAll={vi.fn()}
      onPrint={vi.fn()}
    />,
  );
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
    false,
  );
  expect(screen.queryByRole("button", { name: /선택 QR 출력/ })).toBeNull();
  rerender(
    <StoreQrPrintToolbar
      selectedCount={1}
      printableCount={1}
      printing
      onToggleAll={vi.fn()}
      onPrint={vi.fn()}
    />,
  );
  expect(
    (
      screen.getByRole("button", {
        name: "PDF 생성 중...",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("출력 안내는 열린 동안에만 Escape로 닫힌다", () => {
  const close = vi.fn();
  const { rerender } = render(<StoreQrOutputGuide open onClose={close} />);
  expect(
    screen.getByRole("dialog", { name: "QR 출력 파일 안내" }),
  ).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
  rerender(<StoreQrOutputGuide open={false} onClose={close} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
});

it("닫힌 태블릿 영상 대화상자는 열었던 버튼으로 포커스를 복원한다", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          영상 선택 열기
        </button>
        {open && (
          <TabletCommonIdlePicker
            ocLoading={false}
            ocLoadError={false}
            ocCandidates={[]}
            ocStatusLabel={{}}
            ocBusy={false}
            onRetry={vi.fn()}
            onSelect={vi.fn()}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }
  render(<Harness />);
  const trigger = screen.getByRole("button", { name: "영상 선택 열기" });
  trigger.focus();
  fireEvent.click(trigger);
  const close = screen.getByRole("button", {
    name: "공통 대기 영상 선택 닫기",
  });
  close.focus();
  fireEvent.click(close);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
