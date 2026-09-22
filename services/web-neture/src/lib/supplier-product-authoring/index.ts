/**
 * Supplier Product Authoring — 외부 LLM First 제품정보 작성 계약 (Prompt · Output Contract · Parse · Apply)
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1
 *
 * 이 폴더는 API · React · router 의존이 없다. Save(Candidate 제출)는 화면이 supplierApi 로 수행한다.
 */
export * from './types';
export * from './prompt';
export * from './parse';
export * from './apply';
