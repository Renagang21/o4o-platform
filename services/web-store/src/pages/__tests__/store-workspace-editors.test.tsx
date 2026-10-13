import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { StoreQrCreateForms } from "../pharmacy/qr/StoreQrCreateForms";
import { StoreTabletPreview } from "../pharmacy/StoreTabletPreview";

vi.mock("@o4o/tablet-kiosk-core", () => ({
  TabletKioskPage: ({ slug }: { slug: string }) => <p>{slug}</p>,
}));
afterEach(cleanup);
function props(): ComponentProps<typeof StoreQrCreateForms> {
  return {
    creating: true,
    videoTarget: null,
    selectedLibrary: {
      id: "sample",
      title: "참조 콘텐츠",
      assetType: "content",
      category: null,
      fileUrl: null,
      url: null,
      htmlContent: null,
      source: "content-hub",
    },
    formTitle: "안내",
    formDescription: "본문",
    formSlug: "sample",
    formLandingType: "product",
    formLandingTargetId: "other",
    selectedTemplate: null,
    ctaEnabled: false,
    ctaLabel: "",
    formError: null,
    saving: false,
    qrBaseUrl: "https://example.test/qr/",
    loadingProducts: false,
    productOptions: [],
    setFormTitle: vi.fn(),
    setFormDescription: vi.fn(),
    setFormSlug: vi.fn(),
    setFormLandingType: vi.fn(),
    setFormLandingTargetId: vi.fn(),
    setCtaEnabled: vi.fn(),
    setCtaLabel: vi.fn(),
    setCreating: vi.fn(),
    setVideoTarget: vi.fn(),
    setSelectedLibrary: vi.fn(),
    setShowSelector: vi.fn(),
    handleCreate: vi.fn(),
    handleCreateVideo: vi.fn(),
  };
}
it("운영자 콘텐츠 QR은 추출 후에도 연결 유형을 잠그고 기존 저장을 호출한다", () => {
  const handlers = props();
  render(<StoreQrCreateForms {...handlers} />);
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.getByText("운영자 콘텐츠 연결 QR")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "QR 만들기" }));
  expect(handlers.handleCreate).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "자료 변경" }));
  expect(handlers.setCreating).toHaveBeenCalledWith(false);
  expect(handlers.setSelectedLibrary).toHaveBeenCalledWith(null);
  expect(handlers.setShowSelector).toHaveBeenCalledWith(true);
});
it("동영상 QR 저장과 취소는 일반 콘텐츠 처리와 섞이지 않는다", () => {
  const handlers = props();
  render(
    <StoreQrCreateForms
      {...handlers}
      selectedLibrary={null}
      videoTarget={{ id: "video-sample", title: "동영상" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "QR 만들기" }));
  expect(handlers.handleCreateVideo).toHaveBeenCalledOnce();
  expect(handlers.handleCreate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(handlers.setVideoTarget).toHaveBeenCalledWith(null);
});
it("태블릿 미리보기는 선택 slug와 보기 전환을 유지하고 Escape로 닫힌다", () => {
  const onClose = vi.fn(),
    onViewChange = vi.fn();
  render(
    <StoreTabletPreview
      previewSlug="preview-sample"
      previewView="tablet"
      previewSettings={undefined}
      previewApi={{} as ComponentProps<typeof StoreTabletPreview>["previewApi"]}
      tabletId={null}
      storeSlug={null}
      publicUrl=""
      onCopy={vi.fn()}
      onClose={onClose}
      onViewChange={onViewChange}
    />,
  );
  expect(screen.getByText("preview-sample")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "휴대전화" }));
  expect(onViewChange).toHaveBeenCalledWith("mobile");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();
  cleanup();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();
});

it("QR CTA and landing controls are reachable by their visible labels", () => {
  const value = props();
  const { rerender } = render(<StoreQrCreateForms {...value} ctaEnabled />);
  expect(
    (
      screen.getByLabelText(
        "콘텐츠 하단에 상담 요청 버튼 표시",
      ) as HTMLInputElement
    ).type,
  ).toBe("checkbox");
  expect(screen.getByLabelText("상담 요청 버튼 문구")).toBeTruthy();
  rerender(
    <StoreQrCreateForms
      {...value}
      selectedLibrary={{ ...value.selectedLibrary!, source: "direct-content" }}
      formLandingType="product"
    />,
  );
  expect(screen.getByLabelText("연결 유형").tagName).toBe("SELECT");
  expect(screen.getByLabelText("연결 상품 (선택)").tagName).toBe("SELECT");
  rerender(
    <StoreQrCreateForms
      {...value}
      selectedLibrary={{ ...value.selectedLibrary!, source: "direct-content" }}
      formLandingType="link"
    />,
  );
  expect(screen.getByLabelText("연결 URL").tagName).toBe("INPUT");
});
