import { isValidCartQuantity } from "./worktableCart";

function key(organizationId: string, serviceKey: string) {
  return `o4o.worktable.preselect:${encodeURIComponent(organizationId)}:${encodeURIComponent(serviceKey)}`;
}

/** Local handoff only: it grants no supply approval or order authority. */
export function saveWorktablePreselection(
  organizationId: string,
  serviceKey: string,
  quantities: Record<string, number>,
): boolean {
  if (!organizationId || !serviceKey) return false;
  try {
    sessionStorage.setItem(
      key(organizationId, serviceKey),
      JSON.stringify({ organizationId, serviceKey, quantities }),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeWorktablePreselection(
  organizationId: string,
  serviceKey: string,
): Record<string, number> {
  if (!organizationId || !serviceKey) return {};
  try {
    // Old unscoped handoffs cannot establish which store owns the selection.
    sessionStorage.removeItem("worktable_preselect");
    const storageKey = key(organizationId, serviceKey),
      raw = sessionStorage.getItem(storageKey);
    if (!raw) return {};
    sessionStorage.removeItem(storageKey);
    const value = JSON.parse(raw);
    if (
      value?.organizationId !== organizationId ||
      value?.serviceKey !== serviceKey ||
      !value.quantities ||
      typeof value.quantities !== "object" ||
      Array.isArray(value.quantities)
    )
      return {};
    const quantities: Record<string, number> = {};
    for (const [id, quantity] of Object.entries(value.quantities)) {
      if (isValidCartQuantity(quantity) && Number.isSafeInteger(quantity))
        quantities[id] = quantity;
    }
    return quantities;
  } catch {
    return {};
  }
}
