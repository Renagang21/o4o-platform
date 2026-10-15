import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MyHomeStoreBusinesses } from "./MyHomePanels";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../lib/apiClient", () => ({ api: { get, post } }));
vi.mock("../../lib/api/communityOperator", () => ({ listOperatedCommunities: vi.fn() }));
afterEach(cleanup);
beforeEach(() => { get.mockReset(); post.mockReset(); });
const response = (data: unknown) => ({ data: { success: true, data } });
const row = (name: string, membershipStatus: string | null = "active") => ({ key: name, name, membershipStatus });
const view = (accountId = "first", organizationId = "store-one", compact = false) => <MemoryRouter><MyHomeStoreBusinesses accountId={accountId} organizationId={organizationId} canEnterCommunity compact={compact} /></MemoryRouter>;

it("reads the explicitly selected store and separates store memberships from the available catalogue", async () => {
  get.mockResolvedValue(response([row("이용 사업"), row("신청 사업", "pending"), row("미가입 사업", null), row("확인할 사업", "future-status")]));
  render(view());
  await screen.findByText("이용 사업");
  expect(get).toHaveBeenCalledWith("/neture/pharmacy/semi-franchises", { headers: { "X-Store-Organization-Id": "store-one" } });
  expect(screen.getByText("승인 대기")).toBeTruthy();
  expect(screen.getByText("상태 확인 필요")).toBeTruthy();
  expect(screen.queryByText("미가입 사업")).toBeNull();
});
it("keeps the overview bounded and displays complete memberships in ten-row pages", async () => {
  get.mockResolvedValue(response(Array.from({ length: 11 }, (_, i) => row(`사업 ${i}`))));
  const { rerender } = render(view("first", "store-one", true));
  await screen.findByText("사업 2");
  expect(screen.queryByText("사업 3")).toBeNull();
  expect(screen.queryByRole("button", { name: "다음" })).toBeNull();
  expect(screen.getByRole("link", { name: "협력사업 참여 현황 더 보기 →" }).getAttribute("href")).toBe("/mypage/services");
  rerender(view());
  await screen.findByText("사업 9");
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  expect(screen.getByText("사업 10")).toBeTruthy();
  expect(screen.queryByText("사업 0")).toBeNull();
});
it.each(["account", "store"])("discards a late reply after the selected %s changes", async (scope) => {
  let release!: (value: ReturnType<typeof response>) => void;
  get.mockImplementationOnce(() => new Promise(r => { release = r; })).mockResolvedValueOnce(response([row("현재 사업")]));
  const { rerender } = render(view());
  rerender(view(scope === "account" ? "second" : "first", scope === "store" ? "store-two" : "store-one"));
  await screen.findByText("현재 사업");
  await act(async () => { release(response([row("이전 사업")])); });
  expect(screen.queryByText("이전 사업")).toBeNull();
});
it("distinguishes denied access from empty participation", async () => {
  get.mockRejectedValue({ response: { status: 403 } });
  render(view());
  await screen.findByText(/사업 참여 정보를 조회할 수 없습니다/);
  expect(screen.queryByText(/표시할 참여 기록이 없습니다/)).toBeNull();
});
it("retries failed reads without declaring an empty membership list", async () => {
  get.mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce(response([row("복구 사업")]));
  render(view());
  await screen.findByRole("alert");
  expect(screen.queryByText(/표시할 참여 기록이 없습니다/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await screen.findByText("복구 사업");
});
it.each([null, [row("중복 사업"), row("중복 사업")], [{ key: "broken", name: "누락 상태" }]])("rejects malformed business data %#", async (data) => {
  get.mockResolvedValue(response(data));
  render(view());
  await screen.findByRole("alert");
  expect(screen.queryByText(/표시할 참여 기록이 없습니다/)).toBeNull();
});
it("reports no participation only after a successful catalogue read", async () => {
  get.mockResolvedValue(response([row("미가입 사업", null)]));
  render(view());
  await screen.findByText("운영 중인 약국 협력사업에 표시할 참여 기록이 없습니다.");
  expect(screen.queryByText("미가입 사업")).toBeNull();
});

it('only active memberships expose scoped business actions; a failed move can be retried', async () => {
  get.mockResolvedValue(response([{ ...row('network-a'), communityKey: 'forum-a' }, row('pending', 'pending'), row('suspended', 'suspended'), row('terminated', 'terminated')]));
  post.mockRejectedValue(new Error('Unavailable'));
  render(view());
  const active = (await screen.findByText('network-a')).closest('li')!;
  fireEvent.click(within(active).getByRole('button', { name: '가입자 공간' }));
  await screen.findByRole('alert');
  expect(post).toHaveBeenLastCalledWith('/auth/handoff', { targetServiceKey: 'kpa-society', returnPath: '/businesses/network-a?store=store-one' });
  fireEvent.click(within(active).getByRole('button', { name: '자료 가져오기' }));
  await waitFor(() => expect(post).toHaveBeenLastCalledWith('/auth/handoff', { targetWorkspace: 'store', returnPath: '/store/pharmacy/contents?business=network-a' }));
  for (const name of ['pending', 'suspended', 'terminated']) expect(within(screen.getByText(name).closest('li')!).queryByRole('button')).toBeNull();
});
it('drops a handoff failure after changing the selected store', async () => {
  let reject!: (error: Error) => void;
  get.mockResolvedValue(response([{ ...row('network-a'), communityKey: 'forum-a' }]));
  post.mockReturnValue(new Promise((_resolve, no) => { reject = no; }));
  const { rerender } = render(view());
  fireEvent.click(await screen.findByRole('button', { name: '가입자 공간' }));
  rerender(view('first', 'store-two'));
  await screen.findByRole('button', { name: '가입자 공간' });
  await act(async () => reject(new Error('Old store')));
  expect(screen.queryByRole('alert')).toBeNull();
});

it('직원은 가입자 공간 없이 내 매장 상품과 자료만 이용한다', async () => {
  get.mockResolvedValue(response([{ ...row('network-a'), communityKey: 'forum-a' }]));
  render(<MemoryRouter><MyHomeStoreBusinesses accountId="staff" organizationId="store-one" canEnterCommunity={false} /></MemoryRouter>);
  await screen.findByRole('button', { name: '자료 가져오기' });
  expect(screen.queryByRole('button', { name: '가입자 공간' })).toBeNull();
  expect(screen.getByRole('button', { name: '공급 상품' })).toBeTruthy();
});
