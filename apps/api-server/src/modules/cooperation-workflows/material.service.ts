import { assertOperator } from "./access.js";
import type { DataSource } from "typeorm";
import { rowsOf, NeturePharmacyError } from "../neture-pharmacy/constants.js";
import { type InboxScope } from "../contact-inquiry/inbox-scope.js";
import { recordOperation } from "../../services/operations/operation-audit.js";
import { conflict, educationUrl, shortText } from "./model.js";
export class CooperationMaterialService {
  constructor(private readonly ds: DataSource) {}
  async list(scope: InboxScope, operator: boolean, offset = 0) {
    const where =
      "semi_franchise_id=$1 AND ($2::boolean OR status='published')";
    const items = await this.ds.query(
      `SELECT id,title,summary,body,attachments,tags,status,category,education_url,revision,updated_at FROM semi_franchise_contents
      WHERE ${where} ORDER BY updated_at DESC,id LIMIT 100 OFFSET $3`,
      [scope.businessId, operator, offset],
    );
    const [count] = await this.ds.query(
      `SELECT count(*)::int AS total FROM semi_franchise_contents WHERE ${where}`,
      [scope.businessId, operator],
    );
    return { items, total: count.total };
  }
  async history(scope: InboxScope, id: string) {
    const [content] = await this.ds.query(
      "SELECT id FROM semi_franchise_contents WHERE id=$1 AND semi_franchise_id=$2",
      [id, scope.businessId],
    );
    if (!content)
      throw new NeturePharmacyError(
        404,
        "CONTENT_NOT_FOUND",
        "이 공간의 자료가 아닙니다.",
      );
    return this.ds.query(
      "SELECT revision,snapshot,created_at FROM cooperation_material_revisions WHERE content_id=$1 ORDER BY revision DESC",
      [id],
    );
  }
  async update(
    scope: InboxScope,
    user: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    const category = shortText(body.category, 80),
      url = educationUrl(body.educationUrl);
    return this.ds.transaction(async (manager) => {
      await assertOperator(manager, scope, user);
      const [content] = await manager.query(
        "SELECT * FROM semi_franchise_contents WHERE id=$1 AND semi_franchise_id=$2 FOR UPDATE",
        [id, scope.businessId],
      );
      if (!content)
        throw new NeturePharmacyError(
          404,
          "CONTENT_NOT_FOUND",
          "이 공간의 자료가 아닙니다.",
        );
      if (content.revision !== body.revision) throw conflict();
      const [saved] = rowsOf(
        await manager.query(
          `UPDATE semi_franchise_contents SET category=$3,education_url=$4,updated_by=$5,updated_at=clock_timestamp()
        WHERE id=$1 AND semi_franchise_id=$2 RETURNING id,revision`,
          [id, scope.businessId, category, url, user],
        ),
      );
      await recordOperation(
        manager,
        "neture",
        user,
        "cooperation.material.classify",
        { contentId: id, revision: saved.revision, category },
      );
      return saved;
    });
  }
}
