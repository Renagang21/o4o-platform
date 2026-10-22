jest.mock(
  "@o4o/forum-core/entities",
  () => ({
    ForumPost: class {},
    ForumComment: class {},
    ForumPostLike: class {},
    ForumCategoryRequest: class {},
    PostStatus: { PUBLISHED: "publish", DRAFT: "draft" },
    PostType: { DISCUSSION: "discussion" },
  }),
  { virtual: true },
);
jest.mock(
  "@o4o/forum-core",
  () => ({ blocksToText: () => "", normalizeMetadata: (v: unknown) => v }),
  { virtual: true },
);
jest.mock("../../modules/auth/entities/User.js", () => ({ User: class {} }));
jest.mock("../../database/connection.js", () => ({
  AppDataSource: { getRepository: () => repo },
}));
import { ForumPostController } from "./ForumPostController.js";
const qb: any = {
  leftJoinAndSelect: () => qb,
  where: () => qb,
  andWhere: () => qb,
  getOne: jest.fn(),
};
const repo = {
  createQueryBuilder: () => qb,
  update: jest.fn(async () => undefined),
  findOne: jest.fn(async () => null),
};
const response = () => {
  const r: any = { status: jest.fn(), json: jest.fn() };
  r.status.mockReturnValue(r);
  return r;
};
class Posts extends ForumPostController {
  protected checkClosedForumAccess = async () => ({ allowed: true });
}
beforeEach(() => {
  jest.clearAllMocks();
  qb.getOne.mockResolvedValue({
    id: "draft-id",
    title: "private",
    status: "draft",
    authorId: "author",
    content: [],
  });
});
it.each([undefined, "other", "operator"])(
  "a private draft detail is indistinguishable from a missing post to %s",
  async (userId) => {
    const res = response();
    await new Posts().getPost(
      {
        params: { id: "draft-id" },
        user: userId
          ? { id: userId, roles: ["platform:super_admin"] }
          : undefined,
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(repo.update).not.toHaveBeenCalled();
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("private");
  },
);
it("the author can continue editing the existing private draft", async () => {
  const res = response();
  await new Posts().getPost(
    { params: { id: "draft-id" }, user: { id: "author", roles: [] } } as any,
    res,
  );
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: "draft-id" }),
    }),
  );
});
it("published posts retain ordinary detail access", async () => {
  qb.getOne.mockResolvedValue({
    id: "post-id",
    title: "published",
    status: "publish",
    authorId: "author",
    content: [],
  });
  const res = response();
  await new Posts().getPost({ params: { id: "post-id" } } as any, res);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ success: true }),
  );
});
