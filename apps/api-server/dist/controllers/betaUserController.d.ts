import { Request, Response } from 'express';
export declare class BetaUserController {
    registerBetaUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    checkRegistrationStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    submitFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBetaUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBetaUserById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    approveBetaUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateBetaUserStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getFeedbackById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    respondToFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateFeedbackStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateFeedbackPriority(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBetaAnalytics(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getHighPriorityFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUnassignedFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createConversation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getConversation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateConversationStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUserConversations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    startLiveSupport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    markFeedbackViewed(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getRealtimeStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPendingNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const betaUserRegistrationValidation: import("express-validator").ValidationChain[];
export declare const feedbackSubmissionValidation: import("express-validator").ValidationChain[];
export declare const betaUserController: BetaUserController;
//# sourceMappingURL=betaUserController.d.ts.map