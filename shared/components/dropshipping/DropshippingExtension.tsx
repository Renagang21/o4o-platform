import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { AdminLayout } from './layout/AdminLayout';
import { EnhancedSupplierDashboard } from './pages/EnhancedSupplierDashboard';
import { ProductManagementPage } from './pages/ProductManagementPage';
import { OrderManagementPage } from './pages/OrderManagementPage';
import { SellerDashboard } from './pages/SellerDashboard';
import { SellerCatalogPage } from './pages/SellerCatalogPage';
import { SellerProductManagementPage } from './pages/SellerProductManagementPage';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { PartnerMarketingPage } from './pages/PartnerMarketingPage';

export interface DropshippingOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dropshipping: {
      setDropshippingAdmin: () => ReturnType;
    };
  }
}

export const DropshippingExtension = Node.create<DropshippingOptions>({
  name: 'dropshipping',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="dropshipping"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'dropshipping',
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DropshippingComponent);
  },

  addCommands() {
    return {
      setDropshippingAdmin:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },
});

const DropshippingComponent: React.FC = () => {
  return (
    <NodeViewWrapper className="dropshipping-extension">
      <div className="w-full min-h-screen bg-gray-50 overflow-hidden">
        <AdminLayout>
          {({ currentRole, activeMenu, onMenuChange }) => {
            // Render different pages based on role and active menu
            switch (currentRole) {
              case 'supplier':
                switch (activeMenu) {
                  case 'products':
                    return (
                      <ProductManagementPage
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                  case 'orders':
                    return (
                      <OrderManagementPage
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                  case 'dashboard':
                  default:
                    return (
                      <EnhancedSupplierDashboard
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                }
                
              case 'seller':
                switch (activeMenu) {
                  case 'catalog':
                    return (
                      <SellerCatalogPage
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                  case 'products':
                    return (
                      <SellerProductManagementPage
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                  case 'partners':
                    // Placeholder for partner marketing page
                    return (
                      <div className="p-6 bg-white rounded-lg">
                        <h2 className="text-xl font-bold mb-4">파트너 마케팅 관리</h2>
                        <p className="text-gray-600">파트너 마케팅 기능을 개발 중입니다.</p>
                      </div>
                    );
                  case 'revenue':
                    // Placeholder for revenue page
                    return (
                      <div className="p-6 bg-white rounded-lg">
                        <h2 className="text-xl font-bold mb-4">매출/정산 관리</h2>
                        <p className="text-gray-600">매출/정산 기능을 개발 중입니다.</p>
                      </div>
                    );
                  case 'dashboard':
                  default:
                    return (
                      <SellerDashboard
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                }
                
              case 'partner':
                switch (activeMenu) {
                  case 'marketing':
                    return (
                      <PartnerMarketingPage
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                  case 'commission':
                    // Placeholder for commission management page
                    return (
                      <div className="p-6 bg-white rounded-lg">
                        <h2 className="text-xl font-bold mb-4">커미션 관리</h2>
                        <p className="text-gray-600">커미션 관리 기능을 개발 중입니다.</p>
                      </div>
                    );
                  case 'analytics':
                    // Placeholder for analytics page
                    return (
                      <div className="p-6 bg-white rounded-lg">
                        <h2 className="text-xl font-bold mb-4">성과 분석</h2>
                        <p className="text-gray-600">성과 분석 기능을 개발 중입니다.</p>
                      </div>
                    );
                  case 'dashboard':
                  default:
                    return (
                      <PartnerDashboard
                        currentRole={currentRole}
                        activeMenu={activeMenu}
                        onMenuChange={onMenuChange}
                      />
                    );
                }
                
              default:
                // Default fallback
                return (
                  <EnhancedSupplierDashboard
                    currentRole={currentRole}
                    activeMenu={activeMenu}
                    onMenuChange={onMenuChange}
                  />
                );
            }
          }}
        </AdminLayout>
      </div>
    </NodeViewWrapper>
  );
};

export default DropshippingExtension;