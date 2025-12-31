import axios from 'axios';
import type { PatientWithSummary, PatientDetail } from '../types';

const api = axios.create({
    baseURL: '/api/v1/glucoseview',
});

export const glucoseviewApi = {
    async getPatients(): Promise<PatientWithSummary[]> {
        const { data } = await api.get('/patients');
        return data;
    },

    async getPatientDetail(patientId: string): Promise<PatientDetail> {
        const { data } = await api.get(`/patients/${patientId}`);
        return data;
    },
};
