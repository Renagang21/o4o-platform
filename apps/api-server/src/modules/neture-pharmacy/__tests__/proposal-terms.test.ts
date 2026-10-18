import { proposalTerms } from '../services/proposal-terms.js';
import { groupCheckoutLines, type CheckoutLine } from '../services/pharmacy-cart.service.js';

describe('proposal term input',()=>{
  const terms={baseShippingFee:2000,freeShippingThreshold:null,minOrderAmount:10000};
  it('freezes explicit values and ignores a supplied version',()=>{
    const saved=proposalTerms({...terms,version:99},{});expect(saved).toEqual({version:1,...terms});
    terms.baseShippingFee=3000;expect(saved.baseShippingFee).toBe(2000);terms.baseShippingFee=2000;
  });
  it.each([null,{},[],{...terms,baseShippingFee:-1},{...terms,minOrderAmount:0.5},{...terms,baseShippingFee:'2000'},
    {...terms,freeShippingThreshold:0},{...terms,freeShippingThreshold:2147483648}])('rejects invalid terms %p',(input)=>{
    expect(()=>proposalTerms(input,{})).toThrow();
  });
  it('keeps absent supplier policy fallback and zero-threshold free-shipping semantics',()=>{
    expect(proposalTerms(undefined,{})).toEqual({version:1,baseShippingFee:0,freeShippingThreshold:null,minOrderAmount:0});
    expect(proposalTerms(undefined,{baseShippingFee:3000,freeShippingThreshold:0})).toEqual({version:1,baseShippingFee:0,freeShippingThreshold:null,minOrderAmount:0});
  });
});

describe('fixed terms order grouping',()=>{
  const line=(business:string,fee=2000,min=10000):CheckoutLine=>({cartItemId:'fixture',quantity:1,option:{supplierId:'supplier',semiFranchiseKey:business,paymentReceiverKey:'receiver',baseShippingFee:fee,freeShippingThreshold:50000,minOrderAmount:min,termsSnapshot:{version:1,baseShippingFee:fee,freeShippingThreshold:50000,minOrderAmount:min}}} as CheckoutLine);
  it('combines equal conditions within the same business',()=>expect(groupCheckoutLines([line('a'),line('a')])).toHaveLength(1));
  it('separates equal conditions across businesses sharing a receiver',()=>expect(groupCheckoutLines([line('a'),line('b')])).toHaveLength(2));
  it('separates different shipping or minimums in the same business',()=>expect(groupCheckoutLines([line('a'),line('a',3000),line('a',2000,20000)])).toHaveLength(3));
  it('does not combine legacy and fixed terms',()=>{
    const old=line('a');old.option.termsSnapshot=null;
    expect(groupCheckoutLines([old,line('a')])).toHaveLength(2);
  });
});
