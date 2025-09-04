/**
 * Formatting utility functions
 */
/**
 * Format currency to Korean Won (기본) 또는 다른 통화
 * @param amount 금액
 * @param currency 통화 코드 (기본값: 'KRW')
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷된 통화 문자열
 */
export declare function formatCurrency(amount: number | string, currency?: string, locale?: string): string;
/**
 * Alias for formatCurrency with default KRW
 * @param amount 금액
 * @returns 포맷된 원화 문자열
 */
export declare function formatPrice(amount: number | string): string;
/**
 * Format number with locale-specific formatting
 * @param value 숫자 값
 * @param options Intl.NumberFormatOptions
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷된 숫자 문자열
 */
export declare function formatNumber(value: number | string, options?: Intl.NumberFormatOptions, locale?: string): string;
/**
 * Format date to Korean date format
 * @param date Date 객체, 문자열, 또는 타임스탬프
 * @param format 날짜 형식 ('short', 'medium', 'long', 'full')
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷된 날짜 문자열
 */
export declare function formatDate(date: Date | string | number | null | undefined, format?: 'short' | 'medium' | 'long' | 'full', locale?: string): string;
/**
 * Format file size to human-readable format
 * @param bytes 바이트 수
 * @param decimals 소수점 자리수 (기본값: 2)
 * @returns 포맷된 파일 크기 문자열
 */
export declare function formatFileSize(bytes: number, decimals?: number): string;
/**
 * Format percentage value
 * @param value 백분율 값 (0-100 또는 0-1)
 * @param decimals 소수점 자리수 (기본값: 1)
 * @param isDecimal 입력값이 0-1 범위인지 여부 (기본값: false)
 * @returns 포맷된 백분율 문자열
 */
export declare function formatPercentage(value: number | string, decimals?: number, isDecimal?: boolean): string;
/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date Date to compare
 * @param baseDate Base date for comparison (default: now)
 * @param locale Locale for formatting (default: 'ko-KR')
 * @returns Formatted relative time string
 */
export declare function formatRelativeTime(date: Date | string | number, baseDate?: Date, locale?: string): string;
/**
 * Format date from now (convenience wrapper for formatRelativeTime)
 * @param date Date to format
 * @param locale Locale for formatting (default: 'ko-KR')
 * @returns Formatted relative time string
 */
export declare function formatDateFromNow(date: Date | string | number, locale?: string): string;
/**
 * Format phone number to Korean format
 * @param phoneNumber Phone number string
 * @returns Formatted phone number
 */
export declare function formatPhoneNumber(phoneNumber: string): string;
//# sourceMappingURL=format.d.ts.map