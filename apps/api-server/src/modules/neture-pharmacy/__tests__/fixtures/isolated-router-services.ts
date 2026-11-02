/** Shared isolation for unrelated router providers; each HTTP test keeps its own real route and identity/store fixtures. */
jest.mock('../../../../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../../../../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../../services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });
jest.mock('../../services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));
