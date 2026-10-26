import { describe, expect, it } from "vitest";
import {
  calendarDate,
  contentDraft,
  emptyWorkspace,
  integer,
  loadWorkspace,
  parseWorkspace,
  saveWorkspace,
  settlementCsv,
  STORAGE_KEY,
  trackingLink,
  webUrl,
  type Workspace,
} from "./model";

export function fixture(): Workspace {
  return {
    ...emptyWorkspace(),
    proposals: [
      {
        id: "proposal-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "제품 소개",
        business: "테스트 브랜드",
        category: "생활",
        channel: "인스타그램",
        description: "확인된 제품 정보",
        destination: "https://example.com/product?existing=1#details",
        contact: "",
      },
    ],
    creators: [
      {
        id: "creator-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        name: "테스트 크리에이터",
        channel: "유튜브",
        topic: "일상 콘텐츠",
        portfolio: "",
      },
    ],
  };
}

describe("안전한 입력", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.com",
    "https://user:password@example.com",
    "//example.com",
  ])("위험한 주소를 거부한다: %s", (input) => {
    expect(() => webUrl(input)).toThrow();
  });
  it("선택 주소는 비워둘 수 있고 웹 주소는 정규화한다", () => {
    expect(webUrl("", false)).toBe("");
    expect(webUrl(" https://example.com ")).toBe("https://example.com/");
  });
  it.each(["-1", "1.5", "NaN", "Infinity", "9007199254740992", ""])(
    "잘못된 금액과 수치를 거부한다: %s",
    (input) => expect(() => integer(input)).toThrow(),
  );
  it("조회수 0은 허용하지만 지급 금액 0은 거부한다", () => {
    expect(integer("0")).toBe(0);
    expect(() => integer("0", 1)).toThrow();
  });
  it("존재하지 않는 날짜와 미래 활동일을 거부한다", () => {
    expect(() => calendarDate("2025-02-30")).toThrow();
    expect(() => calendarDate("2999-01-01")).toThrow();
    expect(calendarDate("2024-02-29")).toBe("2024-02-29");
  });
});

describe("콘텐츠와 홍보 링크", () => {
  it("기존 주소의 쿼리와 앵커를 보존하고 홍보자별 UTM을 덮어쓴다", () => {
    const a = new URL(
      trackingLink(
        "https://example.com/p?existing=1&utm_content=old#detail",
        "creator-1",
        "proposal-1",
        "유튜브",
      ),
    );
    expect(a.searchParams.get("existing")).toBe("1");
    expect(a.hash).toBe("#detail");
    expect(a.searchParams.get("utm_content")).toBe("creator-1");
    expect(a.searchParams.get("utm_source")).toBe("유튜브");
    expect(a.searchParams.getAll("utm_content")).toHaveLength(1);
    expect(trackingLink(a.href, "creator-2", "proposal-1", "유튜브")).not.toBe(
      a.href,
    );
  });
  it("입력 사실을 유지하며 영상과 메시지 형식을 구분한다", () => {
    expect(
      contentDraft("테스트 제품", "사용 전 흔들어 주세요.", "틱톡"),
    ).toContain("장면 2");
    const message = contentDraft(
      "테스트 제품",
      "사용 전 흔들어 주세요.",
      "카카오톡",
    );
    expect(message).toContain("사용 전 흔들어 주세요.");
    expect(message).toContain("공유 문구");
    expect(message).not.toContain("장면 2");
    expect(() => contentDraft("", "정보", "라인")).toThrow();
  });
});

describe("로컬 저장 무결성", () => {
  it("관계가 있는 데이터를 손실 없이 저장하고 불러온다", () => {
    const w = fixture();
    w.activities.push({
      id: "a",
      createdAt: "2026-01-01T00:00:00Z",
      proposalId: "proposal-1",
      creatorId: "creator-1",
      url: "https://example.com/post",
      publishedAt: "2026-01-01",
      views: 0,
    });
    let raw = "";
    saveWorkspace(
      {
        setItem: (key, value) => {
          expect(key).toBe(STORAGE_KEY);
          raw = value;
        },
      },
      w,
    );
    expect(loadWorkspace({ getItem: () => raw })).toEqual({
      data: w,
      error: "",
    });
  });
  it("저장된 활동 날짜는 열람자의 오늘과 무관하게 읽되 잘못된 달력 날짜는 거부한다", () => {
    const w = fixture();
    w.activities.push({ id: "timezone-activity", createdAt: "2026-01-01T00:00:00Z",
      proposalId: "proposal-1", creatorId: "creator-1", url: "https://example.com/post",
      publishedAt: "2999-01-01", views: 0 });
    expect(parseWorkspace(JSON.stringify(w)).activities[0].publishedAt).toBe("2999-01-01");
    expect(() => calendarDate("2999-01-01")).toThrow();
    w.activities[0].publishedAt = "2026-02-30";
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow();
  });
  it.each([
    "{broken",
    '{"version":99}',
    JSON.stringify({ ...emptyWorkspace(), proposals: [{ id: "x" }] }),
  ])("손상 데이터에 쓰기 중지 상태를 반환한다", (raw) => {
    expect(loadWorkspace({ getItem: () => raw }).error).not.toBe("");
  });
  it("저장소 접근 거부를 처리하고 저장 실패를 숨기지 않는다", () => {
    expect(
      loadWorkspace({
        getItem: () => {
          throw new Error("denied");
        },
      }).error,
    ).not.toBe("");
    expect(() =>
      saveWorkspace(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        emptyWorkspace(),
      ),
    ).toThrow("quota");
  });
  it("위험한 저장 주소, 중복 ID, 없는 연결을 거부한다", () => {
    const w = fixture();
    w.proposals[0].contact = "javascript:alert(1)";
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow();
    w.proposals[0].contact = "";
    w.proposals.push(w.proposals[0]);
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow();
    w.proposals.pop();
    w.settlements.push({
      id: "s",
      createdAt: "2026-01-01T00:00:00Z",
      proposalId: "missing",
      creatorId: "creator-1",
      amount: 1000,
      memo: "활동비",
      status: "recorded",
      paidAt: null,
    });
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow("연결된");
  });
  it("지급 기록 없는 지급완료 상태를 거부한다", () => {
    const w = fixture();
    w.settlements.push({
      id: "s",
      createdAt: "2026-01-01T00:00:00Z",
      proposalId: "proposal-1",
      creatorId: "creator-1",
      amount: 1000,
      memo: "활동비",
      status: "paid",
      paidAt: null,
    });
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow("정산");
  });
});

describe("정산 CSV", () => {
  it("한글 BOM, 쉼표·따옴표·줄바꿈과 스프레드시트 수식을 안전하게 처리한다", () => {
    const w = fixture();
    w.settlements.push({
      id: "s",
      createdAt: "2026-01-01T00:00:00Z",
      proposalId: "proposal-1",
      creatorId: "creator-1",
      amount: 25000,
      memo: '=SUM(1,2)\n"메모"',
      status: "recorded",
      paidAt: null,
    });
    const csv = settlementCsv(w);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"\'=SUM(1,2)\n""메모"""');
    expect(csv).toContain('"25000","미지급 기록"');
    expect(csv).toContain("테스트 크리에이터");
  });
});
