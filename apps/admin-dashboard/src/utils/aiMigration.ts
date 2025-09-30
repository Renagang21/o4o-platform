/**
 * AI 설정 마이그레이션 유틸리티
 * 구버전 설정을 새 버전으로 자동 업데이트
 */

export class AIConfigMigration {
  private static MIGRATED_KEY = 'ai_config_migrated_v2';
  
  /**
   * 구버전 gemini-pro 설정을 새 모델로 마이그레이션
   */
  static migrateOldConfigs(): void {
    // 이미 마이그레이션 되었는지 확인
    if (localStorage.getItem(this.MIGRATED_KEY)) {
      return;
    }
    
    try {
      // AI 모델 설정 확인 및 업데이트
      const defaultModel = localStorage.getItem('ai_default_model_gemini');
      if (defaultModel === 'gemini-pro') {
        localStorage.setItem('ai_default_model_gemini', 'gemini-2.5-flash');
        // Migration: Updated gemini-pro to gemini-2.5-flash
      }
      
      // 저장된 API 키 확인
      const apiKeysStr = localStorage.getItem('ai_api_keys');
      if (apiKeysStr) {
        try {
          const apiKeys = JSON.parse(apiKeysStr);
          // API 키가 있으면 기본 모델 설정
          if (apiKeys.gemini && !localStorage.getItem('ai_default_model_gemini')) {
            localStorage.setItem('ai_default_model_gemini', 'gemini-2.5-flash');
          }
        } catch (e) {
          // Migration: Failed to parse API keys
        }
      }
      
      // 모든 로컬 스토리지 항목 검사
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value && value.includes('gemini-pro')) {
            // gemini-pro를 gemini-2.5-flash로 치환
            const newValue = value.replace(/gemini-pro/g, 'gemini-2.5-flash');
            localStorage.setItem(key, newValue);
            // Migration: Updated model from gemini-pro to gemini-2.5-flash
          }
        }
      }
      
      // 마이그레이션 완료 표시
      localStorage.setItem(this.MIGRATED_KEY, new Date().toISOString());
      // Migration completed successfully
      
    } catch (error) {
      // Migration failed - silently continue
    }
  }
  
  /**
   * 디버깅용: 모든 AI 관련 로컬 스토리지 항목 가져오기
   */
  static debugAIConfigs(): Record<string, string> {
    const configs: Record<string, string> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('ai') || key.includes('gemini') || key.includes('model'))) {
        const value = localStorage.getItem(key);
        if (value) {
          configs[key] = value;
        }
      }
    }
    
    return configs;
  }
  
  /**
   * 강제 리셋: 모든 gemini-pro 참조 제거
   */
  static forceResetGeminiPro(): void {
    let updated = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value && value.includes('gemini-pro')) {
          if (key.includes('model')) {
            // 모델 설정은 새 모델로 교체
            const newValue = value.replace(/gemini-pro/g, 'gemini-2.5-flash');
            localStorage.setItem(key, newValue);
            updated++;
            // Reset: Updated model to use gemini-2.5-flash
          } else {
            // 다른 항목은 삭제
            localStorage.removeItem(key);
            updated++;
            // Reset: Removed item containing gemini-pro
          }
        }
      }
    }
    
    if (updated > 0) {
      // Reset: Updated/Removed items containing gemini-pro
      // 마이그레이션 플래그 재설정
      localStorage.setItem(this.MIGRATED_KEY, new Date().toISOString());
    } else {
      // Reset: No gemini-pro references found
    }
  }
}

// 페이지 로드 시 자동 실행
if (typeof window !== 'undefined') {
  // 자동 마이그레이션 실행
  AIConfigMigration.migrateOldConfigs();
  
  // 개발자 도구 콘솔에서 사용 가능하도록 전역 노출
  (window as any).AIConfigMigration = AIConfigMigration;
}