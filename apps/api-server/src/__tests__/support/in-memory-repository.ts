/**
 * TypeORM repository 의 in-memory 대역 (테스트 support · 테스트 파일이 아니다)
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 커뮤니티·분회 lifecycle spec 이 같은 `create` / `save` / `findOne` 구현을 각자 갖고 있었다.
 * 배열 하나를 감싸는 plumbing 이라 내용이 완전히 같고, 한쪽만 고치면 두 spec 의 전제가
 * 조용히 달라진다. 저장소 전체 중복 지표에도 그대로 잡힌다.
 *
 * **의도적으로 얕다**: 저장소 계약(여기 세 메서드)만 흉내내고 쿼리·트랜잭션은 각 spec 이
 * 자기 도메인에 맞게 둔다. 공통화가 테스트의 독립성을 먹지 않도록.
 */
export type Row = Record<string, any>;

export interface InMemoryRepository {
  create(o: Row): Row;
  save(o: Row): Promise<Row>;
  findOne(opts: { where: Row }): Promise<Row | null>;
}

/**
 * @param list    이 repository 가 다루는 행 배열 (호출부가 소유한다 — 초기화도 호출부에서)
 * @param nextId  id 가 없는 행에 부여할 값 생성기
 */
export function inMemoryRepository(list: Row[], nextId: () => string): InMemoryRepository {
  return {
    create: (o) => ({ ...o }),
    save: async (o) => {
      // id 가 없으면 새 행 · 있으면 기존 참조를 그대로 둔다(같은 객체를 두 번 넣지 않는다).
      if (!o.id) {
        o.id = nextId();
        list.push(o);
      } else if (!list.includes(o)) {
        list.push(o);
      }
      return o;
    },
    findOne: async ({ where }) =>
      list.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
  };
}
