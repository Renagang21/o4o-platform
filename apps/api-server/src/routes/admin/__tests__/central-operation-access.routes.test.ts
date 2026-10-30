import express from "express";
import request from "supertest";
jest.mock("../../../database/connection.js", () => ({ AppDataSource: {} }));
const roles = jest.fn();
const menuKeys = jest.fn().mockResolvedValue(['supplier.suppliers']);
jest.mock('../../../services/admin/central-operation-menu-grants.js', () => ({ centralOperationMenuKeys: (...args: unknown[]) => menuKeys(...args) }));
jest.mock("../../../services/admin/central-operation-access.js", () => ({
  centralOperationRoles: (...args: unknown[]) => roles(...args),
}));
jest.mock("../../../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers["x-user"]) return res.sendStatus(401);
    req.user = { id: req.headers["x-user"] };
    req.authMethod = req.headers["x-method"];
    next();
  },
}));
import { AppDataSource } from "../../../database/connection.js";
import { centralOperationAccessRouter } from "../central-operation-access.routes.js";
const app = express();
app.use("/access", centralOperationAccessRouter);
beforeEach(() => roles.mockReset());
it.each(["password", "kakao", "unknown", undefined])(
  "rejects non-Google proof %s before reading delegation",
  async (method) => {
    let req = request(app).get("/access").set("x-user", "user");
    if (method) req = req.set("x-method", method);
    expect((await req).status).toBe(403);
    expect(roles).not.toHaveBeenCalled();
  },
);
it("rejects anonymous, unassigned, and failed authority reads", async () => {
  expect((await request(app).get("/access")).status).toBe(401);
  roles.mockResolvedValueOnce([]);
  expect(
    (
      await request(app)
        .get("/access")
        .set("x-user", "user")
        .set("x-method", "google")
    ).status,
  ).toBe(403);
  roles.mockRejectedValueOnce(new Error("private"));
  expect(
    (
      await request(app)
        .get("/access")
        .set("x-user", "user")
        .set("x-method", "google")
    ).status,
  ).toBe(503);
});
it("returns only server-resolved current duties", async () => {
  roles.mockResolvedValueOnce(["supplier:operator"]);
  const r = await request(app)
    .get("/access")
    .set("x-user", "user")
    .set("x-method", "google");
  expect(r.status).toBe(200);
  expect(r.body.data.roles).toEqual(["supplier:operator"]);
});

it('keeps recipient/service/menu isolation and prioritizes older unread alerts before the limit',async()=>{
 roles.mockResolvedValueOnce(['supplier:admin']);menuKeys.mockResolvedValueOnce(['supplier.inbox']);
 const query=jest.fn().mockResolvedValueOnce([{id:'older-unread',isRead:false}]).mockResolvedValueOnce([{count:21}]);
 (AppDataSource as any).query=query;
 const r=await request(app).get('/access/notifications').set('x-user','recipient').set('x-method','google');
 expect(r.status).toBe(200);expect(r.body.data.unreadCount).toBe(21);
 expect(query.mock.calls[0][0]).toContain('ORDER BY "isRead" ASC,"createdAt" DESC,id DESC LIMIT 20');
 for(const [sql,params] of query.mock.calls){
  expect(sql).toContain('"userId"=$1');expect(sql).toContain('"organizationId" IS NULL');expect(sql).toContain("metadata->>'operationMenu'");
  expect(params).toEqual(['recipient',['supplier'],['supplier.inbox']]);
 }
});
