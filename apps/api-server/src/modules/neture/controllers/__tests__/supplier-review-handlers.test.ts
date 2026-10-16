jest.mock("../../../../services/NotificationService.js", () => ({
  notificationService: { createNotification: jest.fn() },
}));
import { createSupplierReviewHandlers } from "../supplier-review-handlers.js";
import {
  SupplierReviewRequestService,
  SupplierReviewError,
} from "../../services/supplier-review-request.service.js";
import { notificationService } from "../../../../services/NotificationService.js";
const response = () => {
  const res: any = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};
afterEach(() => jest.restoreAllMocks());
it("uses the middleware-resolved supplier and session actor, ignoring forged body targets", async () => {
  const submit = jest
    .spyOn(SupplierReviewRequestService.prototype, "transition")
    .mockResolvedValue({ id: "request" });
  const res = response();
  await createSupplierReviewHandlers({} as any).submit(
    {
      supplierId: "owned-supplier",
      params: { requestId: "r" },
      user: { id: "session-actor" },
      body: {
        supplierId: "victim",
        actorId: "forged",
        note: "test",
        version: 1,
      },
    } as any,
    res,
  );
  expect(submit).toHaveBeenCalledWith(
    "owned-supplier",
    "r",
    "session-actor",
    "submit",
    expect.objectContaining({ version: 1 }),
  );
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    data: { id: "request" },
  });
});
it("does not expose internal audit to the supplier list", async () => {
  const list = jest
    .spyOn(SupplierReviewRequestService.prototype, "list")
    .mockResolvedValue({ requests: [] } as any);
  const res = response();
  await createSupplierReviewHandlers({} as any).ownList(
    {
      supplierId: "owned",
      params: { id: "forged" },
      query: { page: "2", operator: "true" },
    } as any,
    res,
  );
  expect(list).toHaveBeenCalledWith("owned", 2, false);
});
it("returns a stale target conflict without converting it into success", async () => {
  jest
    .spyOn(SupplierReviewRequestService.prototype, "transition")
    .mockRejectedValue(
      new SupplierReviewError(
        409,
        "REVIEW_REQUEST_CHANGED",
        "다시 조회해 주세요.",
      ),
    );
  const res = response();
  await createSupplierReviewHandlers({} as any).resolve(
    {
      params: { id: "supplier", requestId: "r" },
      user: { id: "operator" },
      body: {},
    } as any,
    res,
  );
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ success: false }),
  );
});
it("reports a notification failure separately after a successful committed request", async () => {
  jest
    .spyOn(SupplierReviewRequestService.prototype, "create")
    .mockResolvedValue({ id: "request" });
  (notificationService.createNotification as jest.Mock).mockRejectedValue(
    new Error("fixture provider"),
  );
  const ds: any = {
    query: jest.fn().mockResolvedValue([{ user_id: "owner" }]),
  };
  const res = response();
  await createSupplierReviewHandlers(ds).create(
    { params: { id: "supplier" }, user: { id: "operator" }, body: {} } as any,
    res,
  );
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    data: { id: "request", notificationCreated: false },
  });
  expect(notificationService.createNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "owner",
      metadata: expect.objectContaining({
        targetUrl: "/mypage/business-profile",
      }),
    }),
  );
});
