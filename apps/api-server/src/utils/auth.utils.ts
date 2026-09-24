import crypto from 'crypto';

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   hashPassword / comparePassword 는 은퇴했다. 저장하거나 비교할 비밀번호가 없다.
//   (bcryptjs 의존도 이 파일에서는 사라진다.)

// Random token generation
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};
