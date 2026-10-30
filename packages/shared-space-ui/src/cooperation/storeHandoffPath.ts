/** Navigation hint only. Store rechecks the selected organization and supply/material access. */
export function businessStoreHandoffPath(
  businessKey: string,
  organizationId: string,
  itemId: string,
): string {
  const match =
    /^(product|content):([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.exec(
      itemId,
    );
  if (!match || !/^[a-z0-9][a-z0-9-]*$/i.test(businessKey) || !organizationId)
    throw new Error("연결할 사업·자료를 확인하지 못했습니다.");
  const destination =
    match[1] === "product"
      ? `/store/pharmacy/supply?${new URLSearchParams({ source: `sf:${businessKey}`, proposal: match[2] })}`
      : `/store/pharmacy/contents?${new URLSearchParams({ business: businessKey, content: match[2] })}`;
  return `/select-store?${new URLSearchParams({ store: organizationId, returnTo: destination })}`;
}
