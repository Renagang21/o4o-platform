import express from "express";
import request from "supertest";
import { createSellerRecruitmentController } from "../controllers/seller-recruitment.controller.js";
import {
  confirmRecruitmentSupplyPrice,
  RecruitmentSupplyPriceError,
} from "../services/recruitment-supply-price.service.js";
const id = "e2a35177-1f09-41de-9c11-651ee17f807b";
jest.mock("../../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ error: "UNAUTHORIZED" }),
}));
jest.mock("../../../database/connection.js", () => ({ AppDataSource: {} }));
jest.mock("../../../utils/store-owner.utils.js", () => ({
  createRequireStoreOwner: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock("../../../middleware/neture-main-membership.middleware.js", () => ({
  requireNetureMainMembership: () => (_req: any, _res: any, next: any) =>
    next(),
}));
jest.mock("../services/recruitment-supply-price.service.js", () => {
  const actual = jest.requireActual(
    "../services/recruitment-supply-price.service.js",
  );
  return { ...actual, confirmRecruitmentSupplyPrice: jest.fn() };
});
const createRecruitment = jest.fn();
function app() {
  const instance = express();
  instance.use(express.json());
  instance.use((req: any, _res, next) => {
    if (req.header("x-fixture-user"))
      req.user = { id: req.header("x-fixture-user") };
    next();
  });
  instance.use(
    createSellerRecruitmentController({
      sellerRecruitmentService: { createRecruitment } as any,
      requireActiveSupplier: (req: any, res, next) =>
        req.user.id === "owner"
          ? next()
          : res.status(403).json({ error: "SUPPLIER_REQUIRED" }),
    }),
  );
  return instance;
}
beforeEach(() => jest.clearAllMocks());
it("runs authentication and active supplier guards before the price handler", async () => {
  expect(
    (
      await request(app())
        .patch(`/recruitments/${id}/supply-price`)
        .send({ supplyUnitPrice: 1000 })
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app())
        .patch(`/recruitments/${id}/supply-price`)
        .set("x-fixture-user", "other")
        .send({ supplyUnitPrice: 1000 })
    ).status,
  ).toBe(403);
  expect(confirmRecruitmentSupplyPrice).not.toHaveBeenCalled();
});
it("uses only the authenticated actor and returns an idempotent confirmation", async () => {
  (confirmRecruitmentSupplyPrice as jest.Mock).mockResolvedValue({
    id,
    supplyUnitPrice: 1000,
    idempotent: true,
  });
  const r = await request(app())
    .patch(`/recruitments/${id}/supply-price`)
    .set("x-fixture-user", "owner")
    .send({ supplyUnitPrice: 1000, userId: "foreign", supplierId: "foreign" });
  expect(r.status).toBe(200);
  expect(r.body.data.idempotent).toBe(true);
  expect(
    (confirmRecruitmentSupplyPrice as jest.Mock).mock.calls[0].slice(1),
  ).toEqual(["owner", id, 1000]);
});
it.each([
  ["INVALID_SUPPLY_PRICE", 400],
  ["NOT_FOUND", 404],
  ["SUPPLY_PRICE_TARGET_UNSUPPORTED", 409],
  ["SUPPLY_PRICE_ALREADY_CONFIRMED", 409],
  ["RECRUITMENT_CLOSED", 409],
])("reports %s without claiming a price save", async (code, status) => {
  (confirmRecruitmentSupplyPrice as jest.Mock).mockRejectedValue(
    new RecruitmentSupplyPriceError(String(code), Number(status)),
  );
  const r = await request(app())
    .patch(`/recruitments/${id}/supply-price`)
    .set("x-fixture-user", "owner")
    .send({ supplyUnitPrice: 1000 });
  expect(r.status).toBe(status);
  expect(r.body).toMatchObject({ success: false, error: code });
});
it("rejects malformed IDs before accessing the database", async () => {
  expect(
    (
      await request(app())
        .patch("/recruitments/invalid/supply-price")
        .set("x-fixture-user", "owner")
        .send({ supplyUnitPrice: 1000 })
    ).status,
  ).toBe(400);
  expect(confirmRecruitmentSupplyPrice).not.toHaveBeenCalled();
});
it("passes the explicit supply price through the existing creation contract", async () => {
  createRecruitment.mockResolvedValue({ success: true, data: { id } });
  const r = await request(app())
    .post("/recruitments")
    .set("x-fixture-user", "owner")
    .send({
      masterId: "master",
      serviceKeys: ["neture"],
      supplyUnitPrice: 2100,
    });
  expect(r.status).toBe(201);
  expect(createRecruitment).toHaveBeenCalledWith(
    "owner",
    expect.objectContaining({ supplyUnitPrice: 2100, serviceKeys: ["neture"] }),
  );
});
