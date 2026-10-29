import { centralApiMenus } from '../central-operation-menu.middleware.js';
jest.mock('../../database/connection.js', () => ({AppDataSource: {}}));
it.each([
 ['/api/v1/operator/members/abc?serviceKey=neture&mode=hard', 'DELETE', 'neture.membership-cleanup'],
 ['/api/v1/operator/members/abc?serviceKey=neture', 'DELETE', 'neture.service-members'],
 ['/api/v1/neture/admin/service-approvals/abc/revoke', 'POST', 'neture.service-approval-management'],
 ['/api/v1/forum/operator/categories/abc/hard', 'DELETE', 'neture.forum-deleted'],
 ['/api/v1/forum/operator/categories/abc/delete-check', 'GET', 'neture.forum-deleted'],
 ['/api/v1/forum/operator/categories/abc/status', 'PATCH', 'neture.forum-delete'],
 ['/api/v1/neture/operator/registrations', 'GET', 'neture.applications'],
 ['/api/v1/neture/operator/contact-messages/abc', 'PATCH', 'neture.legacy-contact'],
])('classifies %s without broadening a neighboring duty', (originalUrl, method, expected) => {
 expect(centralApiMenus('neture', {originalUrl,method})).toEqual([expected]);
});
it('fails closed for an unmapped operator API', () => {
 expect(centralApiMenus('neture', {originalUrl:'/api/v1/neture/operator/unknown',method:'POST'})).toEqual([]);
});
