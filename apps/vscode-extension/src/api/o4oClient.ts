import axios from 'axios';

export class O4OClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async createPage(pageData: any, token: string) {
        try {
            const response = await axios.post(`${this.baseUrl}/admin/pages`, pageData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('API Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to create page');
        }
    }
}
