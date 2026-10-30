import type { DataSource } from "typeorm";
import {
  ExternalAiError,
  type ExternalAiSettings,
  type Workspace,
  targetKinds,
  workspaceIdSchema,
} from "../contracts.js";
import { assertEnabled } from "../settings/settings.service.js";
import { SupplierAdapter } from "./supplier.adapter.js";
import { StoreAdapter } from "./store.adapter.js";
import { OrganizationAdapter } from "./organization.adapter.js";
import { CommunityAdapter } from "./community.adapter.js";
import type { ContentAdapter, Queryable } from "./adapter.js";

type Kind = Workspace["kind"];
const destinations: Record<Kind, string[]> = {
  supplier: ["library_document", "store_description"],
  store: ["store_document", "store_product_content"],
  organization: ["business_content"],
  community: ["community_post"],
};
export class AdapterRegistry {
  readonly adapters: Record<Kind, ContentAdapter>;
  constructor(
    readonly db: DataSource,
    origin: URL,
    storeOrigin?: URL,
  ) {
    this.adapters = {
      supplier: new SupplierAdapter(db, origin),
      store: new StoreAdapter(db, storeOrigin),
      organization: new OrganizationAdapter(db, origin),
      community: new CommunityAdapter(db),
    };
  }
  resolve(workspaceId: string, destination?: string) {
    if (!workspaceIdSchema.safeParse(workspaceId).success)
      throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
    const split = workspaceId.indexOf(":");
    // Existing supplier-only grants use raw supplier UUIDs; other kinds are explicitly namespaced.
    const kind = (split < 0 ? "supplier" : workspaceId.slice(0, split)) as Kind;
    const id = split < 0 ? workspaceId : workspaceId.slice(split + 1);
    if (destination && !destinations[kind].includes(destination))
      throw new ExternalAiError("DESTINATION_FORBIDDEN", 403);
    return { adapter: this.adapters[kind], kind, id };
  }
  async authorize(
    userId: string,
    workspaceId: string,
    write: boolean,
    db: Queryable = this.db,
    settings?: ExternalAiSettings,
  ) {
    const current = settings ?? (await assertEnabled(db, write, true)),
      resolved = this.resolve(workspaceId);
    if (
      !current.targets[resolved.kind].read ||
      (write && !current.targets[resolved.kind].write)
    )
      throw new ExternalAiError("EXTERNAL_AI_DISABLED", 403);
    await resolved.adapter.authorize(userId, resolved.id, write, db);
    return resolved;
  }
  async workspaces(
    userId: string,
    db: Queryable = this.db,
    settings?: ExternalAiSettings,
  ): Promise<Workspace[]> {
    const result: Workspace[] = [];
    for (const kind of targetKinds) {
      if (settings && !settings.targets[kind].read) continue;
      try {
        const spaces = await this.adapters[kind].workspaces(userId, db);
        for (const space of spaces) {
          // Reuse the same authorization on discovery as on invocation; no terms bypass through a list.
          const { id } = this.resolve(space.id);
          try {
            await this.adapters[kind].authorize(userId, id, false, db);
          } catch (error) {
            if (error instanceof ExternalAiError && error.status < 500)
              continue;
            throw error;
          }
          result.push({
            ...space,
            writable:
              space.writable && (!settings || settings.targets[kind].write),
          });
        }
      } catch (error) {
        if (!(error instanceof ExternalAiError && error.status < 500))
          throw error;
      }
    }
    return result;
  }
}
