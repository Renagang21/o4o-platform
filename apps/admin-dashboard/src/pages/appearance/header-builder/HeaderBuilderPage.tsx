/**
 * Header Builder Page (Coming Soon)
 * Standalone header builder - implementation in progress
 */

import React from 'react';
import { Layout } from 'lucide-react';

export const HeaderBuilderPage: React.FC = () => {
  return (
    <div className="header-builder-page">
      <div className="page-header">
        <div className="header-content">
          <div className="icon-wrapper">
            <Layout size={48} />
          </div>
          <h1 className="page-title">Header Builder</h1>
          <p className="page-description">
            Advanced header customization tool - Coming Soon
          </p>
          <div className="features-list">
            <h3>Planned Features:</h3>
            <ul>
              <li>✨ Drag & Drop Module Builder</li>
              <li>📱 Responsive Design (Desktop/Tablet/Mobile)</li>
              <li>🎨 12 Module Types (Logo, Menu, Search, Cart, etc.)</li>
              <li>📍 Sticky Header Settings</li>
              <li>📲 Mobile Menu Customization</li>
              <li>⚡ Real-time Preview</li>
            </ul>
          </div>
          <div className="status-note">
            <strong>Status:</strong> API endpoints are ready. Frontend UI implementation in progress.
          </div>
        </div>
      </div>

      <style>{`
        .header-builder-page {
          max-width: 800px;
          margin: 60px auto;
          padding: 40px;
          text-align: center;
        }

        .page-header {
          background: white;
          border-radius: 12px;
          padding: 48px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .icon-wrapper {
          width: 96px;
          height: 96px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .page-title {
          margin: 0;
          font-size: 36px;
          font-weight: 700;
          color: #1a1a1a;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-description {
          margin: 0;
          font-size: 18px;
          color: #666;
          max-width: 500px;
        }

        .features-list {
          text-align: left;
          margin-top: 24px;
          padding: 24px;
          background: #f8f9fa;
          border-radius: 8px;
          width: 100%;
          max-width: 500px;
        }

        .features-list h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .features-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features-list li {
          padding: 8px 0;
          font-size: 15px;
          color: #555;
        }

        .status-note {
          padding: 16px 24px;
          background: #e3f2fd;
          border-left: 4px solid #2196F3;
          border-radius: 4px;
          text-align: left;
          width: 100%;
          max-width: 500px;
          font-size: 14px;
          color: #1565c0;
        }

        .status-note strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default HeaderBuilderPage;
