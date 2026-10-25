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
it('does not select media, body, attachments, quiz or metadata for the anonymous list', async () => {
 query.mockResolvedValue([]); await listPublicPreviews(db,'c');
 const [sql,params]=query.mock.calls[0];expect(params).toEqual(['c']);
 expect(sql.split('FROM')[0]).toBe('SELECT l.id, l.title, l.duration ');
});
