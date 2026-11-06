import { hasApprovedStorePharmacist } from "../store-pharmacist-qualification";
import { hasApprovedPharmacist } from "../pharmacist-qualification.service";
jest.mock("../pharmacist-qualification.service", () => ({
  hasApprovedPharmacist: jest.fn(),
}));
const db = { query: jest.fn() };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(hasApprovedPharmacist).mockResolvedValue(false);
});
it("preserves normal verified pharmacist authority without any demo lookup", async () => {
  jest.mocked(hasApprovedPharmacist).mockResolvedValue(true);
  expect(await hasApprovedStorePharmacist(db, "member", "pharmacy")).toBe(true);
  expect(db.query).not.toHaveBeenCalled();
});
it("never grants a synthetic qualification without a resolved pharmacy", async () => {
  expect(await hasApprovedStorePharmacist(db, "member", null)).toBe(false);
  expect(db.query).not.toHaveBeenCalled();
});
it("uses registry identity and exact owned approved pharmacy, with no email or role-name shortcut", async () => {
  db.query.mockResolvedValue([{ approved: true }]);
  expect(await hasApprovedStorePharmacist(db, "owner", "demo-pharmacy")).toBe(
    true,
  );
  const [sql, parameters] = db.query.mock.calls[0];
  expect(parameters).toEqual(["owner", "demo-pharmacy"]);
  for (const clause of [
    "d.demo_type='STORE_OWNER'",
    "d.is_active=true",
    "om.organization_id=$2",
    "om.role='owner'",
    "om.left_at IS NULL",
    "pm.status='active'",
    "pm.applicant_user_id=d.user_id",
    "sm.service_key='neture'",
    "sm.status='active'",
    "p.qualification_status<>'unrequested'",
  ])
    expect(sql).toContain(clause);
  expect(sql).not.toMatch(/INSERT|UPDATE|email\s*=/i);
});
it.each([false, null, undefined, "true"])(
  "rejects non-approved registry result %s",
  async (value) => {
    db.query.mockResolvedValue([{ approved: value }]);
    expect(
      await hasApprovedStorePharmacist(db, "member", "other-pharmacy"),
    ).toBe(false);
  },
);
it("fails closed on database failure", async () => {
  db.query.mockRejectedValue(new Error("unavailable"));
  await expect(
    hasApprovedStorePharmacist(db, "member", "pharmacy"),
  ).rejects.toThrow("unavailable");
});
