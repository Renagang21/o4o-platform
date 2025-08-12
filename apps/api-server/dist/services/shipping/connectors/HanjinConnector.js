"use strict";
/**
 * Hanjin Express (한진택배) API Connector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HanjinConnector = void 0;
class HanjinConnector {
    constructor() {
        this.apiUrl = process.env.HANJIN_API_URL || 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do';
        this.apiKey = process.env.HANJIN_API_KEY || '';
    }
    /**
     * Get shipping rate
     */
    async getRate(params) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // 한진택배 요금 계산
        const baseRate = 2800; // 기본 요금
        const weightRate = Math.ceil(params.weight / 1000) * 450; // kg당 450원
        // 지역별 추가 요금
        let regionRate = 0;
        if ((_b = (_a = params.destination) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.includes('제주')) {
            regionRate = 3500;
        }
        else if (((_d = (_c = params.destination) === null || _c === void 0 ? void 0 : _c.state) === null || _d === void 0 ? void 0 : _d.includes('강원')) || ((_f = (_e = params.destination) === null || _e === void 0 ? void 0 : _e.state) === null || _f === void 0 ? void 0 : _f.includes('경북'))) {
            regionRate = 1200;
        }
        return {
            serviceName: '한진택배',
            estimatedDays: ((_h = (_g = params.destination) === null || _g === void 0 ? void 0 : _g.state) === null || _h === void 0 ? void 0 : _h.includes('제주')) ? 3 : 2,
            cost: baseRate + weightRate + regionRate,
            available: true
        };
    }
    /**
     * Create shipping label
     */
    async createLabel(params) {
        try {
            const trackingNumber = this.generateTrackingNumber();
            // Simulate API call to Hanjin
            const response = await this.mockCreateLabel({
                trackingNumber,
                sender: params.sender,
                receiver: params.receiver,
                items: params.items,
                cod: params.cod,
                insurance: params.insurance
            });
            return {
                trackingNumber: response.trackingNumber,
                labelUrl: response.labelUrl,
                estimatedDelivery: response.estimatedDelivery,
                cost: response.cost
            };
        }
        catch (error) {
            console.error('Hanjin label creation failed:', error);
            throw new Error('Failed to create shipping label');
        }
    }
    /**
     * Track shipment
     */
    async track(trackingNumber) {
        try {
            // In production, call actual Hanjin tracking API
            // const response = await axios.get(`${this.apiUrl}`, {
            //   params: {
            //     wblnum: trackingNumber
            //   }
            // });
            const mockData = this.getMockTrackingData(trackingNumber);
            return {
                status: this.mapStatus(mockData.status),
                currentLocation: mockData.currentLocation,
                estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                events: mockData.events.map(event => ({
                    timestamp: new Date(`${event.date} ${event.time}`),
                    location: event.location,
                    status: event.status,
                    description: event.description
                }))
            };
        }
        catch (error) {
            console.error('Hanjin tracking failed:', error);
            throw new Error('Failed to track shipment');
        }
    }
    /**
     * Cancel shipping label
     */
    async cancelLabel(trackingNumber) {
        try {
            console.log(`Cancelling Hanjin shipment: ${trackingNumber}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        }
        catch (error) {
            console.error('Hanjin cancellation failed:', error);
            return false;
        }
    }
    /**
     * Parse webhook data
     */
    async parseWebhook(data) {
        if (data.waybillNo) {
            return {
                trackingNumber: data.waybillNo,
                status: this.mapStatus(data.status),
                location: data.location,
                timestamp: new Date(data.timestamp)
            };
        }
        return null;
    }
    /**
     * Map Hanjin status to standard status
     */
    mapStatus(hanjinStatus) {
        const statusMap = {
            '접수완료': 'pending',
            '집하완료': 'picked_up',
            '배송중': 'in_transit',
            '배송출발': 'out_for_delivery',
            '배송완료': 'delivered',
            '반송완료': 'failed'
        };
        return statusMap[hanjinStatus] || 'pending';
    }
    /**
     * Generate mock tracking number
     */
    generateTrackingNumber() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `HJ${timestamp.slice(-8)}${random}`;
    }
    /**
     * Mock create label response
     */
    async mockCreateLabel(params) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const basePrice = 2800;
        const codFee = params.cod ? 1000 : 0;
        const insuranceFee = params.insurance ? 1800 : 0;
        return {
            trackingNumber: params.trackingNumber,
            labelUrl: `https://example.com/labels/${params.trackingNumber}.pdf`,
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            cost: basePrice + codFee + insuranceFee
        };
    }
    /**
     * Get mock tracking data
     */
    getMockTrackingData(trackingNumber) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return {
            trackingNumber,
            status: '배송중',
            currentLocation: '서울 동부 터미널',
            events: [
                {
                    date: yesterday.toISOString().split('T')[0],
                    time: '10:00',
                    location: '서울 본사',
                    status: '접수완료',
                    description: '상품 접수 완료'
                },
                {
                    date: yesterday.toISOString().split('T')[0],
                    time: '15:30',
                    location: '서울 본사',
                    status: '집하완료',
                    description: '집하 처리 완료'
                },
                {
                    date: now.toISOString().split('T')[0],
                    time: '08:00',
                    location: '서울 동부 터미널',
                    status: '배송중',
                    description: '터미널 도착'
                }
            ]
        };
    }
}
exports.HanjinConnector = HanjinConnector;
//# sourceMappingURL=HanjinConnector.js.map