/** A finite transport alias, not a service identity, membership, or caller-selected origin. */
export function getHandoffServiceAlias(key: unknown) {
  // Existing My Home/store clients keep this transport target; the issued account
  // session must match Pharmacy's current Origin scope, without creating membership.
  if (key === "kpa-society")
    return {
      key: "kpa-society",
      sessionServiceKey: "neture",
      origin: "https://pharmacy.neture.co.kr",
    } as const;
  if (key === "pharmcoop" || key === "megapharm")
    return {
      key,
      sessionServiceKey: "neture",
      origin: `https://${key}.neture.co.kr`,
    } as const;
  return key === "carepharm"
    ? ({
        key: "carepharm",
        sessionServiceKey: "neture",
        origin: "https://carepharm.neture.co.kr",
      } as const)
    : undefined;
}

/** Restrict the alias to the screens it actually serves. No arbitrary redirect/query contract. */
export function isCarePharmHandoffPath(path: string): boolean {
  // Reject ASCII controls rather than allowing URL normalization to discard them.
  // eslint-disable-next-line no-control-regex
  if (path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) return false;
  const url = new URL(path, "https://carepharm.neture.co.kr");
  const pathname = path.split(/[?#]/)[0];
  // Reject URL normalization, encoded separators, and lookalike business namespaces.
  if (
    url.origin !== "https://carepharm.neture.co.kr" ||
    url.pathname !== pathname
  )
    return false;
  if (url.hash && (pathname !== "/" || !["#about", "#news"].includes(url.hash)))
    return false;
  const memberPage =
    /^\/(?:my\/participation|materials|tools|terms|policy|privacy|contact|news\/[A-Za-z0-9_-]{1,160})?$/.test(
      pathname,
    );
  const operatorPage =
    /^\/operator(?:\/semi-franchises(?:\/carepharm\/contents\/(?:new|[A-Fa-f0-9-]{36}\/edit))?|\/home-presentation\/carepharm|\/inbox\/business\/carepharm)?$/.test(
      pathname,
    );
  const currentForumPage =
    /^\/community(?:\/(?:posts|write|my-posts|request|owned|manage)|\/post\/[A-Za-z0-9_-]{1,160}|\/owned\/[A-Fa-f0-9-]{36}\/members)?$/.test(
      pathname,
    );
  const forumPage =
    /^\/communities\/business(?:%3[Aa]|:)carepharm\/forum(?:\/(?:posts|write|my-posts|request|owned)|\/post\/[A-Za-z0-9_-]{1,160}|\/owned\/[A-Fa-f0-9-]{36}\/members)?$/.test(
      pathname,
    );
  if (!memberPage && !forumPage && !currentForumPage && !operatorPage)
    return false;
  return isCarePharmQuery(
    url.searchParams,
    operatorPage,
    forumPage || currentForumPage,
  );
}

function isCarePharmQuery(
  params: URLSearchParams,
  operatorPage: boolean,
  forumPage: boolean,
): boolean {
  const keys = [...params.keys()];
  if (keys.length !== new Set(keys).size) return false;
  return keys.every((key) => {
    const value = params.get(key)!;
    if (key === "store" || key === "category" || key === "content")
      return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
    if (operatorPage && key === "key") return value === "carepharm";
    if (operatorPage && key === "tab") return /^[a-z-]{1,40}$/.test(value);
    if ((forumPage || operatorPage) && key === "q")
      return (
        value.length <= 120 &&
        !Array.from(value).some(
          (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
        )
      );
    if (key === "page") return /^[1-9]\d{0,5}$/.test(value);
    return key === "board" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
  });
}
