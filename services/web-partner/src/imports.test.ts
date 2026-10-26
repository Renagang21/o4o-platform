import { describe, expect, it } from "vitest";
import { csv, activitiesCsv, paymentsCsv } from "./imports";
import {
  emptyWorkspace,
  parseWorkspace,
  channelProfiles,
  tags,
  type Workspace,
} from "./model";
const fixture = (): Workspace => ({
  ...emptyWorkspace(),
  proposals: [
    {
      id: "p",
      createdAt: "2026-01-01T00:00:00Z",
      title: "제품",
      business: "테스트",
      category: "생활",
      channel: "라인",
      description: "정보",
      destination: "https://example.com",
      contact: "",
    },
  ],
  creators: [
    {
      id: "c",
      createdAt: "2026-01-01T00:00:00Z",
      name: "테스트 홍보자",
      topic: "생활",
      channel: "라인",
      portfolio: "",
    },
  ],
  settlements: [
    {
      id: "s",
      createdAt: "2026-01-01T00:00:00Z",
      proposalId: "p",
      creatorId: "c",
      memo: "활동",
      amount: 100,
      status: "recorded",
      paidAt: null,
    },
  ],
});
describe("CSV 전체 검증과 재실행 안전성", () => {
  it("BOM·따옴표·쉼표·줄바꿈·이중 따옴표를 읽는다", () =>
    expect(csv('\uFEFFname,note\r\n"자료,1","첫줄\n""인용"""\r\n')).toEqual([
      { name: "자료,1", note: '첫줄\n"인용"' },
    ]));
  it.each([
    "x,x\na,b",
    "__proto__,x\na,b",
    "x,y\na",
    'x\n"닫히지 않음',
    'x\n"a"b',
  ])("잘못된 CSV를 거부한다", (text) => expect(() => csv(text)).toThrow());
  it("기존·파일 내부 중복 게시물은 건너뛰고 0과 미입력 지표를 구분한다", () => {
    const w = fixture(),
      text =
        "url,publishedAt,views,likes,comments,shares\nhttps://example.com/post,2026-01-01,0,2,,0\nhttps://example.com/post,2026-01-01,0,2,,0";
    const a = activitiesCsv(text, w, "p", "c");
    expect(a.records).toHaveLength(1);
    expect(a.skipped).toBe(1);
    expect(a.records[0].views).toBe(0);
    expect(a.records[0].metrics).toEqual({
      likes: 2,
      comments: null,
      shares: 0,
      source: "import",
    });
    expect(
      activitiesCsv(text, { ...w, activities: a.records }, "p", "c").records,
    ).toHaveLength(0);
  });
  it("나중 행이 잘못되어도 원본에 부분 추가하지 않는다", () => {
    const w = fixture();
    expect(() =>
      activitiesCsv(
        "url,publishedAt,views\nhttps://example.com/one,2026-01-01,1\nhttps://example.com/two,2026-01-01,-1",
        w,
        "p",
        "c",
      ),
    ).toThrow();
    expect(w.activities).toHaveLength(0);
    expect(() =>
      activitiesCsv(
        "url,publishedAt\njavascript:alert(1),2026-01-01",
        w,
        "p",
        "c",
      ),
    ).toThrow();
  });
  it("외부 지급 결과를 한 번 기록하고 동일 파일의 재실행은 변경하지 않는다", () => {
    const text =
      "settlementId,paidAt,reference\ns,2026-01-01T00:00:00Z,external-record";
    const a = paymentsCsv(text, fixture());
    expect(a.updated).toBe(1);
    expect(a.workspace.settlements[0].status).toBe("paid");
    expect(paymentsCsv(text, a.workspace).updated).toBe(0);
  });
  it("알 수 없는 지급 ID·중복 ID·기존 지급 충돌 시 전체를 거부한다", () => {
    const w = fixture();
    expect(() =>
      paymentsCsv(
        "settlementId,paidAt\ns,2026-01-01T00:00:00Z\nmissing,2026-01-01T00:00:00Z",
        w,
      ),
    ).toThrow();
    expect(w.settlements[0].status).toBe("recorded");
    expect(() =>
      paymentsCsv(
        "settlementId,paidAt\ns,2026-01-01T00:00:00Z\ns,2026-01-01T00:00:00Z",
        w,
      ),
    ).toThrow();
    const paid = paymentsCsv(
      "settlementId,paidAt\ns,2026-01-01T00:00:00Z",
      w,
    ).workspace;
    expect(() =>
      paymentsCsv("settlementId,paidAt\ns,2026-01-02T00:00:00Z", paid),
    ).toThrow();
  });
  it("이전 백업을 유지하며 추가 메타데이터도 검증한다", () => {
    const w = fixture();
    expect(parseWorkspace(JSON.stringify(w))).toEqual(w);
    w.creators[0].channelProfiles = channelProfiles(
      "유튜브 | https://example.com/channel",
    );
    w.creators[0].region = "한국";
    expect(
      parseWorkspace(JSON.stringify(w)).creators[0].channelProfiles,
    ).toHaveLength(1);
    expect(tags("제품, 영상, 제품")).toEqual(["제품", "영상"]);
    expect(() => channelProfiles("라인 | javascript:alert(1)")).toThrow();
    w.creators[0].channelProfiles = [
      { channel: "라인", url: "javascript:alert(1)" },
    ];
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow();
  });
});
