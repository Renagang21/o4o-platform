import React from 'react';
import './EditorPage.css';
import Header from '../../components/layout/Header/Header';

const EditorPage = () => {
  return (
    <div className="editor-page">
      <Header />
      <main>
        <div className="container">
          <div className="editor-container">
            <h1>편집 화면</h1>
            <div className="editor-content">
              {/* 편집기 내용은 추후 구현 */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditorPage; 