export declare const tossPaymentsConfig: {
    clientKey: string;
    secretKey: string;
    apiUrl: string;
    webhookSecret: string;
    successUrl: string;
    failUrl: string;
    webhookUrl: string;
    currency: string;
    country: string;
    isTestMode: boolean;
};
export declare const tossPaymentsClient: import("axios").AxiosInstance;
export declare enum PaymentMethod {
    CARD = "\uCE74\uB4DC",
    VIRTUAL_ACCOUNT = "\uAC00\uC0C1\uACC4\uC88C",
    TRANSFER = "\uACC4\uC88C\uC774\uCCB4",
    MOBILE_PHONE = "\uD734\uB300\uD3F0",
    CULTURE_GIFT_CARD = "\uBB38\uD654\uC0C1\uD488\uAD8C",
    BOOK_GIFT_CARD = "\uB3C4\uC11C\uBB38\uD654\uC0C1\uD488\uAD8C",
    GAME_GIFT_CARD = "\uAC8C\uC784\uBB38\uD654\uC0C1\uD488\uAD8C",
    EASY_PAY = "\uAC04\uD3B8\uACB0\uC81C"
}
export declare enum PaymentStatus {
    READY = "READY",
    IN_PROGRESS = "IN_PROGRESS",
    WAITING_FOR_DEPOSIT = "WAITING_FOR_DEPOSIT",
    DONE = "DONE",
    CANCELED = "CANCELED",
    PARTIAL_CANCELED = "PARTIAL_CANCELED",
    ABORTED = "ABORTED",
    EXPIRED = "EXPIRED"
}
export declare const CardCompanyCodes: {
    readonly 국민: "KOOKMIN";
    readonly 신한: "SHINHAN";
    readonly 삼성: "SAMSUNG";
    readonly 현대: "HYUNDAI";
    readonly 롯데: "LOTTE";
    readonly BC: "BC";
    readonly 농협: "NONGHYUP";
    readonly 하나: "HANA";
    readonly 우리: "WOORI";
    readonly 씨티: "CITI";
    readonly 카카오뱅크: "KAKAOBANK";
    readonly 케이뱅크: "KBANK";
    readonly 토스뱅크: "TOSSBANK";
};
export declare function validateTossPaymentsConfig(): void;
export declare function confirmPayment(paymentKey: string, orderId: string, amount: number): Promise<any>;
export declare function cancelPayment(paymentKey: string, cancelReason: string): Promise<any>;
export declare function getPayment(paymentKey: string): Promise<any>;
//# sourceMappingURL=toss-payments.d.ts.map