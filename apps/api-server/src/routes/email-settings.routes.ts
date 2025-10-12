import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/permission.middleware';
import { EmailService } from '../services/email.service';
import logger from '../utils/logger';

const router: Router = Router();
const emailService = new EmailService();

// SMTP 설정 인터페이스
interface SMTPSettings {
  provider: 'smtp';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass?: string; // 비밀번호는 선택적 (업데이트 시)
  fromEmail: string;
  fromName: string;
}

// 현재 이메일 설정 가져오기
router.get('/email', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // 환경변수에서 현재 설정 읽기 (비밀번호 제외)
    const settings: SMTPSettings = {
      provider: 'smtp',
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || '',
      fromEmail: process.env.EMAIL_FROM || '',
      fromName: process.env.EMAIL_FROM_NAME || '',
    };

    // 비밀번호는 설정되어 있는지 여부만 표시
    const hasPassword = !!process.env.SMTP_PASS;

    res.json({
      ...settings,
      hasPassword,
    });
  } catch (error) {
    logger.error('Failed to get email settings:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve email settings',
      error: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
});

// 이메일 설정 업데이트
router.put('/email', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings: SMTPSettings = req.body;

    // 필수 필드 검증
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.fromEmail) {
      return res.status(400).json({ 
        message: 'Missing required fields: smtpHost, smtpPort, smtpUser, fromEmail' 
      });
    }

    // 환경변수 업데이트 (실제 프로덕션에서는 데이터베이스나 설정 파일 사용 권장)
    process.env.SMTP_HOST = settings.smtpHost;
    process.env.SMTP_PORT = settings.smtpPort.toString();
    process.env.SMTP_SECURE = settings.smtpSecure ? 'true' : 'false';
    process.env.SMTP_USER = settings.smtpUser;
    process.env.EMAIL_FROM = settings.fromEmail;
    process.env.EMAIL_FROM_NAME = settings.fromName || '';
    
    // 비밀번호가 제공된 경우에만 업데이트
    if (settings.smtpPass) {
      process.env.SMTP_PASS = settings.smtpPass;
    }

    // EmailService 재초기화
    await emailService.initialize();

    logger.info('Email settings updated successfully');
    
    res.json({ 
      message: 'Email settings updated successfully',
      ...settings,
      smtpPass: undefined, // 비밀번호는 응답에서 제외
    });
  } catch (error) {
    logger.error('Failed to update email settings:', error);
    res.status(500).json({ 
      message: 'Failed to update email settings',
      error: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
});

// 테스트 이메일 발송
router.post('/email/test', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ 
        message: 'Test email address is required' 
      });
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return res.status(400).json({ 
        message: 'Invalid email address format' 
      });
    }

    // 테스트 이메일 발송
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: 'SMTP 설정 테스트',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SMTP 설정 테스트</h2>
          <p style="color: #666;">
            이 이메일은 O4O Platform의 SMTP 설정이 올바르게 구성되었는지 확인하기 위한 테스트 이메일입니다.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <h3 style="color: #333; margin-top: 0;">현재 설정 정보</h3>
            <ul style="color: #666; list-style: none; padding: 0;">
              <li><strong>SMTP 호스트:</strong> ${process.env.SMTP_HOST || 'Not configured'}</li>
              <li><strong>SMTP 포트:</strong> ${process.env.SMTP_PORT || 'Not configured'}</li>
              <li><strong>보안 연결:</strong> ${process.env.SMTP_SECURE === 'true' ? 'SSL/TLS' : 'STARTTLS'}</li>
              <li><strong>발신자:</strong> ${process.env.EMAIL_FROM || 'Not configured'}</li>
              <li><strong>테스트 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
            </ul>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            이 이메일을 정상적으로 수신하셨다면, SMTP 설정이 올바르게 구성된 것입니다.
          </p>
        </div>
      `,
      text: `
        SMTP 설정 테스트
        
        이 이메일은 O4O Platform의 SMTP 설정이 올바르게 구성되었는지 확인하기 위한 테스트 이메일입니다.
        
        현재 설정 정보:
        - SMTP 호스트: ${process.env.SMTP_HOST || 'Not configured'}
        - SMTP 포트: ${process.env.SMTP_PORT || 'Not configured'}
        - 보안 연결: ${process.env.SMTP_SECURE === 'true' ? 'SSL/TLS' : 'STARTTLS'}
        - 발신자: ${process.env.EMAIL_FROM || 'Not configured'}
        - 테스트 시간: ${new Date().toLocaleString('ko-KR')}
        
        이 이메일을 정상적으로 수신하셨다면, SMTP 설정이 올바르게 구성된 것입니다.
      `,
    });

    if (result.success) {
      logger.info(`Test email sent successfully to ${testEmail}`);
      res.json({ 
        success: true,
        message: `테스트 이메일이 ${testEmail}로 발송되었습니다.` 
      });
    } else {
      logger.error(`Failed to send test email to ${testEmail}:`, result.error);
      res.status(500).json({ 
        success: false,
        message: result.error || '테스트 이메일 발송에 실패했습니다.',
      });
    }
  } catch (error: any) {
    logger.error('Test email error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to send test email',
      error: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
});

export default router;