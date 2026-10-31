import { drugstoreIdentity, drugstoreJson } from '../database/migrations/1793457683032-RenameDrugstoreCooperation.js';

describe('Drugstore identity map', () => {
  it.each([
    ['megapharm','drugstore'], ['business:megapharm','business:drugstore'],
    ['neture:megapharm_admin','neture:drugstore_admin'],
    ['neture:megapharm_operator','neture:drugstore_operator'],
    ['https://megapharm.neture.co.kr/community?store=a','https://drugstore.neture.co.kr/community?store=a'],
    ['/operator/semi-franchises/megapharm/memberships','/operator/semi-franchises/drugstore/memberships'],
    ['메가팜 · 창고형약국','드럭스토어형 약국'], ['MegaPharm · 창고형약국','드럭스토어형 약국'],
  ])('maps the legacy identity %s', (before, after) => expect(drugstoreIdentity(before)).toBe(after));
  it.each(['carepharm','pharmcoop','pharmacy','neture:admin','오메가팜','business:other'])('preserves %s',value=>expect(drugstoreIdentity(value)).toBe(value));
  it('refuses colliding JSON keys rather than overwriting configuration', () => {
    expect(()=>drugstoreJson({megapharm:{enabled:false},drugstore:{enabled:true}})).toThrow('collision');
  });
});
