import { ContactInquiryAdminPage } from '@o4o/operator-core-ui/modules/contact-inquiry';
import { lectureContactApi } from '../../api/operatorContact';
import LegacyEducationRequestsPanel from './LegacyEducationRequestsPanel';

export default function OperatorContactPage() {
  return <>
    <ContactInquiryAdminPage serviceKey="lecture" api={lectureContactApi} title="강의 서비스 문의 관리"
      inquiryTypeLabels={{ account_permission: '이용 신청', partnership: '강의 개설 · 협업', technical_issue: '오류 신고', other: '기타' }} />
    <LegacyEducationRequestsPanel />
  </>;
}
