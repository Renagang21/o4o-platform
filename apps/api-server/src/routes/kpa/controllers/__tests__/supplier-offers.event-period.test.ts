import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createSupplierOffersController } from '../supplier-offers.controller.js';

const mockCreateListing = jest.fn();
jest.mock('../../services/event-offer.service.js', () => ({
  EventOfferService: jest.fn().mockImplementation(() => ({ createListing: mockCreateListing })),
  EventOfferCreateError: class extends Error {},
}));
jest.mock('../../helpers/event-offer-organization.helper.js', () => ({
  resolveOrganizationForEventOffer: jest.fn(async () => 'organization-fixture'),
}));
jest.mock('../../../../modules/neture/middleware/supplier-context.resolver.js', () => ({
  resolveSupplierIdForUser: jest.fn(async () => ({ supplierId: 'supplier-fixture' })),
  readOrganizationContext: jest.fn(),
}));

const startAt = '2026-10-20T00:00:00.000Z';
const endAt = '2026-10-30T00:00:00.000Z';
const query = jest.fn();
const app = express();
app.use(express.json());
app.use(createSupplierOffersController({ query } as unknown as DataSource, (req, _res, next) => {
  (req as any).user = { id: 'supplier-user-fixture' };
  next();
}));

beforeEach(() => jest.clearAllMocks());

it('returns the selected event period when creating a supplier proposal', async () => {
  mockCreateListing.mockResolvedValue({ id: 'listing-fixture', offerId: 'offer-fixture', status: 'pending', isActive: false, startAt, endAt });
  const response = await request(app).post('/event-offers').send({ offerId: 'offer-fixture', eventPrice: 2000, startAt, endAt });
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ success: true, data: { startAt, endAt } });
  expect(mockCreateListing).toHaveBeenCalledWith(expect.objectContaining({
    eventConditions: { eventPrice: 2000, startAt: new Date(startAt), endAt: new Date(endAt) },
  }));
});

it('preserves the event period after reloading proposals', async () => {
  query.mockResolvedValue([{ id: 'listing-fixture', startAt: new Date(startAt), endAt: new Date(endAt) }]);
  const response = await request(app).get('/event-offers');
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ success: true, data: [{ id: 'listing-fixture', startAt, endAt }] });
});

it('serializes legacy undated proposals without inventing a period', async () => {
  query.mockResolvedValue([{ id: 'legacy-fixture', startAt: null, endAt: null }]);
  const response = await request(app).get('/event-offers');
  expect(response.status).toBe(200);
  expect(response.body.data[0]).toMatchObject({ id: 'legacy-fixture', startAt: null, endAt: null });
});
