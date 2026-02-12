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
export function formatCurrency(
  amount: number | string,
  currency: string = 'KRW',
  locale: string = 'ko-KR'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₩0';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numAmount);
}

/**
 * Alias for formatCurrency with default KRW
 * @param amount 금액
 * @returns 포맷된 원화 문자열
 */
export function formatPrice(amount: number | string): string {
  return formatCurrency(amount, 'KRW', 'ko-KR');
}

/**
 * Format number with locale-specific formatting
 * @param value 숫자 값
 * @param options Intl.NumberFormatOptions
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷된 숫자 문자열
 */
export function formatNumber(
  value: number | string,
  options?: Intl.NumberFormatOptions,
  locale: string = 'ko-KR'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }

  return new Intl.NumberFormat(locale, options).format(numValue);
}

/**
 * Format date to Korean date format
 * @param date Date 객체, 문자열, 또는 타임스탬프
 * @param format 날짜 형식 ('short', 'medium', 'long', 'full')
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷된 날짜 문자열
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'ko-KR'
): string {
  // Handle null/undefined safely
  if (!date) {
    return 'N/A';
  }

  let dateObj: Date;
  try {
    if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    // Check if date is valid
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDate:', date);
      return 'Invalid date';
    }
  } catch (error) {
    console.error('Error parsing date:', error);
    return 'Error';
  }

  const options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'medium':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      break;
    case 'full':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format file size to human-readable format
 * @param bytes 바이트 수
 * @param decimals 소수점 자리수 (기본값: 2)
 * @returns 포맷된 파일 크기 문자열
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format percentage value
 * @param value 백분율 값 (0-100 또는 0-1)
 * @param decimals 소수점 자리수 (기본값: 1)
 * @param isDecimal 입력값이 0-1 범위인지 여부 (기본값: false)
 * @returns 포맷된 백분율 문자열
 */
export function formatPercentage(
  value: number | string,
  decimals: number = 1,
  isDecimal: boolean = false
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0%';
  }

  const percentage = isDecimal ? numValue * 100 : numValue;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date Date to compare
 * @param baseDate Base date for comparison (default: now)
 * @param locale Locale for formatting (default: 'ko-KR')
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string | number,
  baseDate: Date = new Date(),
  _locale: string = 'ko-KR'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const diffInMs = baseDate.getTime() - dateObj.getTime();
  const diffInSeconds = Math.round(diffInMs / 1000);
  const diffInMinutes = Math.round(diffInSeconds / 60);
  const diffInHours = Math.round(diffInMinutes / 60);
  const diffInDays = Math.round(diffInHours / 24);
  const diffInMonths = Math.round(diffInDays / 30);
  const diffInYears = Math.round(diffInDays / 365);

  // Simple Korean relative time formatting without Intl.RelativeTimeFormat
  if (Math.abs(diffInSeconds) < 60) {
    return `${Math.abs(diffInSeconds)}초 전`;
  } else if (Math.abs(diffInMinutes) < 60) {
    return `${Math.abs(diffInMinutes)}분 전`;
  } else if (Math.abs(diffInHours) < 24) {
    return `${Math.abs(diffInHours)}시간 전`;
  } else if (Math.abs(diffInDays) < 30) {
    return `${Math.abs(diffInDays)}일 전`;
  } else if (Math.abs(diffInMonths) < 12) {
    return `${Math.abs(diffInMonths)}개월 전`;
  } else {
    return `${Math.abs(diffInYears)}년 전`;
  }
}

/**
 * Format date from now (convenience wrapper for formatRelativeTime)
 * @param date Date to format
 * @param locale Locale for formatting (default: 'ko-KR')
 * @returns Formatted relative time string
 */
export function formatDateFromNow(
  date: Date | string | number,
  locale: string = 'ko-KR'
): string {
  return formatRelativeTime(date, new Date(), locale);
}

/**
 * Format phone number to Korean format
 * @param phoneNumber Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a Korean phone number
  if (cleaned.startsWith('82')) {
    // International format
    const number = cleaned.substring(2);
    if (number.startsWith('10')) {
      // Mobile
      return `+82-${number.substring(0, 2)}-${number.substring(2, 6)}-${number.substring(6)}`;
    } else if (number.startsWith('2')) {
      // Seoul
      return `+82-${number.substring(0, 1)}-${number.substring(1, 5)}-${number.substring(5)}`;
    } else {
      // Other regions
      return `+82-${number.substring(0, 2)}-${number.substring(2, 5)}-${number.substring(5)}`;
    }
  } else if (cleaned.startsWith('010')) {
    // Mobile
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.startsWith('02')) {
    // Seoul
    return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length >= 9) {
    // Other regions
    const areaCode = cleaned.substring(0, 3);
    if (['031', '032', '033', '041', '042', '043', '051', '052', '053', '054', '055', '061', '062', '063', '064'].includes(areaCode)) {
      return `${areaCode}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
    }
  }
  
  // Return original if no pattern matches
  return phoneNumber;
}

/**
 * Format business registration number for display (XXX-XX-XXXXX)
 * @param bn Business number string (digits only or with hyphens)
 * @returns Formatted business number
 */
export function formatBusinessNumber(bn: string): string {
  const cleaned = bn.replace(/\D/g, '');
  if (cleaned.length !== 10) return bn;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
}
