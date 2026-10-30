import {BaseDetailDrawer} from '@o4o/ui';
import {ContentRenderer} from '@o4o/content-editor';
import type {SupplierProduct} from './supplier-product.types';
import {useNetureProductOperations} from './runtime';
export interface ProductDetailProps {
 product: SupplierProduct | null;open:boolean;onClose:()=>void;onSaved?:()=>void;
 approvalActions?:{onApprove:()=>void;onReject:()=>void;loading?:boolean};
}
/** Approval data is read-only. Supplier self-editing remains in the source business workspace. */
export function OperationProductDetail(props: ProductDetailProps) {
 const {renderProductDetail}=useNetureProductOperations();
 if(renderProductDetail) return renderProductDetail(props);
 const {product,approvalActions:action}=props;
 return <BaseDetailDrawer open={props.open} onClose={props.onClose} title="상품 검토 상세" footer={action && <div className="flex gap-2"><button disabled={action.loading} onClick={action.onApprove}>승인</button><button disabled={action.loading} onClick={action.onReject}>반려</button></div>}>
 {product && <article className="space-y-4"><h2>{product.name}</h2><dl><dt>분류</dt><dd>{product.categoryName || '미등록'}</dd><dt>공개 범위</dt><dd>{product.distributionType}</dd><dt>승인 상태</dt><dd>{product.approvalStatus}</dd></dl>
 <section><h3>매장용 설명</h3><ContentRenderer html={product.consumerShortDescription || product.consumerDetailDescription || ''} /></section>
 <section><h3>B2B 설명</h3><ContentRenderer html={product.businessShortDescription || product.businessDetailDescription || ''} /></section></article>}
 </BaseDetailDrawer>;
}
