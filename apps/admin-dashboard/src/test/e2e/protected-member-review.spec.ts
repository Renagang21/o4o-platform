import {test,expect,type Page} from '@playwright/test';
const id='22222222-2222-4222-8222-222222222222';
const adminId='33333333-3333-4333-8333-333333333333';
const version='2026-11-06T00:00:00.123456';
async function fixture(page:Page, readDocuments?:boolean, menuKeys=['neture.qualifications','lecture.members']) {
 const writes:unknown[]=[];
 let approved=false;
 const user={id:'synthetic-reviewer',email:'operator@example.test',name:'합성 운영자',roles:['neture:operator','lecture:operator'],status:'active',isActive:true,isEmailVerified:true,authMethod:'google'};
 const applicant={userId:id,name:'합성 신청자',email:'member@example.test',accountStatus:'active',licenseNumber:'SYNTHETIC',status:'pending',reason:null,version};
 const full={member:{userId:id,name:'합성 신청자',nickname:'합성 닉네임',email:'member@example.test',phone:'01012345678',accountStatus:'active',emailVerified:true,joinedAt:'2026-11-01',version,hasPassword:false},qualification:{...applicant,approvedAt:null,reviewedBy:null},registration:readDocuments===undefined?null:{type:'pharmacy_owner',state:'pending',fields:{licenseNumber:'SYNTHETIC',businessRegistrationDocumentId:'synthetic-document'}},legacyLicense:null,pharmacies:[],history:[],permissions:{edit:false,qualifications:true,pharmacies:false,readDocuments:readDocuments===true}};
 await page.route(url=>url.pathname.startsWith('/api/'),async route=>{
  const path=new URL(route.request().url()).pathname;
  const json=(data:unknown)=>route.fulfill({json:{success:true,data}});
  if(path==='/api/v1/auth/status')return json({authenticated:true,user});
  if(path==='/api/v1/auth/me')return json(user);
  if(path==='/api/v1/auth/google/config')return json({enabled:false,clientId:null});
  if(path==='/api/v1/operator/central-access')return json({roles:user.roles,menuKeys});
  if(path===`/api/v1/member-registration/members/${id}/approve`||path===`/api/v1/member-registration/members/${id}/reject`){writes.push({path,body:route.request().postDataJSON()});approved=true;return json({status:'done'});}
  if(path===`/api/v1/qualifications/pharmacist/review/${id}`){
   if(route.request().method()==='POST'){writes.push(route.request().postDataJSON());approved=true;return json({status:'approved'});}
   return json(full);
  }
  if(path==='/api/v1/qualifications/pharmacist/review')return json({items:[...(approved?[]:[applicant]),{...applicant,userId:adminId,name:'합성 전체 관리자',operatorReadOnly:true}],hasNext:false});
  if(path==='/api/v1/operator/members')return route.fulfill({json:{success:true,users:[{id:adminId,name:'합성 전체 관리자',email:'admin@example.test',status:'pending',createdAt:'2026-11-01',operatorReadOnly:true}],pagination:{page:1,total:1,totalPages:1,limit:20}}});
  if(path==='/api/v1/operator/members/stats')return route.fulfill({json:{success:true,statistics:{total:1,byStatus:[{status:'pending',count:1}]}}});
  return route.fulfill({status:403,json:{success:false,code:'SYNTHETIC_UNEXPECTED_API'}});
 });
 return writes;
}
for(const width of [1440,390]) test.describe(`protected review ${width}`,()=>{
 test.use({viewport:{width,height:900}});
 test('reviews full information in a drawer and refreshes after one decision',async({page})=>{
  const writes=await fixture(page);
  await page.goto('/operations/neture/qualifications');
  await expect(page.getByText('전체 관리자 — 처리 대상 아님')).toBeVisible();
  await page.getByRole('row').filter({hasText:'합성 신청자'}).getByRole('checkbox').check();
  await expect(page.getByRole('button',{name:'선택 회원 반려 검토'})).toHaveCount(0);
  await page.getByRole('button',{name:'가입승인',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('이메일',{exact:true})).toBeVisible();
  await expect(page.getByLabel('휴대전화',{exact:true})).toBeVisible();
  const approve=page.getByRole('dialog').getByRole('button',{name:'승인',exact:true});
  await expect(approve).toBeDisabled();
  await page.getByLabel('신청자에게 안내할 확인·반려 사유').fill('합성 근거 검토');
  await page.getByLabel('신청자 본인의 면허 근거를 별도로 확인했습니다.').check();
  await approve.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('자격 검토 결과를 저장했습니다. 공통 계정 상태는 변경하지 않았습니다.')).toBeVisible();
  expect(writes).toHaveLength(1);
  await expect(page.getByText('합성 신청자',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test('qualification-only reviewer keeps the review open with document access disabled',async({page})=>{
  const writes=await fixture(page,false);
  await page.goto('/operations/neture/qualifications');
  await page.getByRole('row').filter({hasText:'합성 신청자'}).getByRole('checkbox').check();
  await page.getByRole('button',{name:'가입승인',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'사업자등록증 보기'})).toBeDisabled();
  await expect(page.getByText('사업자 서류 조회 권한이 없어 첨부 여부만 표시합니다.')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button',{name:'승인',exact:true})).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button',{name:'정보 수정'})).toHaveCount(0);
  expect(writes).toEqual([]);
 });
 test('member operator approves the signup itself from the single 가입승인 action',async({page})=>{
  const writes=await fixture(page,true,['neture.qualifications','neture.members']);
  await page.goto('/operations/neture/qualifications');
  await page.getByRole('row').filter({hasText:'합성 신청자'}).getByRole('button',{name:'가입승인',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'정보 수정'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'반려',exact:true})).toBeVisible();
  await dialog.getByLabel('신청자에게 안내할 확인·반려 사유').fill('합성 제출 정보 확인');
  await dialog.getByLabel('신청자 본인의 면허 근거를 별도로 확인했습니다.').check();
  await dialog.getByRole('button',{name:'승인',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('가입 승인을 저장했습니다.')).toBeVisible();
  expect(writes).toEqual([{path:`/api/v1/member-registration/members/${id}/approve`,body:{version,reason:'합성 제출 정보 확인'}}]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test('service Admin targets remain readable with no approval or changes',async({page})=>{
  const writes=await fixture(page);
  await page.goto('/operations/lecture/members');
  await expect(page.getByText('전체 관리자 — 처리 대상 아님')).toBeVisible();
  await page.getByRole('row').filter({hasText:'합성 전체 관리자'}).getByRole('checkbox').check();
  await expect(page.getByRole('button',{name:/^승인/})).toHaveCount(0);
  await page.getByText('합성 전체 관리자',{exact:true}).click();
  await expect(page.getByRole('link',{name:'전체 상세 페이지 →'})).toBeVisible();
  await expect(page.getByRole('button',{name:'승인',exact:true})).toHaveCount(0);
  expect(writes).toEqual([]);
 });
});
