import { expect, it } from "vitest";
import { centralTaskHref } from "./central-operation-navigation";
it.each([
  "/operator/market-trial?tab=exceptions&type=payment_unconfirmed",
  "/operator/market-trial?tab=exceptions&type=refund_remaining",
  "/operator/market-trial?tab=forum-failures",
  "/operator/market-trial/synthetic-project/offline-operations",
])(
  "opens the native funding workflow without losing its selection: %s",
  (path) => {
    expect(centralTaskHref("funding", path)).toBe(
      path.replace('/operator/market-trial', '/operations/funding/funding').replace('/offline-operations',''),
    );
  },
);
it.each([
  ["funding", "/operator/market-trial", "/operations/funding/funding"],
  ["supplier", "/operator/suppliers", "/operations/supplier/suppliers"],
  ["lecture", "/operator/courses", "/operations/lecture/courses"],
  ["neture", "/operator/pharmacy-memberships", "/operations/neture/pharmacies"],
  ["community", "/operator/community/home", "/operations/community/editorial"],
])("maps only the implemented %s list workflow", (service, path, target) =>
  expect(centralTaskHref(service, path)).toBe(target),
);
it.each([
  [
    "/operator/courses/synthetic-course",
    "/operations/lecture/courses/synthetic-course",
  ],
  [
    "/operator/courses?status=submitted#review",
    "/operations/lecture/courses?status=submitted#review",
  ],
])(
  "preserves the native detail and query target: %s",
  (path, target) => expect(centralTaskHref("lecture", path)).toBe(target),
);
it.each([
  "https://elsewhere.invalid/path",
  "javascript:alert(1)",
  "//elsewhere.invalid/path",
])("never forwards a foreign origin or unsafe scheme: %s", (path) => {
  expect(centralTaskHref("funding", path)).toBe("/operations/funding/members");
});

it('keeps common account lookup separate from Neture service membership work',()=>{
 expect(centralTaskHref('neture','/operator/users')).toBe('/operations/neture/service-members');
 expect(centralTaskHref('neture','/operator/users/synthetic-member')).toBe('/operations/neture/service-members/synthetic-member');
});

it.each([
 ['neture','/operator/service-contact/neture','/operations/neture/inbox?contactService=neture'],
 ['neture','/operator/service-contact/store','/operations/neture/inbox?contactService=store'],
 ['neture','/operator/inbox/open/service/hospital','/operations/neture/inbox?contactService=hospital'],
 ['neture','/operator/service-contact/kpa-branch','/operations/neture/inbox?contactService=kpa-branch'],
 ['pharmcoop','/operator/service-contact/pharmcoop','/operations/pharmcoop/inbox'],
 ['lecture','/operator/inbox/open/service/lecture','/operations/lecture/contact'],
])('opens %s contact alerts in the central receiving workspace', (service,path,target) => {
 expect(centralTaskHref(service,path)).toBe(target);
 expect(centralTaskHref(service,`https://admin.neture.co.kr${target}`)).toBe(target);
});
