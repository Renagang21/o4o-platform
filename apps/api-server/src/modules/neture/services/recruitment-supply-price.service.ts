import type { DataSource } from "typeorm";
import { SELLER_RECRUITMENT_TABLE } from "../entities/SellerRecruitment.entity.js";

export class RecruitmentSupplyPriceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
export function validRecruitmentSupplyPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 2147483647
  );
}

/** Existing nullable price is confirmed once; retries never change an already agreed price. */
export async function confirmRecruitmentSupplyPrice(
  db: DataSource,
  userId: string,
  id: string,
  price: unknown,
) {
  if (!validRecruitmentSupplyPrice(price))
    throw new RecruitmentSupplyPriceError("INVALID_SUPPLY_PRICE", 400);
  return db.transaction(async (manager) => {
    const [row] = await manager.query(
      `SELECT id, service_id, semi_franchise_id, supply_unit_price, status
      FROM ${SELLER_RECRUITMENT_TABLE} WHERE id=$1 AND seller_id=$2 FOR UPDATE`,
      [id, userId],
    );
    if (!row) throw new RecruitmentSupplyPriceError("NOT_FOUND", 404);
    // A price on legacy kpa-society/neture-pharmacy rows changes their classification. Never do that here.
    if (row.service_id !== "neture" || row.semi_franchise_id)
      throw new RecruitmentSupplyPriceError(
        "SUPPLY_PRICE_TARGET_UNSUPPORTED",
        409,
      );
    if (row.supply_unit_price !== null) {
      if (row.supply_unit_price !== price)
        throw new RecruitmentSupplyPriceError(
          "SUPPLY_PRICE_ALREADY_CONFIRMED",
          409,
        );
      return { id: row.id, supplyUnitPrice: price, idempotent: true };
    }
    if (row.status !== "recruiting")
      throw new RecruitmentSupplyPriceError("RECRUITMENT_CLOSED", 409);
    await manager.query(
      `UPDATE ${SELLER_RECRUITMENT_TABLE} SET supply_unit_price=$2,updated_at=now() WHERE id=$1`,
      [id, price],
    );
    return { id: row.id, supplyUnitPrice: price, idempotent: false };
  });
}
