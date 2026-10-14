import { AppDataSource } from '../../../../database/connection.js';
import { NetureOfferService } from '../offer.service.js';

jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });
jest.mock('../../../../database/connection.js', () => ({ AppDataSource: { getRepository: jest.fn(), query: jest.fn() } }));

const routes = [
  ['createSupplierOfferFromExistingMaster', 'supplierOfferRegistrationService', ['supplier-fixture', { masterId: 'master-fixture' }]],
  ['updateSupplierOffer', 'supplierOfferWriteService', ['offer-fixture', 'supplier-fixture', { priceGeneral: 100 }]],
  ['updateBusinessContent', 'supplierOfferWriteService', ['offer-fixture', 'supplier-fixture', { businessShortDescription: null }]],
  ['batchUpdateSupplierOffers', 'supplierOfferWriteService', ['supplier-fixture', [{ offerId: 'offer-fixture' }]]],
  ['bulkDeleteOffers', 'supplierOfferWriteService', ['supplier-fixture', ['offer-fixture'], 'actor-fixture']],
  ['updateDistribution', 'supplierOfferDistributionService', ['offer-fixture', 'supplier-fixture', 'actor-fixture', { serviceKeys: [] }]],
  ['approveProduct', 'offerLifecycleService', ['offer-fixture', 'actor-fixture']],
  ['rejectProduct', 'offerLifecycleService', ['offer-fixture', 'actor-fixture', 'Fixture reason']],
  ['submitForApproval', 'offerLifecycleService', ['supplier-fixture', ['offer-fixture']]],
  ['batchToggleOfferActive', 'offerLifecycleService', [['offer-fixture'], false]],
] as const;

it.each(routes)('%s forwards every ownership/actor/value argument and the complete result', async (method, dependency, args) => {
  const service = new NetureOfferService({} as never);
  const result = { fixtureResult: true, nested: { unchanged: ['fixture'] } };
  const handler = jest.fn().mockResolvedValue(result);
  Object.defineProperty(service, dependency, { value: { [method]: handler } });
  const invoke = (service as unknown as Record<string, (...params: unknown[]) => Promise<unknown>>)[method].bind(service);
  expect(await invoke(...args)).toBe(result);
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(...args);
});

it('constructor keeps repositories lazy and does not call legacy Catalog writes', () => {
  jest.clearAllMocks();
  const catalog = { resolveOrCreateMaster: jest.fn(), updateProductMaster: jest.fn() };
  new NetureOfferService(catalog as never);
  expect(AppDataSource.getRepository).not.toHaveBeenCalled();
  expect(AppDataSource.query).not.toHaveBeenCalled();
  expect(catalog.resolveOrCreateMaster).not.toHaveBeenCalled();
  expect(catalog.updateProductMaster).not.toHaveBeenCalled();
});

it('facade propagates the original lifecycle error', async () => {
  const service = new NetureOfferService({} as never);
  const failure = new Error('Fixture lifecycle failure');
  Object.defineProperty(service, 'offerLifecycleService', { value: { approveProduct: jest.fn().mockRejectedValue(failure) } });
  await expect(service.approveProduct('offer-fixture', 'actor-fixture')).rejects.toBe(failure);
});
