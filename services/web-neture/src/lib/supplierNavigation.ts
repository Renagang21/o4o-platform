/** 화면 복귀 전용. 외부 URL이나 다른 업무공간으로 복귀하지 않는다. 인가는 기존 API/guard가 수행한다. */
export function supplierReturnPath(
  value: string | null,
  fallback: string,
): string {
  if (!value) return fallback;
  const pathname = value.split("?")[0];
  return [
    "/supplier/orders/manage",
    "/supplier/orders",
    "/supplier/products",
    "/supplier/store-materials-status",
  ].includes(pathname) && !value.includes("#")
    ? value
    : fallback;
}

export function supplierEditLink(
  path: string,
  params: Record<string, string>,
  returnTo: string,
): string {
  return `${path}?${new URLSearchParams({ ...params, returnTo })}`;
}
