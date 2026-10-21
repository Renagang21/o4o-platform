jest.mock('@o4o/lms-core',()=>({Course:class{},CourseStatus:{DRAFT:'draft',REJECTED:'rejected',PENDING_REVIEW:'pending_review',PUBLISHED:'published'},ContentKind:{},CourseVisibility:{},CourseReusablePolicy:{}}));
const courseRepository={save:jest.fn()};
jest.mock('../database/connection.js',()=>({AppDataSource:{getRepository:()=>courseRepository}}));
jest.mock('../modules/contact-inquiry/contact-recipients.js',()=>({serviceContactRecipients:jest.fn()}));
jest.mock('../services/NotificationService.js',()=>({notificationService:{createNotification:jest.fn()}}));
jest.mock('../common/event-log.service.js',()=>({logEvent:jest.fn().mockResolvedValue(undefined)}));
import {CourseService} from '../modules/lms/services/CourseService';
import {serviceContactRecipients} from '../modules/contact-inquiry/contact-recipients';
import {notificationService} from '../services/NotificationService';
const actor={id:'synthetic-operator',role:'lecture:operator'};
let course:any;
beforeEach(()=>{
 jest.clearAllMocks();course={id:'synthetic-course',title:'합성 강의',instructorId:'synthetic-instructor',serviceKey:'lecture',status:'draft',submitForReview(){this.status='pending_review';},publish(){this.status='published';}};
 jest.spyOn(CourseService.getInstance(),'getCourse').mockImplementation(async()=>course);
 courseRepository.save.mockImplementation(async value=>value);
 (serviceContactRecipients as jest.Mock).mockResolvedValue([{userId:'synthetic-operator'}]);
 (notificationService.createNotification as jest.Mock).mockResolvedValue({});
});
it('notifies current lecture operators with a usable review target and sends instructor receipt separately',async()=>{
 await expect(CourseService.getInstance().submitForReview(course.id,actor)).resolves.toMatchObject({status:'pending_review'});
 expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({userId:'synthetic-operator',serviceKey:'lecture',metadata:expect.objectContaining({targetUrl:'/service-entry/lecture?returnPath=%2Foperator%2Fcourses%2Fsynthetic-course%2Freview'})}));
 expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({userId:'synthetic-instructor',serviceKey:'lecture',metadata:expect.objectContaining({targetUrl:'/service-entry/lecture?returnPath=%2Finstructor%2Fcourses%2Fsynthetic-course%2Fedit'})}));
});
it('does not turn successful submit into a retryable error after every notification fails',async()=>{
 (notificationService.createNotification as jest.Mock).mockRejectedValue(Error('synthetic transport failure'));
 await expect(CourseService.getInstance().submitForReview(course.id,actor)).resolves.toMatchObject({status:'pending_review'});expect(courseRepository.save).toHaveBeenCalledTimes(1);
});
it('preserves successful approval even when the instructor notification fails',async()=>{
 course.status='pending_review';(notificationService.createNotification as jest.Mock).mockRejectedValue(Error('synthetic transport failure'));
 await expect(CourseService.getInstance().approveCourse(course.id,actor)).resolves.toMatchObject({status:'published'});expect(courseRepository.save).toHaveBeenCalledTimes(1);
});
