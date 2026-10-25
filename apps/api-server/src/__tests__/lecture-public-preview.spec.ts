import { getPublicPreview, listPublicPreviews } from '../modules/lms/services/public-preview.service';
const query = jest.fn();
const db = { query } as any;
beforeEach(() => query.mockReset());
it('uses bound course and lesson IDs and all public eligibility predicates in one read', async () => {
 query.mockResolvedValue([{ id:'l', title:'sample', duration:1, videoUrl:'https://example.invalid/a.mp4', content:'secret', attachments:[1], metadata:{private:true} }]);
 expect(await getPublicPreview(db,'c','l')).toEqual({ id:'l', title:'sample', duration:1, videoUrl:'https://example.invalid/a.mp4' });
 const [sql, params] = query.mock.calls[0];
 expect(params).toEqual(['c','l']);
 for (const check of ["c.service_key='lecture'", "c.status='published'", "c.visibility='public'", 'l."isPublished"=true', 'l."isFree"=true', "l.type='video'", 'l.id=$2']) expect(sql).toContain(check);
});
it.each(['javascript:alert(1)','http://example.invalid/a.mp4','https://u:p@example.invalid/a.mp4','https://example.invalid/a.html',null])('rejects unsafe/non-video preview URL %s', async videoUrl => {
 query.mockResolvedValue([{videoUrl}]); expect(await getPublicPreview(db,'c','l')).toBeNull();
});
it('does not return a missing or disabled preview', async () => {
 query.mockResolvedValue([]); expect(await getPublicPreview(db,'c','l')).toBeNull();
});
it('filters unsafe media consistently while projecting no media, body or metadata in the list', async () => {
 query.mockResolvedValue([
  {id:'good',title:'Sample',duration:1,videoUrl:'https://example.invalid/a.mp4',content:'secret',metadata:{private:true}},
  {id:'missing',videoUrl:null}, {id:'page',videoUrl:'https://example.invalid/page'},
  {id:'credentials',videoUrl:'https://u:p@example.invalid/a.mp4'},
 ]);
 expect(await listPublicPreviews(db,'c')).toEqual([{id:'good',title:'Sample',duration:1}]);
 expect(query.mock.calls[0][1]).toEqual(['c']);
});
