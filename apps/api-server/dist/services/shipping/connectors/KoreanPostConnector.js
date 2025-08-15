"use strict";
/**
 * Korean Post (우체국택배) API Connector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KoreanPostConnector = void 0;
class KoreanPostConnector {
    constructor() {
        this.apiUrl = process.env.KPOST_API_URL || 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm';
        this.apiKey = process.env.KPOST_API_KEY || '';
    }
    async getRate(params) {
        var _a, _b, _c, _d, _e, _f;
        const baseRate = 2200; // 우체국은 보통 저렴
        const weightRate = Math.ceil(params.weight / 1000) * 350;
        let regionRate = 0;
        if ((_b = (_a = params.destination) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.includes('제주')) {
            regionRate = 2500;
        }
        else if ((_d = (_c = params.destination) === null || _c === void 0 ? void 0 : _c.state) === null || _d === void 0 ? void 0 : _d.includes('도서')) {
            regionRate = 3000;
        }
        return {
            serviceName: '우체국택배',
            estimatedDays: ((_f = (_e = params.destination) === null || _e === void 0 ? void 0 : _e.state) === null || _f === void 0 ? void 0 : _f.includes('제주')) ? 3 : 2,
            cost: baseRate + weightRate + regionRate,
            available: true
        };
    }
    async createLabel(params) {
        const trackingNumber = `EP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        return {
            trackingNumber,
            labelUrl: `https://example.com/labels/${trackingNumber}.pdf`,
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            cost: 2200 + (params.cod ? 800 : 0) + (params.insurance ? 1200 : 0)
        };
    }
    async track(trackingNumber) {
        return {
            status: 'in_transit',
            currentLocation: '서울우편집중국',
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            events: [
                {
                    timestamp: new Date(),
                    location: '서울우편집중국',
                    status: '운송중',
                    description: '우편집중국 도착'
                }
            ]
        };
    }
    async cancelLabel(trackingNumber) {
        // TODO: Replace with proper logger
        return true;
    }
    async parseWebhook(data) {
        return null;
    }
}
exports.KoreanPostConnector = KoreanPostConnector;
//# sourceMappingURL=KoreanPostConnector.js.map