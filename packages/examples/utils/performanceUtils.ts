// src/utils/performanceUtils.ts

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  context?: Record<string, any>
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: Map<string, PerformanceObserver> = new Map()

  constructor() {
    this.initializeObservers()
  }

  private initializeObservers() {
    // Navigation Timing 관찰
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.recordMetric('page-load-time', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms')
              this.recordMetric('dom-content-loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'ms')
              this.recordMetric('time-to-interactive', navEntry.domInteractive - navEntry.fetchStart, 'ms')
            }
          })
        })
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.set('navigation', navObserver)
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error)
      }

      // Resource Timing 관찰 (이미지 로딩)
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name.includes('/uploads/') || entry.name.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
              this.recordMetric('image-load-time', entry.duration, 'ms', {
                url: entry.name,
                size: (entry as any).transferSize || 0
              })
            }
          })
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.set('resource', resourceObserver)
      } catch (error) {
        console.warn('Resource timing observer not supported:', error)
      }
    }
  }

  recordMetric(name: string, value: number, unit: string = 'ms', context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    }
    
    this.metrics.push(metric)
    
    // 콘솔에 중요한 메트릭 출력
    if (value > this.getThreshold(name)) {
      console.warn(`⚠️ 성능 경고: ${name} = ${value}${unit}`, context)
    } else {
      console.log(`📊 성능 메트릭: ${name} = ${value}${unit}`)
    }
  }

  private getThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'image-load-time': 2000, // 2초
      'page-load-time': 3000,  // 3초
      'dom-content-loaded': 1500, // 1.5초
      'largest-contentful-paint': 2500, // 2.5초
      'first-contentful-paint': 1800, // 1.8초
      'cumulative-layout-shift': 0.1 // 0.1
    }
    return thresholds[metricName] || Infinity
  }

  getMetrics(filter?: string): PerformanceMetric[] {
    if (filter) {
      return this.metrics.filter(metric => metric.name.includes(filter))
    }
    return [...this.metrics]
  }

  getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name)
    if (metrics.length === 0) return 0
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / metrics.length
  }

  clearMetrics() {
    this.metrics = []
  }

  dispose() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.clearMetrics()
  }

  // 이미지별 성능 분석
  analyzeImagePerformance(): {
    totalImages: number
    averageLoadTime: number
    slowestImage: PerformanceMetric | null
    fastestImage: PerformanceMetric | null
  } {
    const imageMetrics = this.getMetrics('image-load-time')
    
    if (imageMetrics.length === 0) {
      return {
        totalImages: 0,
        averageLoadTime: 0,
        slowestImage: null,
        fastestImage: null
      }
    }

    const averageLoadTime = this.getAverageMetric('image-load-time')
    const slowestImage = imageMetrics.reduce((prev, current) => 
      prev.value > current.value ? prev : current
    )
    const fastestImage = imageMetrics.reduce((prev, current) => 
      prev.value < current.value ? prev : current
    )

    return {
      totalImages: imageMetrics.length,
      averageLoadTime,
      slowestImage,
      fastestImage
    }
  }

  // 성능 리포트 생성
  generateReport(): string {
    const imageAnalysis = this.analyzeImagePerformance()
    const allMetrics = this.getMetrics()
    
    const report = `
📊 성능 분석 리포트
===================

📷 이미지 성능:
- 총 이미지 수: ${imageAnalysis.totalImages}
- 평균 로딩 시간: ${imageAnalysis.averageLoadTime.toFixed(2)}ms
- 가장 느린 이미지: ${imageAnalysis.slowestImage?.value.toFixed(2)}ms
- 가장 빠른 이미지: ${imageAnalysis.fastestImage?.value.toFixed(2)}ms

📈 전체 메트릭 수: ${allMetrics.length}

⚠️ 성능 개선 권장사항:
${imageAnalysis.averageLoadTime > 2000 ? '- 이미지 압축 및 최적화 필요' : '- 이미지 성능 양호'}
${imageAnalysis.totalImages > 10 ? '- 이미지 지연 로딩 고려' : ''}
    `.trim()

    return report
  }
}

// 글로벌 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor()

// 네트워크 성능 측정
export function measureNetworkSpeed(): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now()
    const testImageUrl = '/uploads/sample_image_mobile.webp' // 테스트용 이미지
    
    const img = new Image()
    img.onload = () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      const estimatedSpeed = 1000 / loadTime // 간단한 속도 추정
      resolve(estimatedSpeed)
    }
    img.onerror = () => resolve(0)
    img.src = testImageUrl + '?t=' + Date.now() // 캐시 방지
  })
}

// 메모리 사용량 모니터링
export function getMemoryUsage(): {
  used: number
  total: number
  percentage: number
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  }
  return null
}

// 렌더링 성능 측정
export function measureRenderPerformance(componentName: string): () => void {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    performanceMonitor.recordMetric(`render-${componentName}`, renderTime, 'ms')
  }
}

// 사용자 상호작용 지연 측정
export function measureInteractionDelay(eventName: string): () => void {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const delay = endTime - startTime
    performanceMonitor.recordMetric(`interaction-${eventName}`, delay, 'ms')
  }
}
