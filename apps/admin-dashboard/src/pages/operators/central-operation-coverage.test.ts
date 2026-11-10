import {expect,it,vi} from 'vitest';
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:vi.fn(),post:vi.fn(),put:vi.fn(),patch:vi.fn(),delete:vi.fn()}}}));
import {CENTRAL_OPERATION_MENUS} from '@o4o/types';
import {ADMIN_SITE_MENU_KEYS,centralOperationAreas} from './central-operation-navigation';
import {CENTRAL_RENDERED_MENU_KEYS} from './central-operation-renderers';
it('provides native screens for every declared duty and a duty for every linked screen',()=>{
 // 관리자 사이트로 옮긴 업무는 업무 운영 화면에 링크 · 화면을 두지 않는다.
 const catalog=CENTRAL_OPERATION_MENUS.map(menu=>menu.key).filter(key=>!ADMIN_SITE_MENU_KEYS.includes(key)).sort();
 const links=Object.entries(centralOperationAreas).flatMap(([service,areas])=>areas.map(area=>`${service}.${area}`)).sort();
 expect(links).toEqual(catalog);
 expect([...CENTRAL_RENDERED_MENU_KEYS].sort()).toEqual(catalog);
});
