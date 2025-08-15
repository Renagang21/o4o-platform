"use strict";
/**
 * Logen (로젠택배) API Connector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogenConnector = void 0;
class LogenConnector {
    constructor() {
        this.apiUrl = process.env.LOGEN_API_URL || 'https://www.ilogen.com/web/personal/trace';
        this.apiKey = process.env.LOGEN_API_KEY || '';
    }
    async getRate(params) {
        var _a, _b, _c, _d;
        const baseRate = 2500;
        const weightRate = Math.ceil(params.weight / 1000) * 400;
        let regionRate = 0;
        if ((_b = (_a = params.destination) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.includes('제주')) {
            regionRate = 4000;
        }
        return {
            serviceName: '로젠택배',
            estimatedDays: ((_d = (_c = params.destination) === null || _c === void 0 ? void 0 : _c.state) === null || _d === void 0 ? void 0 : _d.includes('제주')) ? 4 : 2,
            cost: baseRate + weightRate + regionRate,
            available: true
        };
    }
    async createLabel(params) {
        const trackingNumber = `LG${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        return {
            trackingNumber,
            labelUrl: `https://example.com/labels/${trackingNumber}.pdf`,
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            cost: 2500 + (params.cod ? 1000 : 0) + (params.insurance ? 1500 : 0)
        };
    }
    async track(trackingNumber) {
        return {
            status: 'in_transit',
            currentLocation: '서울 서부 터미널',
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            events: [
                {
                    timestamp: new Date(),
                    location: '서울 서부 터미널',
                    status: '배송중',
                    description: '터미널 도착'
                }
            ]
        };
    }
    async cancelLabel(trackingNumber) {
        // TODO: Replace with proper logger
        // console.log(`Cancelling Logen shipment: ${trackingNumber}`);
        return true;
    }
    async parseWebhook(data) {
        return null;
    }
}
exports.LogenConnector = LogenConnector;
//# sourceMappingURL=LogenConnector.js.map