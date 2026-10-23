import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("../../lib/apiClient", () => ({ api: { post, get } }));
import ContactPage from "../ContactPage";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("preserves lecture application, collaboration and error inquiry choices and submits the selected type", async () => {
  post.mockResolvedValue({ data: { data: { id: "lecture-receipt" } } });
  get.mockResolvedValue({
    data: {
      data: {
        serviceKey: "lecture",
        inquiryTypesConfigured: false,
        inquiryTypes: [],
        privacyNotice: null,
        completionNotice: null,
      },
    },
  });
  render(<MemoryRouter initialEntries={["/contact?courseId=fixture-course&lessonId=fixture-lesson"]}><ContactPage /></MemoryRouter>);
  await screen.findByRole("combobox");
  for (const label of [
    "서비스 이용 신청",
    "강의 개설 · 협업",
    "이용 중 오류",
    "기타",
  ])
    expect(screen.getByRole("option", { name: label })).toBeTruthy();
  expect(
    screen.getByText(
      "이용 신청, 강의 개설과 운영 협업에 관한 문의를 강의 서비스 운영자가 확인합니다.",
    ),
  ).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "partnership" },
  });
  for (const [label, value] of [
    ["이름 *", "합성 방문자"],
    ["이메일 *", "sample@example.invalid"],
    ["제목 *", "강의 협업 문의"],
    ["문의 내용 *", "강의 개설과 협업에 대해 문의합니다."],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "문의 보내기" }));
  expect(await screen.findByText("접수번호: lecture-receipt")).toBeTruthy();
  expect(post).toHaveBeenCalledWith(
    "/public/services/lecture/contact-inquiries",
    expect.objectContaining({
      inquiryType: "partnership",
      privacyConsent: true,
      message: expect.stringContaining("[문의 대상] 강의: fixture-course / 레슨: fixture-lesson"),
    }),
  );
});
