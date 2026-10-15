import type { DataSource } from 'typeorm';
import { NETURE_PHARMACY_SERVICE_KEY } from '../constants.js';

/** Existing buyer + selected-store scope, enriched with that order's supplier fulfillment. */
export function listPharmacyOrders(dataSource: Pick<DataSource, 'query'>, buyerId: string, organizationId: string) {
  return dataSource.query(
    `WITH own_orders AS MATERIALIZED (
       SELECT * FROM checkout_orders
        WHERE "buyerId" = $1 AND "sellerOrganizationId" = $2 AND metadata->>'serviceKey' = $3
        ORDER BY "createdAt" DESC, id DESC LIMIT 200
     ), fulfillment AS (
       SELECT DISTINCT ON (n.metadata->>'checkoutOrderId')
              n.id, n.status, n.metadata->>'checkoutOrderId' AS checkout_id
         FROM neture_orders n
         JOIN own_orders c ON n.metadata->>'checkoutOrderId' = c.id::text
                          AND n.metadata->>'supplierId' = c."supplierId"
        WHERE n.service_key = $3
        ORDER BY n.metadata->>'checkoutOrderId', n.created_at, n.id
     )
     SELECT c.id, c."orderNumber", c.status::text AS status, c."paymentStatus"::text AS "paymentStatus",
            c."totalAmount", c."shippingFee", c."createdAt", c."paidAt", c."supplierId", c.items,
            c.metadata->>'paymentGroupId' AS "paymentGroupId", c.metadata->>'receiverKey' AS "receiverKey",
            COALESCE((c.metadata->>'testPayment')::boolean, false) AS "testPayment",
            f.status::text AS "fulfillmentStatus", shipment.data AS shipment
       FROM own_orders c
       LEFT JOIN fulfillment f ON f.checkout_id = c.id::text
       LEFT JOIN LATERAL (
         SELECT jsonb_build_object(
           'status', s.status, 'carrierName', s.carrier_name, 'trackingNumber', s.tracking_number,
           'shippedAt', s.shipped_at, 'deliveredAt', s.delivered_at
         ) AS data
           FROM neture_shipments s
          WHERE s.order_id = f.id AND s.supplier_id::text = c."supplierId"
          ORDER BY s.created_at DESC, s.id DESC LIMIT 1
       ) shipment ON true
      ORDER BY c."createdAt" DESC, c.id DESC`,
    [buyerId, organizationId, NETURE_PHARMACY_SERVICE_KEY],
  );
}
