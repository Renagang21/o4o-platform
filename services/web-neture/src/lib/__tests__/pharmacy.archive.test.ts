import { describe, expect, it } from 'vitest';
import { pharmacyExportFile, pharmacyTransferParts, parsePharmacyFile } from '../pharmacy/archive';
import { PHARMACY_FORMAT, validatePharmacyBundle, type PharmacyBundle } from '../pharmacy/order';

describe('bounded pharmacy workspace export', () => {
  it('roundtrips more than 10,000 records through one file and independently restorable parts', () => {
    const records: PharmacyBundle['records'] = Array.from({length:12001}, (_,i)=>({kind:'product',data:{id:'p'+i,name:'합성 상품 '+i,program:'fixture',program_code:String(i).padStart(6,'0'),kind:'dispensing'}}));
    records.push({kind:'stock',data:{id:'st',product_id:'p0',quantity:null,confidence:'unknown',observed_at:'2026-10-29T00:00:00Z'}});
    const bundle:PharmacyBundle={format:PHARMACY_FORMAT,records};
    const parts=pharmacyTransferParts(bundle);
    expect(parts.length).toBeGreaterThan(1);
    for(const part of parts){expect(part.records.length).toBeLessThanOrEqual(1000);expect(()=>validatePharmacyBundle(part)).not.toThrow();expect(new TextEncoder().encode(JSON.stringify(part)).byteLength).toBeLessThan(850*1024);}
    const restored=parsePharmacyFile(JSON.stringify(pharmacyExportFile(bundle)));
    expect(restored.records).toHaveLength(records.length);expect(new Set(restored.records.map(r=>r.kind+':'+r.data.id)).size).toBe(records.length);
    expect(restored.records.find(r=>r.kind==='product'&&r.data.id==='p0')?.data).toMatchObject({program_code:'000000'});
    const stockPart=parts.find(p=>p.records.some(r=>r.kind==='stock'))!;expect(stockPart.records.some(r=>r.kind==='product'&&r.data.id==='p0')).toBe(true);
  });
  it('retains the legacy single-bundle format and rejects contradictory archive duplicates',()=>{
    const bundle:PharmacyBundle={format:PHARMACY_FORMAT,records:[{kind:'product',data:{id:'p',name:'합성 상품',program:'fixture',program_code:'001',kind:'dispensing'}}]};
    expect(pharmacyExportFile(bundle)).toEqual(bundle);expect(parsePharmacyFile(JSON.stringify(bundle))).toEqual(bundle);
    const other=structuredClone(bundle);(other.records[0].data as {name:string}).name='다른 이름';
    expect(()=>parsePharmacyFile(JSON.stringify({format:'o4o-pharmacy-work-archive-v1',parts:[bundle,other]}))).toThrow('중복 내용');
  });
});
