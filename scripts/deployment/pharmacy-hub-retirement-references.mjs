/** Read-only, aggregate-only census of PH references not protected by foreign keys. */
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
const ph=value=>`(${value}::text = ANY($1::text[]) OR left(${value}::text,13)='pharmacy-hub:')`;
const orderScope=['serviceKey','service_key','source','sourceService'].map(k=>`o.metadata->>'${k}' = ANY($1::text[])`).join(' OR ');
const paymentColumns=['o4o_payments.orderId','o4o_payments.sourceService','o4o_payments.metadata','checkout_orders.id','checkout_orders.metadata'];
// One payment can cover multiple supplier orders. EXISTS counts payments once, not order/payment pairs.
const paymentLink=`(o.id::text=p."orderId"::text OR
  (NULLIF(o.metadata->>'paymentGroupId','') IS NOT NULL AND
    (o.metadata->>'paymentGroupId'=p."orderId"::text OR o.metadata->>'paymentGroupId'=p.metadata->>'paymentGroupId')) OR
  CASE WHEN jsonb_typeof(p.metadata::jsonb->'checkoutOrderIds')='array'
    THEN (p.metadata::jsonb->'checkoutOrderIds') ? o.id::text ELSE FALSE END)`;
const checks=[
  ['exclusivePhOffers',['supplier_product_offers.service_keys','supplier_product_offers.is_public','supplier_product_offers.allowed_seller_ids'],
    `SELECT count(*)::text AS count FROM public.supplier_product_offers x WHERE
      EXISTS (SELECT 1 FROM unnest(x.service_keys) v WHERE ${ph('v')}) AND x.is_public=FALSE
      AND COALESCE(cardinality(x.allowed_seller_ids),0)=0
      AND NOT EXISTS (SELECT 1 FROM unnest(x.service_keys) v WHERE v IS NULL OR NOT (${ph('v')}))`],
  ['sharedOfferBaselineWidening',['supplier_product_offers.service_keys','supplier_product_offers.is_public','supplier_product_offers.allowed_seller_ids','supplier_product_offers.is_active','supplier_product_offers.approval_status'],
    `SELECT count(*)::text AS count FROM public.supplier_product_offers x WHERE
      EXISTS (SELECT 1 FROM unnest(x.service_keys) v WHERE ${ph('v')})
      AND (x.is_public OR COALESCE(cardinality(x.allowed_seller_ids),0)>0)
      AND x.is_active AND x.approval_status::text='APPROVED'
      AND NOT EXISTS (SELECT 1 FROM unnest(x.service_keys) v WHERE v IS NULL OR NOT (${ph('v')}))`],
  ['orderLogs',['checkout_order_logs.orderId','checkout_orders.id','checkout_orders.metadata'],
    `SELECT count(*)::text AS count FROM public.checkout_order_logs l JOIN public.checkout_orders o ON l."orderId"=o.id WHERE ${orderScope}`],
  ['paymentsWithoutPhOrder',paymentColumns,
    `SELECT count(*)::text AS count FROM public.o4o_payments p WHERE ${ph('p."sourceService"')} AND NOT EXISTS
      (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND (${orderScope}))`],
  ['foreignPaymentsForPhOrder',paymentColumns,
    `SELECT count(*)::text AS count FROM public.o4o_payments p WHERE NOT COALESCE(${ph('p."sourceService"')},FALSE)
      AND EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND (${orderScope}))`],
  ['allPaymentsForPhOrder',paymentColumns,
    `SELECT count(*)::text AS count FROM public.o4o_payments p WHERE EXISTS
      (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND (${orderScope}))`],
  ['phPaymentsForPhOrder',paymentColumns,
    `SELECT count(*)::text AS count FROM public.o4o_payments p WHERE ${ph('p."sourceService"')} AND EXISTS
      (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND (${orderScope}))`],
  ['phPaymentsWithoutAnyOrder',paymentColumns,
    `SELECT count(*)::text AS count FROM public.o4o_payments p WHERE ${ph('p."sourceService"')}
      AND NOT EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink})`],
  ['phOrdersWithoutPhPayment',paymentColumns,
    `SELECT count(*)::text AS count FROM public.checkout_orders o WHERE (${orderScope}) AND NOT EXISTS
      (SELECT 1 FROM public.o4o_payments p WHERE ${paymentLink} AND ${ph('p."sourceService"')})`],
  ['phOrdersWithMultiplePhPayments',paymentColumns,
    `SELECT count(*)::text AS count FROM public.checkout_orders o WHERE (${orderScope}) AND
      (SELECT count(*) FROM public.o4o_payments p WHERE ${paymentLink} AND ${ph('p."sourceService"')})>1`],
  ['phPaymentsSharedWithForeignOrders',paymentColumns,
    `SELECT count(*)::text AS count FROM public.o4o_payments p WHERE ${ph('p."sourceService"')}
      AND EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND (${orderScope}))
      AND EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND NOT COALESCE((${orderScope}),FALSE))`],
  ['mediaLinks',['media_entity_links.media_asset_id','media_assets.id','media_assets.service_key'],
    `SELECT count(*)::text AS count FROM public.media_entity_links l JOIN public.media_assets a ON l.media_asset_id=a.id WHERE ${ph('a.service_key')}`],
  ['mediaLinksOutsidePhContent',['media_entity_links.media_asset_id','media_entity_links.entity_type','media_entity_links.entity_id','media_assets.id','media_assets.service_key','cms_contents.id','cms_contents.serviceKey'],
    `SELECT count(*)::text AS count FROM public.media_entity_links l JOIN public.media_assets a ON l.media_asset_id=a.id
      WHERE ${ph('a.service_key')} AND NOT EXISTS (SELECT 1 FROM public.cms_contents c
        WHERE l.entity_type='content' AND l.entity_id=c.id::text AND ${ph('c."serviceKey"')})`],
  ['mediaPhServiceLinks',['media_entity_links.media_asset_id','media_entity_links.entity_type','media_entity_links.entity_id','media_assets.id','media_assets.service_key'],
    `SELECT count(*)::text AS count FROM public.media_entity_links l JOIN public.media_assets a ON l.media_asset_id=a.id
      WHERE ${ph('a.service_key')} AND l.entity_type='service' AND ${ph('l.entity_id')}`],
  ['mediaUnownedEntityLinks',['media_entity_links.media_asset_id','media_entity_links.entity_type','media_entity_links.entity_id','media_assets.id','media_assets.service_key','cms_contents.id','cms_contents.serviceKey'],
    `SELECT count(*)::text AS count FROM public.media_entity_links l JOIN public.media_assets a ON l.media_asset_id=a.id
      WHERE ${ph('a.service_key')} AND NOT COALESCE((l.entity_type='service' AND ${ph('l.entity_id')}),FALSE)
      AND NOT EXISTS (SELECT 1 FROM public.cms_contents c WHERE l.entity_type='content' AND l.entity_id=c.id::text AND ${ph('c."serviceKey"')})`],
  ['phContentMediaLinks',['media_entity_links.entity_type','media_entity_links.entity_id','cms_contents.id','cms_contents.serviceKey'],
    `SELECT count(*)::text AS count FROM public.media_entity_links l JOIN public.cms_contents c ON l.entity_type='content' AND l.entity_id=c.id::text WHERE ${ph('c."serviceKey"')}`],
  ['phContentSharedAssets',['media_entity_links.media_asset_id','media_entity_links.entity_type','media_entity_links.entity_id','media_assets.id','media_assets.service_key','cms_contents.id','cms_contents.serviceKey'],
    `SELECT count(*)::text AS count FROM public.media_entity_links l JOIN public.cms_contents c ON l.entity_type='content' AND l.entity_id=c.id::text
      JOIN public.media_assets a ON a.id=l.media_asset_id WHERE ${ph('c."serviceKey"')} AND NOT COALESCE(${ph('a.service_key')},FALSE)`],
  ['sharedMediaStorage',['media_assets.id','media_assets.service_key','media_assets.gcs_path','media_assets.url'],
    `SELECT count(*)::text AS count FROM public.media_assets s WHERE NOT COALESCE(${ph('s.service_key')},FALSE)
      AND EXISTS (SELECT 1 FROM public.media_assets a WHERE ${ph('a.service_key')} AND
        ((NULLIF(a.gcs_path,'') IS NOT NULL AND a.gcs_path=s.gcs_path) OR (NULLIF(a.url,'') IS NOT NULL AND a.url=s.url)))`],
  ['screenSetMediaReferences',['store_tablet_screen_blocks.config','media_assets.url','media_assets.service_key'],
    `SELECT count(*)::text AS count FROM public.store_tablet_screen_blocks b WHERE EXISTS
      (SELECT 1 FROM public.media_assets a WHERE ${ph('a.service_key')} AND NULLIF(a.url,'') IS NOT NULL AND strpos(b.config::text,a.url)>0)`],
  ['mediaStorageObjects',['media_assets.service_key','media_assets.gcs_path'],
    `SELECT count(*)::text AS count FROM public.media_assets a WHERE ${ph('a.service_key')} AND NULLIF(a.gcs_path,'') IS NOT NULL`],
];
export async function collectRetirementReferences(client,columns) {
  const available=new Set(columns.map(c=>`${c.table_name}.${c.column_name}`));
  const counts={},blockers=[];
  const collect=async([name,required,sql])=>{
    if(required.some(column=>!available.has(column))) {blockers.push({check:name,code:'REFERENCE_SCHEMA_UNAVAILABLE'});return;}
    const result=await client.query(sql,[keys]);
    const value=result.rows?.[0]?.count;
    if(typeof value!=='string'||!/^\d+$/.test(value))throw Object.assign(new Error('Invalid reference count'),{code:'REFERENCE_COUNT'});
    counts[name]=value;
  };
  // One read-only connection; do not leave queued queries running after rollback on failure.
  await checks.reduce((previous,check)=>previous.then(()=>collect(check)),Promise.resolve());
  return {readOnly:true,complete:blockers.length===0,counts,blockers,deletionApproved:false};
}
