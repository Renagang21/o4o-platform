// src/App.tsx
import React, { useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { AdvancedImageTestPage } from './pages/AdvancedImageTestPage'

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f8f9fa;
    color: #333;
    line-height: 1.6;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  input, textarea {
    font-family: inherit;
  }
`

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
`

const Header = styled.header`
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
  margin-bottom: 2rem;
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  h1 {
    color: #2c3e50;
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  .subtitle {
    color: #7f8c8d;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`

const TabNavigation = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`

const Tab = styled.button<{ $active: boolean }>`
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : 'transparent'};
  color: ${props => props.$active ? 'white' : '#666'};
  border: 2px solid ${props => props.$active ? '#667eea' : '#ddd'};
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
`

const Footer = styled.footer`
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 2rem 0;
  margin-top: 4rem;
  
  p {
    margin-bottom: 0.5rem;
  }
  
  .links {
    margin-top: 1rem;
    
    a {
      color: #3498db;
      margin: 0 1rem;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
`

function App() {
  const [activeTab, setActiveTab] = useState<'product' | 'test'>('product')

  return (
    <AppContainer>
      <GlobalStyle />
      
      <Header>
        <div className="container">
          <h1>🚀 o4o-platform 이미지 최적화 시스템</h1>
          <p className="subtitle">
            한국형 전자상거래를 위한 반응형 이미지 최적화 솔루션
          </p>
          
          <TabNavigation>
            <Tab 
              $active={activeTab === 'product'}
              onClick={() => setActiveTab('product')}
            >
              🛒 상품 페이지 데모
            </Tab>
            <Tab 
              $active={activeTab === 'test'}
              onClick={() => setActiveTab('test')}
            >
              🧪 고급 기능 테스트
            </Tab>
          </TabNavigation>
        </div>
      </Header>

      <main>
        {activeTab === 'product' ? (
          <ProductDetailPage />
        ) : (
          <AdvancedImageTestPage />
        )}
      </main>

      <Footer>
        <p>&copy; 2024 o4o-platform. 모든 권리 보유.</p>
        <div className="links">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="https://docs.example.com" target="_blank" rel="noopener noreferrer">
            문서
          </a>
          <a href="mailto:support@example.com">
            지원
          </a>
        </div>
      </Footer>
    </AppContainer>
  )
}

export default App
