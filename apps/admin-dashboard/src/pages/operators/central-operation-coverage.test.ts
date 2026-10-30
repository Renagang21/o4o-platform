import {expect,it,vi} from 'vitest';
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:vi.fn(),post:vi.fn(),put:vi.fn(),patch:vi.fn(),delete:vi.fn()}}}));
import {CENTRAL_OPERATION_MENUS} from '@o4o/types';
import {centralOperationAreas} from './central-operation-navigation';
import {CENTRAL_RENDERED_MENU_KEYS} from './central-operation-renderers';
it('provides native screens for every declared duty and a duty for every linked screen',()=>{
 const catalog=CENTRAL_OPERATION_MENUS.map(menu=>menu.key).sort();
 const links=Object.entries(centralOperationAreas).flatMap(([service,areas])=>areas.map(area=>`${service}.${area}`)).sort();
 expect(links).toEqual(catalog);
 expect([...CENTRAL_RENDERED_MENU_KEYS].sort()).toEqual(catalog);
});
