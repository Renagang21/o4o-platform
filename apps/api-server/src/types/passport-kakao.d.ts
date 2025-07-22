declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface Profile {
    id: string;
    provider: string;
    _json: {
      id: number;
      properties?: {
        nickname?: string;
        profile_image?: string;
      };
      kakao_account?: {
        email?: string;
        profile?: {
          nickname?: string;
          profile_image_url?: string;
        };
      };
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export type VerifyCallback = (
    error: any,
    user?: any,
    info?: any
  ) => void;

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void | Promise<void>;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
  }
}