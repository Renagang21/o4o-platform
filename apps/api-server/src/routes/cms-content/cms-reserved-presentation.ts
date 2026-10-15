/** Home presentation draft/published pairs are owned by their revision-checked API. */
export const HOME_PRESENTATION_SECTION = 'home-presentation';
export const ORDINARY_CMS_CONTENT_SQL = "metadata->>'section' IS DISTINCT FROM 'home-presentation'";
export function isHomePresentationMetadata(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    (value as Record<string, unknown>).section === HOME_PRESENTATION_SECTION;
}

/** TypeORM PostgreSQL UPDATE/DELETE returns [rows, affected], unlike SELECT. */
export function cmsMutationRows<T>(result: T[] | [T[], number]): T[] {
  return Array.isArray(result[0]) && typeof result[1] === 'number'
    ? result[0] as T[] : result as T[];
}
