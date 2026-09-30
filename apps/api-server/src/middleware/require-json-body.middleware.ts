import type { NextFunction, Request, Response } from 'express';

/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 — 이메일·비밀번호 경로의 교차 사이트 요청 방어.
 *
 * 인증 쿠키는 운영에서 `SameSite=None` 이고 서버는 `express.urlencoded` 도 받는다. 그래서 다른 사이트의
 * HTML form(urlencoded · multipart · text/plain = preflight 없는 단순 요청)이 쿠키 세션을 실은 채 도착할 수 있다.
 * 1차 방어는 CORS 의 비허용 Origin 거부다. 이 middleware 는 그 위에 **JSON 본문만** 받게 해,
 * 교차 출처 요청이 반드시 preflight(CORS 거부)를 거치도록 만든다.
 * 특히 `POST /auth/password` 는 비밀번호가 없는 계정에 현재 비밀번호 없이 첫 비밀번호를 설정한다.
 *
 * 화면(`@o4o/auth-client`)은 항상 `application/json` 으로 보낸다.
 */
export function requireJsonBody(req: Request, res: Response, next: NextFunction): void {
  if (req.is('application/json')) {
    next();
    return;
  }
  res.status(415).json({
    success: false,
    error: 'JSON 형식의 요청만 받습니다.',
    code: 'UNSUPPORTED_MEDIA_TYPE',
  });
}
