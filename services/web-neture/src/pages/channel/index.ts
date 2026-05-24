/**
 * Channel pages index
 *
 * WO-O4O-NETURE-INTRO-DEAD-PAGES-CLEANUP-V1:
 *   ChannelExplanationPage / DentalChannelExplanationPage / Pharmacy·Optical·MedicalChannelExplanationPage
 *   는 Option A 통합 후 deprecated 되어 파일 삭제됨 (channel 콘텐츠는 /o4o/targets/{type} 안의
 *   "채널 활용 안내" 섹션으로 흡수, /o4o/channels/* 경로는 Navigate redirect 처리).
 *
 *   ChannelSalesStructurePage 는 별도 도메인 (o4o 기반 채널·판매 구조 통합 설명) 으로 보존.
 *   현재 App.tsx 직접 import 는 없으나, 외부 활용 가능성 위해 export 유지.
 *
 * WO-O4O-CHANNEL-SALES-STRUCTURE-EXPLANATION-V1
 */

export { default as ChannelSalesStructurePage } from './ChannelSalesStructurePage';
