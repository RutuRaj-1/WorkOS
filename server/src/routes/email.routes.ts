import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { emailService } from '../services/email.service';

const router = Router();

router.post('/send', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, to, payload } = req.body;
    if (!type || !to || !payload) {
      res.status(400).json({ success: false, message: 'Missing type, to, or payload' });
      return;
    }

    switch (type) {
      case 'task_assigned':
        await emailService.sendTaskAssigned({ to, ...payload });
        break;
      case 'task_completed':
        await emailService.sendTaskCompleted({ to, ...payload });
        break;
      case 'deadline_reminder':
        await emailService.sendDeadlineReminder({ to, ...payload });
        break;
      case 'user_invitation':
        await emailService.sendUserInvitation({ to, ...payload });
        break;
      case 'meeting_invite':
        await emailService.sendMeetingInvite({ to, ...payload });
        break;
      case 'competition_deadline':
        await emailService.sendCompetitionDeadline({ to, ...payload });
        break;
      default:
        res.status(400).json({ success: false, message: 'Unsupported email type' });
        return;
    }

    res.json({ success: true, message: `Email ${type} sent to ${to}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Email sending failed' });
  }
});

export default router;
