import { Raw } from "typeorm";
/** Reserved rows are owned by dedicated APIs; generic CMS must not bypass their visibility or writes. */
export const HOME_PRESENTATION_SECTION = "home-presentation";
// Legacy consumers prepend an SQL table alias (c., cms.); keep one column reference and no leading parenthesis.
export const ORDINARY_CMS_CONTENT_SQL =
  "metadata->>'section' IN ('home-presentation','community-editorial') IS NOT TRUE";
export function isHomePresentationMetadata(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [HOME_PRESENTATION_SECTION, "community-editorial"].includes(
      String((value as Record<string, unknown>).section),
    )
  );
}

/** TypeORM PostgreSQL UPDATE/DELETE returns [rows, affected], unlike SELECT. */
export function cmsMutationRows<T>(result: T[] | [T[], number]): T[] {
  return Array.isArray(result[0]) && typeof result[1] === "number"
    ? (result[0] as T[])
    : (result as T[]);
}

/** SQL-level exclusion keeps pagination/counts correct as well as hiding reserved payloads. */
export const ordinaryCmsMetadata = () =>
  Raw((alias) => {
    const column = alias
      .split(".")
      .map((part) => '"' + part.replaceAll('"', '""') + '"')
      .join(".");
    return `${column}->>'section' IN ('home-presentation','community-editorial') IS NOT TRUE`;
  });
