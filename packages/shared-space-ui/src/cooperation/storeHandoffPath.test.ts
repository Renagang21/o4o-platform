import { expect, it } from "vitest";
import { businessStoreHandoffPath } from "./storeHandoffPath";
const id = "11111111-1111-4111-8111-111111111111";
it.each(["product", "content"])(
  "keeps business, pharmacy and exact %s identity without granting access",
  (kind) => {
    const path = businessStoreHandoffPath(
      "carepharm",
      "store-a",
      `${kind}:${id}`,
    );
    const params = new URL(path, "https://store.test").searchParams;
    expect(params.get("store")).toBe("store-a");
    const destination = new URL(params.get("returnTo")!, "https://store.test");
    expect(destination.pathname).toBe(
      kind === "product"
        ? "/store/pharmacy/supply"
        : "/store/pharmacy/contents",
    );
    expect(
      destination.searchParams.get(kind === "product" ? "proposal" : "content"),
    ).toBe(id);
    expect(
      destination.searchParams.get(kind === "product" ? "source" : "business"),
    ).toBe(kind === "product" ? "sf:carepharm" : "carepharm");
  },
);
it.each(["product:../other", "content:missing", "other:" + id])(
  "rejects malformed item hints %s",
  (item) =>
    expect(() =>
      businessStoreHandoffPath("carepharm", "store-a", item),
    ).toThrow(),
);
