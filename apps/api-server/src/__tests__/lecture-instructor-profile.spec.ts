import { InvalidInstructorProfile, normalizeInstructorProfile } from '../modules/lms/services/instructor-profile';
it('keeps omitted legacy fields nullable and trims supplied text', () => {
 expect(normalizeInstructorProfile(undefined)).toEqual({bio:null,expertise:null});
 expect(normalizeInstructorProfile({bio:'  소개\n ',expertise:' 실무 ',status:'approved',reviewedBy:'other'})).toEqual({bio:'소개',expertise:'실무'});
 expect(normalizeInstructorProfile({bio:'  ',expertise:null})).toEqual({bio:null,expertise:null});
});
it.each([{bio:7},{expertise:[]},{bio:'a'.repeat(3001)},{expertise:'a'.repeat(1001)},{bio:'x\0y'},[],'bad'])('rejects invalid profile %j', value => {
 expect(()=>normalizeInstructorProfile(value)).toThrow(InvalidInstructorProfile);
});
it('accepts documented text boundaries without expanding the write allowlist',()=>{
 const normalized=normalizeInstructorProfile({bio:'가'.repeat(3000),expertise:'x'.repeat(1000),userId:'other',rejectionReason:'injected'});
 expect(normalized.bio).toHaveLength(3000);expect(normalized.expertise).toHaveLength(1000);expect(Object.keys(normalized).sort()).toEqual(['bio','expertise']);
});
