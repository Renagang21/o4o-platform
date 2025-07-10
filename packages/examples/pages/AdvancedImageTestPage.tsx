// src/pages/AdvancedImageTestPage.tsx
import React, { useState } from 'react'
import styled from 'styled-components'
import { ResponsiveImageEnhanced } from '../components/image/ResponsiveImageEnhanced'
import { ImageUploadWidget } from '../components/image/ImageUploadWidget'
import { ImageUploaderEnhanced } from '../services/image/ImageUploaderEnhanced'
import { ProcessedImage } from '../services/image/types'
import { performanceMonitor } from '../utils/performanceUtils'

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 2.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 10px;
  }
  
  p {
    color: #666;
    font-size: 1.1rem;
  }
`

const TestSection = styled.div`
  background: white;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.8);
  
  h2 {
    color: #333;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    
    &::before {
      content: attr(data-icon);
      font-size: 1.5em;
    }
  }
`

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`

const OptionCard = styled.div<{ $active: boolean }>`
  background: ${props => props.$active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'};
  color: ${props => props.$active ? 'white' : '#333'};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid ${props => props.$active ? '#667eea' : 'transparent'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin-bottom: 10px;
    font-size: 1.2rem;
  }
  
  p {
    font-size: 0.9rem;
    opacity: 0.8;
  }
`

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  margin-top: 30px;
`

const ImageResult = styled.div`
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  
  h4 {
    color: #333;
    margin-bottom: 15px;
    text-align: center;
  }
`

const MetricsPanel = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  
  h3 {
    margin-bottom: 15px;
  }
  
  .metric {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    
    &:last-child {
      border-bottom: none;
    }
  }
`

const LogPanel = styled.div`
  background: #1a1a1a;
  color: #00ff00;
  border-radius: 8px;
  padding: 20px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 20px;
  
  .log-line {
    margin-bottom: 5px;
    
    &.info { color: #00ff00; }
    &.warn { color: #ffaa00; }
    &.error { color: #ff4444; }
  }
`

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  th {
    background: #f8f9fa;
    font-weight: 600;
  }
  
  tr:hover {
    background: #f5f5f5;
  }
`

type CompressionMethod = 'standard' | 'intelligent' | 'progressive' | 'enhanced'

interface TestResults {
  method: CompressionMethod
  image: ProcessedImage
  processingTime: number
  compressionReport?: string
}

export const AdvancedImageTestPage: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<CompressionMethod>('enhanced')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<TestResults[]>([])
  const [logs, setLogs] = useState<Array<{ type: 'info' | 'warn' | 'error', message: string }>>([])
  const [showComparison, setShowComparison] = useState(false)

  const imageUploader = new ImageUploaderEnhanced()

  const addLog = (type: 'info' | 'warn' | 'error', message: string) => {
    setLogs(prev => [...prev, { type, message: `[${new Date().toLocaleTimeString()}] ${message}` }])
  }

  const compressionMethods = [
    {
      key: 'standard' as CompressionMethod,
      title: '🔧 기본 압축',
      description: 'Sharp 기본 설정으로 빠른 처리'
    },
    {
      key: 'intelligent' as CompressionMethod,
      title: '🧠 지능형 압축',
      description: '텍스트 감지 기반 적응형 압축'
    },
    {
      key: 'progressive' as CompressionMethod,
      title: '📈 Progressive JPEG',
      description: '점진적 로딩으로 체감 속도 향상'
    },
    {
      key: 'enhanced' as CompressionMethod,
      title: '✨ 통합 최적화',
      description: '모든 기능을 조합한 최고 성능'
    }
  ]

  const handleImageUpload = async (image: ProcessedImage) => {
    addLog('info', '이미지 업로드 완료')
    setResults([{ method: selectedMethod, image, processingTime: 0 }])
  }

  const handleUploadError = (error: string) => {
    addLog('error', `업로드 실패: ${error}`)
  }

  const runCompressionTest = async (file: File) => {
    setIsProcessing(true)
    setResults([])
    setLogs([])
    addLog('info', '압축 테스트 시작...')

    try {
      const testResults: TestResults[] = []

      // 선택된 방법으로 처리
      addLog('info', `${selectedMethod} 방법으로 처리 중...`)
      
      const startTime = performance.now()
      
      let result
      switch (selectedMethod) {
        case 'standard':
          result = await imageUploader.uploadAndProcessEnhanced(file, {
            enableIntelligentCompression: false,
            enableProgressiveJPEG: false
          })
          break
        case 'intelligent':
          result = await imageUploader.uploadAndProcessEnhanced(file, {
            enableIntelligentCompression: true,
            enableProgressiveJPEG: false
          })
          break
        case 'progressive':
          result = await imageUploader.uploadAndProcessEnhanced(file, {
            enableIntelligentCompression: false,
            enableProgressiveJPEG: true
          })
          break
        case 'enhanced':
          result = await imageUploader.uploadAndProcessEnhanced(file, {
            enableIntelligentCompression: true,
            enableProgressiveJPEG: true,
            smartQuality: true
          })
          break
      }
      
      const processingTime = performance.now() - startTime
      
      testResults.push({
        method: selectedMethod,
        image: result,
        processingTime,
        compressionReport: result.compressionReport
      })
      
      addLog('info', `처리 완료! 소요 시간: ${processingTime.toFixed(2)}ms`)
      
      if (result.intelligentAnalysis) {
        addLog('info', `텍스트 밀도: ${(result.intelligentAnalysis.textDensity * 100).toFixed(1)}%`)
        addLog('info', `권장 품질: ${result.intelligentAnalysis.recommendedQuality}`)
      }
      
      setResults(testResults)
      
    } catch (error) {
      addLog('error', `테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const runComparisonTest = async (file: File) => {
    setIsProcessing(true)
    setResults([])
    setLogs([])
    addLog('info', '전체 압축 방법 비교 시작...')

    try {
      const comparison = await imageUploader.compareCompressionMethods(file, 
        ['standard', 'intelligent', 'progressive']
      )
      
      const testResults: TestResults[] = comparison.results.map(result => ({
        method: result.method as CompressionMethod,
        image: result.result,
        processingTime: result.result.processingTime,
        compressionReport: result.result.compressionReport
      }))
      
      setResults(testResults)
      setShowComparison(true)
      
      addLog('info', '비교 테스트 완료!')
      addLog('info', comparison.recommendation)
      
    } catch (error) {
      addLog('error', `비교 테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const getPerformanceMetrics = () => {
    const imageMetrics = performanceMonitor.getMetrics('image')
    const analysis = performanceMonitor.analyzeImagePerformance()
    
    return {
      totalImages: analysis.totalImages,
      averageLoadTime: analysis.averageLoadTime,
      totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      compressionEfficiency: results.length > 0 ? 
        results.reduce((sum, r) => sum + (r.image.metadata.size || 0), 0) / results.length : 0
    }
  }

  return (
    <PageContainer>
      <Header>
        <h1>🚀 고급 이미지 최적화 테스트</h1>
        <p>한국형 전자상거래를 위한 지능형 이미지 압축 기술 체험</p>
      </Header>

      <TestSection>
        <h2 data-icon="⚙️">압축 방법 선택</h2>
        <OptionsGrid>
          {compressionMethods.map(method => (
            <OptionCard
              key={method.key}
              $active={selectedMethod === method.key}
              onClick={() => setSelectedMethod(method.key)}
            >
              <h3>{method.title}</h3>
              <p>{method.description}</p>
            </OptionCard>
          ))}
        </OptionsGrid>
      </TestSection>

      <TestSection>
        <h2 data-icon="📤">이미지 업로드 및 테스트</h2>
        <ImageUploadWidget
          onUploadComplete={handleImageUpload}
          onUploadError={handleUploadError}
          category="detail"
          maxFileSize={20}
        />
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => {
              const fileInput = document.createElement('input')
              fileInput.type = 'file'
              fileInput.accept = 'image/*'
              fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) runCompressionTest(file)
              }
              fileInput.click()
            }}
            disabled={isProcessing}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {isProcessing ? '처리 중...' : '선택된 방법으로 테스트'}
          </button>
          
          <button 
            onClick={() => {
              const fileInput = document.createElement('input')
              fileInput.type = 'file'
              fileInput.accept = 'image/*'
              fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) runComparisonTest(file)
              }
              fileInput.click()
            }}
            disabled={isProcessing}
            style={{
              background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
              color: '#333',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            전체 방법 비교
          </button>
        </div>
      </TestSection>

      {results.length > 0 && (
        <TestSection>
          <h2 data-icon="🖼️">처리 결과</h2>
          <ResultsGrid>
            {results.map((result, index) => (
              <ImageResult key={index}>
                <h4>{compressionMethods.find(m => m.key === result.method)?.title}</h4>
                <ResponsiveImageEnhanced
                  image={result.image}
                  alt={`${result.method} 처리 결과`}
                  showOriginalToggle={true}
                  enableBlurPlaceholder={true}
                />
                <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
                  <div>처리 시간: {result.processingTime.toFixed(2)}ms</div>
                  <div>해상도: {result.image.metadata.width} × {result.image.metadata.height}</div>
                  <div>원본 크기: {(result.image.metadata.size / 1024).toFixed(2)} KB</div>
                </div>
              </ImageResult>
            ))}
          </ResultsGrid>
          
          {showComparison && results.length > 1 && (
            <ComparisonTable>
              <thead>
                <tr>
                  <th>압축 방법</th>
                  <th>처리 시간</th>
                  <th>파일 크기</th>
                  <th>압축률</th>
                  <th>품질 점수</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>{compressionMethods.find(m => m.key === result.method)?.title}</td>
                    <td>{result.processingTime.toFixed(2)}ms</td>
                    <td>{(result.image.metadata.size / 1024).toFixed(2)} KB</td>
                    <td>계산 중...</td>
                    <td>⭐⭐⭐⭐⭐</td>
                  </tr>
                ))}
              </tbody>
            </ComparisonTable>
          )}
        </TestSection>
      )}

      <TestSection>
        <h2 data-icon="📊">성능 메트릭</h2>
        <MetricsPanel>
          <h3>실시간 성능 지표</h3>
          {(() => {
            const metrics = getPerformanceMetrics()
            return (
              <>
                <div className="metric">
                  <span>총 처리된 이미지</span>
                  <span>{metrics.totalImages}개</span>
                </div>
                <div className="metric">
                  <span>평균 로딩 시간</span>
                  <span>{metrics.averageLoadTime.toFixed(2)}ms</span>
                </div>
                <div className="metric">
                  <span>총 처리 시간</span>
                  <span>{metrics.totalProcessingTime.toFixed(2)}ms</span>
                </div>
                <div className="metric">
                  <span>메모리 사용량</span>
                  <span>{performanceMonitor.getMetrics().length}개 메트릭</span>
                </div>
              </>
            )
          })()}
        </MetricsPanel>
      </TestSection>

      {logs.length > 0 && (
        <TestSection>
          <h2 data-icon="📋">처리 로그</h2>
          <LogPanel>
            {logs.map((log, index) => (
              <div key={index} className={`log-line ${log.type}`}>
                {log.message}
              </div>
            ))}
          </LogPanel>
        </TestSection>
      )}
    </PageContainer>
  )
}
