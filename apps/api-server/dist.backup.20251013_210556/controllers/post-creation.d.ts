import { Request, Response } from 'express';
/**
 * 🆕 Post 생성 (UAGBFormsBlock Post Creation Mode에서 호출)
 */
export declare const createPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 🆕 Archive 데이터 조회 (UAGBArchiveBlock에서 호출)
 */
export declare const getArchiveData: (req: Request, res: Response) => Promise<void>;
/**
 * 🆕 Post Type 스키마 조회
 */
export declare const getPostTypeSchema: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 🆕 Post Type 생성 (UAGBFormsBlock에서 Post Creation Mode 활성화 시)
 */
export declare const createPostType: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 🆕 개별 Post 조회
 */
export declare const getPostById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 🆕 Post 업데이트
 */
export declare const updatePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 🆕 Post 삭제
 */
export declare const deletePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 🆕 사용자 통계 조회 (UAGBUserDashboardBlock용)
 */
export declare const getUserStats: (req: Request, res: Response) => Promise<void>;
/**
 * 🆕 사용 가능한 Post Type 목록 조회
 */
export declare const getUserAvailablePostTypes: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=post-creation.d.ts.map