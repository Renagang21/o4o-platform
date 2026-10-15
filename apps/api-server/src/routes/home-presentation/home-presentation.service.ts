import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import {
  HOME_SURFACE_INFO,
  parseHomePresentation,
  visibleHomePresentation,
  type HomeSurface,
  type HomePresentationState,
} from "@o4o/types";

export interface PresentationScope {
  surface: HomeSurface;
  organizationId: string | null;
}
export class PresentationConflict extends Error {}
const SECTION = "home-presentation";

/** Existing CMS metadata storage. Draft rows never enter the ordinary published content feeds. */
export class HomePresentationService {
  constructor(private readonly ds: DataSource) {}
  private params(scope: PresentationScope) {
    return [
      HOME_SURFACE_INFO[scope.surface].serviceKey,
      scope.organizationId,
      scope.surface,
      SECTION,
    ];
  }
  private query = `SELECT id, metadata FROM cms_contents WHERE "serviceKey" = $1 AND "organizationId" IS NOT DISTINCT FROM $2::uuid AND metadata->>'surface' = $3 AND metadata->>'section' = $4 ORDER BY "createdAt", id LIMIT 1`;
  async read(scope: PresentationScope): Promise<HomePresentationState> {
    const rows = await this.ds.query(this.query, this.params(scope));
    return (
      rows[0]?.metadata?.presentation ?? {
        revision: 0,
        draft: null,
        published: null,
      }
    );
  }
  async publicRead(scope: PresentationScope) {
    const state = await this.read(scope);
    return state.published
      ? visibleHomePresentation(parseHomePresentation(state.published))
      : null;
  }
  async save(
    scope: PresentationScope,
    value: unknown,
    expectedRevision: number,
    publish: boolean,
    userId: string,
  ): Promise<HomePresentationState> {
    const config = parseHomePresentation(value);
    return this.ds.transaction(async (manager) => {
      // Serialize first insert as well as edits; no unique index/migration required.
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [
          `home-presentation:${scope.surface}:${scope.organizationId ?? "service"}`,
        ],
      );
      const rows = await manager.query(
        this.query + " FOR UPDATE",
        this.params(scope),
      );
      const previous: HomePresentationState = rows[0]?.metadata
        ?.presentation ?? { revision: 0, draft: null, published: null };
      if (previous.revision !== expectedRevision)
        throw new PresentationConflict(
          "다른 운영자가 수정했습니다. 다시 불러온 뒤 변경 내용을 확인해 주세요.",
        );
      const next = {
        revision: previous.revision + 1,
        draft: config,
        published: publish ? config : previous.published,
      };
      const metadata = {
        ...(rows[0]?.metadata ?? {}),
        section: SECTION,
        surface: scope.surface,
        presentation: next,
      };
      if (rows[0]) {
        await manager.query(
          'UPDATE cms_contents SET metadata = $2::jsonb, "updatedAt" = NOW() WHERE id = $1',
          [rows[0].id, JSON.stringify(metadata)],
        );
      } else {
        await manager.query(
          `INSERT INTO cms_contents (id, "serviceKey", "organizationId", type, title, status, metadata, "authorRole", "visibilityScope", "createdBy", "createdAt", "updatedAt") VALUES ($1,$2,$3,'hero',$4,'draft',$5::jsonb,'service_admin','service',$6,NOW(),NOW())`,
          [
            randomUUID(),
            ...this.params(scope).slice(0, 2),
            `${HOME_SURFACE_INFO[scope.surface].name} 홈 화면 구성`,
            JSON.stringify(metadata),
            userId,
          ],
        );
      }
      return next;
    });
  }
}
