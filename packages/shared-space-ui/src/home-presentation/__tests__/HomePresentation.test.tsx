import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HOME_SURFACES,
  initialHomePresentation,
  parseHomePresentation,
  visibleHomePresentation,
  type HomePresentationState,
} from "@o4o/types";
import {
  HomeHeroView,
  HomePromotionView,
  ServiceHomeHero,
  ServiceHomePromotion,
} from "../HomePresentation";
import { HomePresentationEditor } from "../HomePresentationEditor";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const state = (): HomePresentationState => ({
  revision: 0,
  draft: null,
  published: null,
});
const response = (data: unknown) => ({ data: { success: true, data } });

describe("home presentation contract and public display", () => {
  it.each(HOME_SURFACES)(
    "provides service-specific defaults without inventing advertisements: %s",
    (surface) => {
      const defaults = initialHomePresentation(surface);
      expect(parseHomePresentation(defaults)).toEqual(defaults);
      expect(defaults.slides.length).toBe(surface === "carepharm" ? 1 : 2);
      expect(defaults.slides.length).toBeLessThanOrEqual(3);
      expect(
        defaults.promotions.every(
          (item) => item.kind === "service" && !item.sponsor,
        ),
      ).toBe(true);
    },
  );
  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "//evil.example/path",
    "https://user:password@example.com",
    "/\\evil.example",
    "https://example.com/\nscript",
  ])("rejects unsafe image and link destinations: %s", (url) => {
    const config = initialHomePresentation("neture");
    config.slides[0].linkUrl = url;
    expect(() => parseHomePresentation(config)).toThrow();
    config.slides[0].linkUrl = "";
    config.slides[0].imageUrl = url;
    expect(() => parseHomePresentation(config)).toThrow();
  });
  it("requires an advertiser and disallows advertisements in the hero", () => {
    const config = initialHomePresentation("neture");
    config.promotions[0].kind = "advertisement";
    expect(() => parseHomePresentation(config)).toThrow();
    config.promotions[0].sponsor = "합성 광고주";
    expect(() => parseHomePresentation(config)).not.toThrow();
    config.slides[0].kind = "advertisement";
    expect(() => parseHomePresentation(config)).toThrow();
  });
  it("uses inclusive starts and exclusive ends and rejects invalid/reversed periods", () => {
    const config = initialHomePresentation("neture");
    const now = Date.parse("2026-10-15T00:00:00Z");
    config.slides[0].startsAt = new Date(now).toISOString();
    config.slides[0].endsAt = new Date(now + 1000).toISOString();
    config.slides[1].enabled = false;
    expect(visibleHomePresentation(config, now).slides).toHaveLength(1);
    expect(visibleHomePresentation(config, now + 1000).slides).toHaveLength(0);
    config.slides[0].endsAt = "invalid";
    expect(() => parseHomePresentation(config)).toThrow();
    config.slides[0].endsAt = new Date(now - 1000).toISOString();
    expect(() => parseHomePresentation(config)).toThrow();
  });
  it("switches manually with buttons, never starts an automatic rotation, and preserves entry actions", () => {
    vi.useFakeTimers();
    const config = initialHomePresentation("supplier");
    render(
      <HomeHeroView
        surface="supplier"
        config={config}
        actions={<button>원래 업무 진입</button>}
      />,
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe(config.slides[0].title);
    act(() => vi.advanceTimersByTime(120_000));
    expect(heading.textContent).toBe(config.slides[0].title);
    fireEvent.click(screen.getByRole("button", { name: "다음 안내" }));
    expect(heading.textContent).toBe(config.slides[1].title);
    expect(screen.getByRole("button", { name: "원래 업무 진입" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "이전 안내" }));
    expect(heading.textContent).toBe(config.slides[0].title);
    fireEvent.click(screen.getByRole("button", { name: "2번 안내 보기" }));
    expect(
      screen
        .getByRole("button", { name: "2번 안내 보기" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("distinguishes advertisements from service notices and hides disabled promotions", () => {
    const config = initialHomePresentation("lecture");
    const { rerender } = render(
      <HomePromotionView surface="lecture" config={config} />,
    );
    expect(
      screen.getByRole("complementary", { name: "서비스 안내" }),
    ).toBeTruthy();
    config.promotions[0].kind = "advertisement";
    config.promotions[0].sponsor = "합성 광고주";
    rerender(<HomePromotionView surface="lecture" config={config} />);
    expect(screen.getByText("광고 · 합성 광고주")).toBeTruthy();
    config.enabled = false;
    rerender(<HomePromotionView surface="lecture" config={config} />);
    expect(screen.queryByRole("complementary")).toBeNull();
  });
  it("does not let a late previous-service response replace the current home", async () => {
    let finish!: (data: any) => void;
    const client = {
      get: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            }),
        )
        .mockResolvedValueOnce(response(null)),
    };
    const { rerender } = render(
      <ServiceHomeHero surface="supplier" client={client} />,
    );
    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(1));
    rerender(<ServiceHomeHero surface="funding" client={client} />);
    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
    const previous = initialHomePresentation("supplier");
    previous.slides[0].title = "이전 서비스 콘텐츠";
    await act(async () => finish(response(previous)));
    expect(screen.queryByText("이전 서비스 콘텐츠")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "새로운 제품",
    );
  });
});

it("refreshes scheduled public content without rotating slides and stops polling after unmount", async () => {
  vi.useFakeTimers();
  const scheduled = initialHomePresentation("supplier");
  scheduled.slides[0].title = "게시 시간이 된 안내";
  const client = {
    get: vi
      .fn()
      .mockResolvedValueOnce(response(null))
      .mockResolvedValue(response(scheduled)),
  };
  const { unmount } = render(
    <ServiceHomeHero surface="supplier" client={client} />,
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(client.get).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(client.get).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "게시 시간이 된 안내",
  );
  unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(client.get).toHaveBeenCalledTimes(2);
});

it("preserves the branch identity and primary entry when an operator hides promotional content", async () => {
  const config = initialHomePresentation("branch");
  config.enabled = false;
  const client = { get: vi.fn().mockResolvedValue(response(config)) };
  render(
    <ServiceHomeHero
      surface="branch"
      branchSlug="sample"
      title={["실제 분회 이름"]}
      client={client}
      actions={<a href="/sample/notices">공지 보기</a>}
    />,
  );
  await waitFor(() =>
    expect(document.querySelector(".home-plain-title")).toBeTruthy(),
  );
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "실제 분회 이름",
  );
  expect(
    screen.getByRole("link", { name: "공지 보기" }).getAttribute("href"),
  ).toBe("/sample/notices");
});

describe("operator editor", () => {
  it("labels and previews every CarePharm public notice while retaining the published-only API contract", async () => {
    const draft = initialHomePresentation("carepharm");
    draft.promotions.push({ ...draft.promotions[0], id: "second", title: "두 번째 공지" });
    const client = { get: vi.fn().mockResolvedValue(response({ ...state(), draft })), put: vi.fn() };
    render(<HomePresentationEditor surface="carepharm" client={client} />);
    expect(await screen.findByRole("heading", { name: "Hero · 공개 공지 관리" })).toBeTruthy();
    await screen.findAllByLabelText("제목");
    expect(client.get).toHaveBeenCalledExactlyOnceWith("/home-presentation/carepharm/manage");
    const preview = screen.getByRole("region", { name: "홈 화면 미리보기" });
    expect(within(preview).getByText("두 번째 공지")).toBeTruthy();
    expect(within(preview).getByText("CarePharm 이용 안내")).toBeTruthy();
    expect(screen.getByLabelText("Hero·공개 공지 노출 사용")).toBeTruthy();
  });
  it("distinguishes a failed read from an empty first configuration and blocks saving", async () => {
    const client = {
      get: vi.fn().mockRejectedValue(new Error("fixture")),
      put: vi.fn(),
    };
    render(<HomePresentationEditor surface="supplier" client={client} />);
    await screen.findByRole("alert");
    expect(
      (screen.getByRole("button", { name: "초안 저장" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByLabelText("제목")).toBeNull();
    expect(client.put).not.toHaveBeenCalled();
  });
  it("saves a draft separately from publishing and preserves the input after a conflict", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(response(state())),
      put: vi.fn().mockImplementation(async (_path, body) =>
        response({
          revision: body.revision + 1,
          draft: body.config,
          published: body.publish ? body.config : null,
        }),
      ),
    };
    render(<HomePresentationEditor surface="funding" client={client} />);
    const titles = await screen.findAllByLabelText("제목");
    fireEvent.change(titles[0], { target: { value: "편집한 안내" } });
    fireEvent.click(screen.getByRole("button", { name: "초안 저장" }));
    await screen.findByText(
      "초안을 저장했습니다. 공개 화면은 바뀌지 않았습니다.",
    );
    expect(client.put).toHaveBeenLastCalledWith(
      "/home-presentation/funding/manage",
      expect.objectContaining({ revision: 0, publish: false }),
    );
    client.put.mockRejectedValueOnce({ response: { status: 409 } });
    fireEvent.click(screen.getByRole("button", { name: "공개 반영" }));
    await screen.findByRole("alert");
    expect((titles[0] as HTMLInputElement).value).toBe("편집한 안내");
    fireEvent.click(screen.getByRole("button", { name: "공개 반영" }));
    await screen.findByText("공개 화면에 반영했습니다.");
    expect(client.put).toHaveBeenLastCalledWith(
      "/home-presentation/funding/manage",
      expect.objectContaining({ revision: 1, publish: true }),
    );
  });
  it("sends the chosen order, schedule and hide setting to the branch-scoped endpoint", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(response(state())),
      put: vi
        .fn()
        .mockImplementation(async (_path, body) =>
          response({ revision: 1, draft: body.config, published: body.config }),
        ),
    };
    render(
      <HomePresentationEditor
        surface="branch"
        branchSlug="fixture"
        client={client}
      />,
    );
    await screen.findAllByLabelText("제목");
    const area = screen.getByRole("region", { name: "Hero 안내 편집" });
    fireEvent.click(
      within(area).getByRole("button", { name: "1번 Hero 아래로" }),
    );
    fireEvent.click(screen.getByLabelText("Hero·홍보 노출 사용"));
    fireEvent.click(screen.getByRole("button", { name: "공개 반영" }));
    await screen.findByText("공개 화면에 반영했습니다.");
    expect(client.put).toHaveBeenCalledWith(
      "/kpa-branch/branches/fixture/operator/home-presentation",
      expect.objectContaining({
        config: expect.objectContaining({
          enabled: false,
          slides: expect.arrayContaining([
            expect.objectContaining({ id: "discover" }),
          ]),
        }),
      }),
    );
    expect(client.put.mock.calls[0][1].config.slides[0].id).toBe("discover");
  });
  it("blocks duplicate writes while publishing and leaves failed input available for retry", async () => {
    let reject!: (error: unknown) => void;
    const client = {
      get: vi.fn().mockResolvedValue(response(state())),
      put: vi.fn().mockImplementation(
        () =>
          new Promise((_done, fail) => {
            reject = fail;
          }),
      ),
    };
    render(
      <HomePresentationEditor
        surface="pharmacy"
        businessKey="fixture"
        client={client}
      />,
    );
    await screen.findAllByLabelText("제목");
    const publish = screen.getByRole("button", { name: "공개 반영" });
    fireEvent.click(publish);
    fireEvent.click(publish);
    expect(client.put).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("fixture")));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "입력은 보존",
    );
    expect(screen.getAllByLabelText("제목")).toHaveLength(3);
  });
});


it("shows only operator-published announcements when requested, without suppressing existing consumers' defaults", async () => {
  const client = { get: vi.fn().mockResolvedValue(response(null)) };
  const ui = render(<ServiceHomePromotion surface="carepharm" client={client} publishedOnly />);
  await waitFor(() => expect(client.get).toHaveBeenCalled());
  expect(screen.queryByText('CarePharm 이용 안내')).toBeNull();
  ui.unmount();
  render(<ServiceHomePromotion surface="neture" client={client} />);
  await screen.findByText('O4O 이용 안내');
});
it("retains operator-published multiple CarePharm banners and Study announcements", async () => {
  const published = initialHomePresentation('carepharm');
  published.slides.push({ ...published.slides[0], id: 'event', title: '운영자가 개설한 교육 안내' });
  published.promotions[0] = { ...published.promotions[0], title: '회원 교육 개설', linkUrl: 'https://neture.co.kr/service-entry/lecture?returnPath=%2F', linkText: '교육 안내 확인' };
  const client = { get: vi.fn().mockResolvedValue(response(published)) };
  render(<><ServiceHomeHero surface="carepharm" client={client} /><ServiceHomePromotion surface="carepharm" client={client} publishedOnly /></>);
  expect((await screen.findByRole('link', { name: /교육 안내 확인/ })).getAttribute('href')).toBe('https://neture.co.kr/service-entry/lecture?returnPath=%2F');
  fireEvent.click(screen.getByRole('button', { name: '다음 안내' }));
  expect(screen.getByRole('heading', { name: '운영자가 개설한 교육 안내' })).toBeTruthy();
});
