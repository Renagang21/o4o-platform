export * from './types';
export { DefaultShortcodeParser, defaultParser } from './parser';
export { DefaultShortcodeRegistry, globalRegistry, registerShortcode, unregisterShortcode, getShortcode, hasShortcode } from './registry';
export { DefaultShortcodeRenderer, useShortcodes } from './renderer';
import { DefaultShortcodeRenderer } from './renderer';
export declare const defaultRenderer: DefaultShortcodeRenderer;
/**
 * 간편하게 숏코드를 렌더링하는 함수
 */
export declare const renderShortcodes: (content: string, context?: any) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | null;
export { ShortcodeProvider, useShortcodeContext, ShortcodeContent } from './provider';
export { registerDropshippingShortcodes } from './dropshipping';
export { SellerDashboard, SupplierDashboard, AffiliateDashboard } from './dropshipping';
//# sourceMappingURL=index.d.ts.map