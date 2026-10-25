/** Real application controller; isolated repository/policy ports, no external DB or account login. */
const mockFind = jest.fn(), mockSave = jest.fn(), mockCreate = jest.fn(), mockPolicies = jest.fn(), mockReceipt = jest.fn();
const mockTransaction = jest.fn();
jest.mock('@o4o/lms-core',()=>({InstructorApplication:class {},Enrollment:class {},EnrollmentStatus:{},Course:class {},ContentKind:{}}),{virtual:true});
jest.mock('../database/connection.js',()=>({AppDataSource:{transaction: (...args:any[])=>mockTransaction(...args)}}));
jest.mock('../modules/policy-acceptance/service-enrollment-policy.service.js',()=>({recordEnrollmentPolicies:(...args:any[])=>mockPolicies(...args),recordEnrollmentApplication:(...args:any[])=>mockReceipt(...args)}));
jest.mock('../modules/auth/services/role-assignment.service.js',()=>({roleAssignmentService:{}}));
jest.mock('../modules/lms/services/AssignmentService.js',()=>({AssignmentService:{}}));
jest.mock('../modules/lms/services/LessonService.js',()=>({LessonService:{}}));
jest.mock('../modules/lms/services/CourseService.js',()=>({CourseService:{}}));
jest.mock('../services/auth/demo-account.service.js',()=>({demoAccountService:{},respondDemoAccountForbidden:jest.fn()}));
jest.mock('../utils/logger.js',()=>({__esModule:true,default:{info:jest.fn(),error:jest.fn()}}));
import { InstructorController } from '../modules/lms/controllers/InstructorController';
const repo={findOne:mockFind,create:mockCreate,save:mockSave};
const manager={getRepository:()=>repo};
function response(){return {statusCode:200,body:null,status(n:number){this.statusCode=n;return this},json(body:any){this.body=body;return this}} as any;}
beforeEach(()=>{jest.clearAllMocks();mockFind.mockResolvedValue(null);mockCreate.mockImplementation((data:any)=>data);mockSave.mockImplementation(async(data:any)=>({id:'application',...data}));mockPolicies.mockResolvedValue([]);mockReceipt.mockResolvedValue(undefined);mockTransaction.mockImplementation(async(fn:any)=>fn(manager));});
it('stores only optional applicant fields with the authenticated applicant and pending status',async()=>{
 const res=response();await InstructorController.apply({user:{id:'applicant'},body:{bio:' 소개 ',expertise:' 실무 ',userId:'other',status:'approved',reviewedBy:'other',policyReferences:[]}} as any,res);
 expect(res.statusCode).toBe(201);expect(mockCreate).toHaveBeenCalledWith({userId:'applicant',status:'pending',bio:'소개',expertise:'실무'});expect(mockReceipt).toHaveBeenCalledTimes(1);
});
it('keeps legacy callers valid when profile fields are omitted',async()=>{
 const res=response();await InstructorController.apply({user:{id:'applicant'},body:{policyReferences:[]}} as any,res);
 expect(res.statusCode).toBe(201);expect(mockCreate).toHaveBeenCalledWith({userId:'applicant',status:'pending',bio:null,expertise:null});
});
it('rejects invalid text before starting any transaction or recording policies',async()=>{
 const res=response();await InstructorController.apply({user:{id:'applicant'},body:{bio:'x'.repeat(3001)}} as any,res);
 expect(res.statusCode).toBe(400);expect(res.body.code).toBe('INVALID_INSTRUCTOR_PROFILE');expect(mockTransaction).not.toHaveBeenCalled();expect(mockPolicies).not.toHaveBeenCalled();
});
it('retains duplicate-application rejection and performs no new save',async()=>{
 mockFind.mockResolvedValueOnce({status:'pending'});const res=response();await InstructorController.apply({user:{id:'applicant'},body:{bio:'소개'}} as any,res);
 expect(res.statusCode).toBe(400);expect(mockSave).not.toHaveBeenCalled();expect(mockReceipt).not.toHaveBeenCalled();
});
it('requires authentication independently of optional profile parsing',async()=>{
 const res=response();await InstructorController.apply({body:{bio:'소개'}} as any,res);expect(res.statusCode).toBe(401);expect(mockTransaction).not.toHaveBeenCalled();
});
