import { calculateSupplierShippingFee } from '../supplier-shipping.js';

/** Null means no threshold; zero means every nonempty order meets the threshold. */
describe('supplier shipping threshold contract used by proposal review', () => {
  it.each([
    { threshold: null, shippingFee: 3000, freeShippingApplied: false },
    { threshold: 0, shippingFee: 0, freeShippingApplied: true },
    { threshold: 50000, shippingFee: 3000, freeShippingApplied: false },
  ])('keeps threshold $threshold distinct for a positive subtotal', ({ threshold, shippingFee, freeShippingApplied }) => {
    expect(calculateSupplierShippingFee(1000, { baseShippingFee: 3000, freeShippingThreshold: threshold }))
      .toEqual({ shippingFee, freeShippingApplied, policySource: 'supplier_policy' });
  });
});
