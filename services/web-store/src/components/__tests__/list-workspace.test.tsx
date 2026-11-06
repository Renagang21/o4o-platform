import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActionBar, ListWorkspace, useListSelection } from "@o4o/ui";

afterEach(cleanup);
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

it("places header, filters, selection actions, table and pagination in the contract order", () => {
  render(
    <ListWorkspace
      title="목록"
      createAction={{ label: "신규 등록", onClick: vi.fn() }}
      filters={<div>필터 영역</div>}
      selection={{ selectedCount: 1, onClearSelection: vi.fn(), actions: [{ key: "edit", label: "선택 수정", onClick: vi.fn() }] }}
      pagination={<div>페이지 영역</div>}
    >
      <div>표 영역</div>
    </ListWorkspace>,
  );
  const order = [
    screen.getByRole("heading", { name: "목록" }),
    screen.getByRole("button", { name: "신규 등록" }),
    screen.getByText("필터 영역"),
    screen.getByRole("button", { name: "선택 수정" }),
    screen.getByText("표 영역"),
    screen.getByText("페이지 영역"),
  ];
  order.slice(1).forEach((node, index) => expect(follows(order[index], node)).toBe(true));
});

it("repeats the create action in the center only for a truly empty list", () => {
  const onClick = vi.fn();
  const base = { title: "목록", createAction: { label: "신규 등록", onClick }, isEmpty: true, filters: <div>필터 영역</div>, emptyMessage: "비어 있음", noResultsMessage: "결과 없음" };
  const ui = render(<ListWorkspace {...base}><div>표 영역</div></ListWorkspace>);
  expect(screen.getAllByRole("button", { name: "신규 등록" })).toHaveLength(2);
  expect(screen.getByText("비어 있음")).toBeTruthy();
  expect(screen.queryByText("표 영역")).toBeNull();
  ui.rerender(<ListWorkspace {...base} filterActive><div>표 영역</div></ListWorkspace>);
  expect(screen.getAllByRole("button", { name: "신규 등록" })).toHaveLength(1);
  expect(screen.getByText("결과 없음")).toBeTruthy();
  expect(screen.getByText("필터 영역")).toBeTruthy();
});

it("reports failure instead of an empty list and retries", () => {
  const onRetry = vi.fn();
  render(<ListWorkspace title="목록" isEmpty emptyMessage="비어 있음" error={{ message: "불러오지 못했습니다.", onRetry }}><div>표 영역</div></ListWorkspace>);
  expect(screen.getByRole("alert").textContent).toContain("불러오지 못했습니다.");
  expect(screen.queryByText("비어 있음")).toBeNull();
  expect(screen.queryByText("표 영역")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it("hides the selection bar while loading and shows loading status", () => {
  render(<ListWorkspace title="목록" loading loadingMessage="불러오는 중" selection={{ selectedCount: 1, onClearSelection: vi.fn(), actions: [{ key: "edit", label: "선택 수정", onClick: vi.fn() }] }}><div>표 영역</div></ListWorkspace>);
  expect(screen.getByRole("status").textContent).toContain("불러오는 중");
  expect(screen.queryByRole("button", { name: "선택 수정" })).toBeNull();
});

function SelectionProbe() {
  const [scope, setScope] = useState("a");
  const selection = useListSelection(scope);
  return (
    <>
      <output data-testid="count">{selection.selectedCount}</output>
      <button onClick={() => selection.setMany(["1", "2"], true)}>select</button>
      <button onClick={() => selection.retain(["2"])}>retain</button>
      <button onClick={() => setScope("b")}>scope</button>
      <button onClick={() => setScope("a")}>back</button>
    </>
  );
}
it("drops selection on scope change in the same render and retains only visible keys", () => {
  render(<SelectionProbe />);
  const count = () => screen.getByTestId("count").textContent;
  fireEvent.click(screen.getByText("select"));
  expect(count()).toBe("2");
  fireEvent.click(screen.getByText("retain"));
  expect(count()).toBe("1");
  fireEvent.click(screen.getByText("scope"));
  expect(count()).toBe("0");
  // Returning to the earlier scope (e.g. page 2 → page 1) must not resurrect its old selection.
  fireEvent.click(screen.getByText("back"));
  expect(count()).toBe("0");
});

it("locks an asynchronous action against a double click and releases after failure", async () => {
  let reject!: (reason: unknown) => void;
  const onClick = vi.fn(() => new Promise<void>((_resolve, fail) => { reject = fail; }).catch(() => undefined));
  render(<ActionBar selectedCount={1} onClearSelection={vi.fn()} actions={[{ key: "run", label: "실행", onClick }]} />);
  const run = screen.getByRole("button", { name: "실행" });
  fireEvent.click(run);
  fireEvent.click(run);
  expect(onClick).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error("failed")); });
  fireEvent.click(screen.getByRole("button", { name: "실행" }));
  expect(onClick).toHaveBeenCalledTimes(2);
});
