// src/reportWebVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry)
    getFID(onPerfEntry)
    getFCP(onPerfEntry)
    getLCP(onPerfEntry)
    getTTFB(onPerfEntry)
  }
}

// 성능 지표를 서버로 전송하는 함수
export function sendToAnalytics(metric: any) {
  const body = JSON.stringify(metric)
  const url = '/api/analytics'

  // Navigator.sendBeacon을 사용하여 페이지 언로드 시에도 데이터 전송
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body)
  } else {
    fetch(url, { body, method: 'POST', keepalive: true })
  }
}

// 이미지 로딩 성능 측정
export function measureImagePerformance(imageSrc: string, startTime: number) {
  const endTime = performance.now()
  const loadTime = endTime - startTime
  
  const metric = {
    name: 'image-load-time',
    value: loadTime,
    src: imageSrc,
    timestamp: Date.now()
  }
  
  console.log('Image Load Performance:', metric)
  
  // 성능 데이터를 수집하여 분석
  if (loadTime > 2000) { // 2초 이상 걸린 경우
    console.warn('Slow image loading detected:', metric)
  }
  
  return metric
}

// 네트워크 상태별 성능 측정
export function measureNetworkPerformance() {
  const connection = (navigator as any).connection
  
  if (connection) {
    const networkInfo = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    }
    
    console.log('Network Information:', networkInfo)
    return networkInfo
  }
  
  return null
}
