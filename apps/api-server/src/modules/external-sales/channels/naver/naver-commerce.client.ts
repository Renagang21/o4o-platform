/**
 * Naver Commerce API Client — WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1
 *
 * 네이버 커머스 API(스마트스토어) 호출 어댑터. 인증 · 상품 등록 · 수정 · 상태 조회만 담는다.
 * 주문 API 는 본 WO 조사 범위이며 구현 대상이 아니다 (WO §4 제외 범위).
 *
 * 인증 (커머스 API센터 · OAuth2 client_credentials):
 *   1. `bcrypt(clientId + "_" + timestamp, salt = clientSecret)` → Base64  = 전자서명
 *   2. `POST /external/v1/oauth2/token` 에 client_id · timestamp · client_secret_sign
 *      · grant_type=client_credentials · type=SELF 전달
 *   3. 응답 access_token 을 `Authorization: Bearer` 로 사용, 만료 전까지 메모리 캐시
 *
 * 자격정보는 **환경변수에서만** 읽는다. 코드·문서·커밋에 하드코딩하지 않는다 (WO §2-3).
 *   NAVER_COMMERCE_CLIENT_ID · NAVER_COMMERCE_CLIENT_SECRET
 *
 * 운영 제약 (조사 결과 — 실제 연동 전에 반드시 해소해야 한다):
 *   - 커머스 API센터 애플리케이션에 **호출 IP 를 최대 3개까지 사전 등록**해야 한다.
 *     Cloud Run 은 egress IP 가 고정되지 않으므로 Cloud NAT 정적 IP 가 선행 조건이다.
 *   - 애플리케이션 인증은 주기적으로 갱신해야 하며 만료 시 앱이 휴면 처리된다.
 *   - 공개 샌드박스가 없다. 검증은 실제 판매자 계정에서 '판매중지' 상태로 수행한다.
 */

import bcrypt from 'bcrypt';
import axios, { type AxiosInstance } from 'axios';

const NAVER_COMMERCE_BASE_URL = 'https://api.commerce.naver.com/external';

/** 토큰 만료 여유 — 만료 직전 호출이 401 로 떨어지지 않도록 앞당겨 재발급한다 */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

export class NaverCommerceConfigError extends Error {
  readonly code = 'NAVER_COMMERCE_CONFIG_MISSING';
  constructor(message: string) {
    super(message);
    this.name = 'NaverCommerceConfigError';
  }
}

export class NaverCommerceApiError extends Error {
  readonly code = 'NAVER_COMMERCE_API_ERROR';
  readonly status: number | null;
  /** 네이버가 반환한 원본 오류 본문 — lastError 저장·진단용 */
  readonly detail: unknown;

  constructor(message: string, status: number | null, detail: unknown) {
    super(message);
    this.name = 'NaverCommerceApiError';
    this.status = status;
    this.detail = detail;
  }
}

export interface NaverCommerceCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * 환경변수에서 자격정보를 읽는다.
 * @throws NaverCommerceConfigError 미설정 시 — 연동 미구성 상태를 명확히 드러낸다
 */
export function loadNaverCredentialsFromEnv(): NaverCommerceCredentials {
  const clientId = (process.env.NAVER_COMMERCE_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.NAVER_COMMERCE_CLIENT_SECRET ?? '').trim();

  if (!clientId || !clientSecret) {
    throw new NaverCommerceConfigError(
      '네이버 커머스 API 자격정보가 설정되지 않았습니다. ' +
        'NAVER_COMMERCE_CLIENT_ID · NAVER_COMMERCE_CLIENT_SECRET 환경변수를 확인하세요.',
    );
  }
  return { clientId, clientSecret };
}

/**
 * 커머스 API 전자서명 생성.
 *
 * `clientSecret` 은 비밀번호가 아니라 **bcrypt salt** 로 쓰인다 (네이버 규격).
 * salt 형식이 아니면 bcrypt 가 throw 하므로 설정 오류가 즉시 드러난다.
 */
export function createNaverSignature(
  clientId: string,
  clientSecret: string,
  timestamp: number,
): string {
  const password = `${clientId}_${timestamp}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  return Buffer.from(hashed, 'utf-8').toString('base64');
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

/** 상품 등록 응답 — 원상품번호와 채널상품번호는 서로 다른 값이다 */
export interface NaverProductCreateResult {
  /** 원상품 번호 */
  originProductNo: number;
  /** 스마트스토어 채널상품 번호 — 외부에서 상품을 지칭하는 값 */
  smartstoreChannelProductNo: number | null;
}

export class NaverCommerceClient {
  private readonly credentials: NaverCommerceCredentials;
  private readonly http: AxiosInstance;
  private token: CachedToken | null = null;

  constructor(credentials?: NaverCommerceCredentials, http?: AxiosInstance) {
    this.credentials = credentials ?? loadNaverCredentialsFromEnv();
    this.http =
      http ??
      axios.create({
        baseURL: NAVER_COMMERCE_BASE_URL,
        timeout: 30_000,
      });
  }

  /**
   * Access Token 확보 (메모리 캐시).
   * 만료 여유 안에 들어오면 재발급한다.
   */
  async getAccessToken(nowMs: number = Date.now()): Promise<string> {
    if (this.token && this.token.expiresAtMs - TOKEN_REFRESH_MARGIN_MS > nowMs) {
      return this.token.accessToken;
    }

    const timestamp = nowMs;
    const signature = createNaverSignature(
      this.credentials.clientId,
      this.credentials.clientSecret,
      timestamp,
    );

    const body = new URLSearchParams({
      client_id: this.credentials.clientId,
      timestamp: String(timestamp),
      client_secret_sign: signature,
      grant_type: 'client_credentials',
      type: 'SELF',
    });

    try {
      const res = await this.http.post('/v1/oauth2/token', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const accessToken: string = res.data?.access_token;
      const expiresInSec: number = Number(res.data?.expires_in ?? 0);
      if (!accessToken) {
        throw new NaverCommerceApiError('토큰 응답에 access_token 이 없습니다.', res.status, res.data);
      }
      this.token = {
        accessToken,
        expiresAtMs: nowMs + Math.max(expiresInSec, 60) * 1000,
      };
      return accessToken;
    } catch (err) {
      throw toApiError(err, '네이버 커머스 API 토큰 발급에 실패했습니다.');
    }
  }

  private async authorizedHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 상품 등록 — `POST /external/v2/products`
   * @param payload `buildNaverProductPayload()` 결과
   */
  async createProduct(payload: unknown): Promise<NaverProductCreateResult> {
    try {
      const res = await this.http.post('/v2/products', payload, {
        headers: await this.authorizedHeaders(),
      });
      return {
        originProductNo: res.data?.originProductNo,
        smartstoreChannelProductNo: res.data?.smartstoreChannelProductNo ?? null,
      };
    } catch (err) {
      throw toApiError(err, '네이버 상품 등록에 실패했습니다.');
    }
  }

  /**
   * 채널상품 조회 — `GET /external/v2/products/channel-products/{channelProductNo}`
   *
   * 등록 후 상태 확인 · 동기화 전 현재 상태 대조에 쓴다.
   */
  async getChannelProduct(channelProductNo: string | number): Promise<unknown> {
    try {
      const res = await this.http.get(`/v2/products/channel-products/${channelProductNo}`, {
        headers: await this.authorizedHeaders(),
      });
      return res.data;
    } catch (err) {
      throw toApiError(err, '네이버 채널상품 조회에 실패했습니다.');
    }
  }

  /**
   * 채널상품 수정 — `PUT /external/v2/products/channel-products/{channelProductNo}`
   *
   * 네이버는 부분 수정을 지원하지 않는다 — 수정 시에도 전체 payload 를 보낸다.
   * (조회 → 병합 → 전체 전송이 정석. 가격만 바꿔도 salePrice 외 필수 필드가 함께 필요하다)
   */
  async updateChannelProduct(
    channelProductNo: string | number,
    payload: unknown,
  ): Promise<unknown> {
    try {
      const res = await this.http.put(
        `/v2/products/channel-products/${channelProductNo}`,
        payload,
        { headers: await this.authorizedHeaders() },
      );
      return res.data;
    } catch (err) {
      throw toApiError(err, '네이버 채널상품 수정에 실패했습니다.');
    }
  }

  /**
   * 채널상품 삭제 — `DELETE /external/v2/products/channel-products/{channelProductNo}`
   *
   * 파일럿 되돌리기 경로. 판매중지(statusType='SUSPENSION')로 내리는 편이 안전하며,
   * 삭제는 파일럿 흔적 제거가 필요할 때만 쓴다.
   */
  async deleteChannelProduct(channelProductNo: string | number): Promise<void> {
    try {
      await this.http.delete(`/v2/products/channel-products/${channelProductNo}`, {
        headers: await this.authorizedHeaders(),
      });
    } catch (err) {
      throw toApiError(err, '네이버 채널상품 삭제에 실패했습니다.');
    }
  }
}

function toApiError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof NaverCommerceApiError || err instanceof NaverCommerceConfigError) return err;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? null;
    const detail = err.response?.data ?? err.message;
    const naverMessage =
      (detail as any)?.message ?? (detail as any)?.invalidInputs?.[0]?.message ?? null;
    return new NaverCommerceApiError(
      naverMessage ? `${fallbackMessage} (${naverMessage})` : fallbackMessage,
      status,
      detail,
    );
  }
  return new NaverCommerceApiError(fallbackMessage, null, err);
}
