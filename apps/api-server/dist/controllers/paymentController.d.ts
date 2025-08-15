import { Request, Response } from 'express';
export declare class PaymentController {
    private paymentRepository;
    private orderRepository;
    private productRepository;
    createPaymentRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    processPaymentCompletion: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    processRefund: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPaymentHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPaymentMethods: (req: Request, res: Response) => Promise<void>;
    private processIamportPayment;
    private processTossPayment;
    private processKakaoPayment;
    private processGatewayRefund;
    private sanitizePaymentDetails;
}
//# sourceMappingURL=paymentController.d.ts.map