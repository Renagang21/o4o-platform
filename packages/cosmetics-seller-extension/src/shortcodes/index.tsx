/**
 * Cosmetics Seller Extension Shortcodes
 *
 * 숏코드 정의 (ShortcodeDefinition 사용)
 */

import React from 'react';
import type { ShortcodeDefinition, ShortcodeAttributes } from '@o4o/shortcodes';

import {
  DisplayManagement,
  SampleManagement,
  InventoryManagement,
  ConsultationLog,
  KPIDashboard,
  SellerDashboard,
} from '../frontend/index.js';

// Seller Dashboard Shortcode
export const sellerDashboardShortcode: ShortcodeDefinition = {
  name: 'seller_dashboard',
  label: 'Seller Dashboard',
  category: 'Cosmetics Seller',
  description: '판매원 대시보드 - 전체 현황 요약',
  component: (props: { attributes?: ShortcodeAttributes }) => {
    const sellerId = props.attributes?.seller_id as string || '';
    return <SellerDashboard sellerId={sellerId} />;
  },
  attributes: {
    seller_id: {
      type: 'string',
      required: true,
    },
  },
};

// Display Management Shortcode
export const displayManagementShortcode: ShortcodeDefinition = {
  name: 'seller_display_management',
  label: 'Display Management',
  category: 'Cosmetics Seller',
  description: '진열 관리 - 매장 내 상품 진열 현황',
  component: (props: { attributes?: ShortcodeAttributes }) => {
    const sellerId = props.attributes?.seller_id as string || '';
    return <DisplayManagement sellerId={sellerId} />;
  },
  attributes: {
    seller_id: {
      type: 'string',
      required: true,
    },
  },
};

// Sample Management Shortcode
export const sampleManagementShortcode: ShortcodeDefinition = {
  name: 'seller_sample_management',
  label: 'Sample Management',
  category: 'Cosmetics Seller',
  description: '샘플 관리 - 매장 샘플 재고 및 사용',
  component: (props: { attributes?: ShortcodeAttributes }) => {
    const sellerId = props.attributes?.seller_id as string || '';
    return <SampleManagement sellerId={sellerId} />;
  },
  attributes: {
    seller_id: {
      type: 'string',
      required: true,
    },
  },
};

// Inventory Management Shortcode
export const inventoryManagementShortcode: ShortcodeDefinition = {
  name: 'seller_inventory_management',
  label: 'Inventory Management',
  category: 'Cosmetics Seller',
  description: '재고 관리 - 매장 재고 현황 및 조정',
  component: (props: { attributes?: ShortcodeAttributes }) => {
    const sellerId = props.attributes?.seller_id as string || '';
    return <InventoryManagement sellerId={sellerId} />;
  },
  attributes: {
    seller_id: {
      type: 'string',
      required: true,
    },
  },
};

// Consultation Log Shortcode
export const consultationLogShortcode: ShortcodeDefinition = {
  name: 'seller_consultation_log',
  label: 'Consultation Log',
  category: 'Cosmetics Seller',
  description: '상담 로그 - 고객 상담 내역',
  component: (props: { attributes?: ShortcodeAttributes }) => {
    const sellerId = props.attributes?.seller_id as string || '';
    return <ConsultationLog sellerId={sellerId} />;
  },
  attributes: {
    seller_id: {
      type: 'string',
      required: true,
    },
  },
};

// KPI Dashboard Shortcode
export const kpiDashboardShortcode: ShortcodeDefinition = {
  name: 'seller_kpi_dashboard',
  label: 'KPI Dashboard',
  category: 'Cosmetics Seller',
  description: 'KPI 대시보드 - 판매원 성과 지표',
  component: (props: { attributes?: ShortcodeAttributes }) => {
    const sellerId = props.attributes?.seller_id as string || '';
    return <KPIDashboard sellerId={sellerId} />;
  },
  attributes: {
    seller_id: {
      type: 'string',
      required: true,
    },
  },
};

// Export all shortcodes
export const shortcodes: ShortcodeDefinition[] = [
  sellerDashboardShortcode,
  displayManagementShortcode,
  sampleManagementShortcode,
  inventoryManagementShortcode,
  consultationLogShortcode,
  kpiDashboardShortcode,
];

export default shortcodes;
