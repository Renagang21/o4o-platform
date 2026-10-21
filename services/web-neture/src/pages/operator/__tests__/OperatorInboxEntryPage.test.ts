import {expect,it} from 'vitest';
import {trustedInboxDestination} from '../OperatorInboxEntryPage';
it('accepts only fixed service origins and internal operator paths',()=>{
 expect(trustedInboxDestination({origin:'https://pharmcoop.neture.co.kr',path:'/synthetic/operator/inbox'})).toBe('https://pharmcoop.neture.co.kr/synthetic/operator/inbox');
 for(const destination of [{origin:'https://evil.example.invalid',path:'/operator/inbox'},{origin:'https://neture.co.kr',path:'//evil.example.invalid/operator/'},{origin:'https://neture.co.kr',path:'/\\evil.example.invalid/operator/'},{origin:'https://neture.co.kr',path:'/login'},null])expect(trustedInboxDestination(destination)).toBeNull();
});
