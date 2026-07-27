import { emailTransporter, EMAIL_FROM } from '../config/email';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Pluggable email service — swap provider here without changing callers
export class EmailService {
  async send(payload: EmailPayload): Promise<void> {
    await emailTransporter.sendMail({
      from: EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  }

  // ── Email Templates ──────────────────────────────────────────────────────

  async sendTaskAssigned(options: {
    to: string;
    taskTitle: string;
    assigneeName: string;
    projectName: string;
    taskUrl: string;
    dueDate?: string;
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: `Task Assigned: ${options.taskTitle}`,
      html: taskAssignedTemplate(options),
    });
  }

  async sendTaskCompleted(options: {
    to: string;
    taskTitle: string;
    completedByName: string;
    projectName: string;
    taskUrl: string;
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: `Task Completed: ${options.taskTitle}`,
      html: taskCompletedTemplate(options),
    });
  }

  async sendDeadlineReminder(options: {
    to: string;
    taskTitle: string;
    dueDate: string;
    taskUrl: string;
    hoursRemaining: number;
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: `⚠️ Deadline Reminder: ${options.taskTitle}`,
      html: deadlineReminderTemplate(options),
    });
  }

  async sendCompetitionDeadline(options: {
    to: string;
    competitionName: string;
    deadline: string;
    projectUrl: string;
    daysRemaining: number;
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: `🏆 Competition Deadline: ${options.competitionName}`,
      html: competitionDeadlineTemplate(options),
    });
  }

  async sendUserInvitation(options: {
    to: string;
    inviterName: string;
    orgName: string;
    inviteUrl: string;
    role: string;
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: `You're invited to join ${options.orgName} on WorkOS`,
      html: invitationTemplate(options),
    });
  }

  async sendMeetingInvite(options: {
    to: string;
    meetingTitle: string;
    date: string;
    time: string;
    meetingUrl: string;
    organizer: string;
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: `Meeting Invite: ${options.meetingTitle}`,
      html: meetingInviteTemplate(options),
    });
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

const baseTemplate = (content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #e2e8f0; }
    .container { max-width: 600px; margin: 40px auto; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center; }
    .header h1 { color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin-top: 4px; font-size: 14px; }
    .body { background: #1e1e3a; padding: 40px; border-radius: 0 0 16px 16px; }
    .card { background: #2d2d5a; border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid rgba(99,102,241,0.2); }
    .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .value { font-size: 16px; color: #e2e8f0; font-weight: 500; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 24px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 12px; }
    .badge { display: inline-block; background: rgba(99,102,241,0.2); color: #818cf8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>WorkOS</h1>
      <p>Your All-in-One Execution Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} WorkOS. All rights reserved.</p>
      <p style="margin-top: 8px;">You received this email because you're a member of a WorkOS organization.</p>
    </div>
  </div>
</body>
</html>
`;

const taskAssignedTemplate = (o: {
  taskTitle: string;
  assigneeName: string;
  projectName: string;
  taskUrl: string;
  dueDate?: string;
}) => baseTemplate(`
  <h2 style="color: #e2e8f0; margin-bottom: 8px;">Task Assigned to You</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;">Hi ${o.assigneeName}, a new task has been assigned to you.</p>
  <div class="card">
    <div class="label">Task</div>
    <div class="value">${o.taskTitle}</div>
    <div class="label" style="margin-top: 16px;">Project</div>
    <div class="value">${o.projectName}</div>
    ${o.dueDate ? `<div class="label" style="margin-top: 16px;">Due Date</div><div class="value">${o.dueDate}</div>` : ''}
  </div>
  <a href="${o.taskUrl}" class="btn">View Task →</a>
`);

const taskCompletedTemplate = (o: {
  taskTitle: string;
  completedByName: string;
  projectName: string;
  taskUrl: string;
}) => baseTemplate(`
  <h2 style="color: #e2e8f0; margin-bottom: 8px;">✅ Task Completed</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;"><strong>${o.completedByName}</strong> has completed a task.</p>
  <div class="card">
    <div class="label">Task</div>
    <div class="value">${o.taskTitle}</div>
    <div class="label" style="margin-top: 16px;">Project</div>
    <div class="value">${o.projectName}</div>
    <div class="label" style="margin-top: 16px;">Completed By</div>
    <div class="value">${o.completedByName}</div>
  </div>
  <a href="${o.taskUrl}" class="btn">View Task →</a>
`);

const deadlineReminderTemplate = (o: {
  taskTitle: string;
  dueDate: string;
  taskUrl: string;
  hoursRemaining: number;
}) => baseTemplate(`
  <h2 style="color: #f59e0b; margin-bottom: 8px;">⚠️ Deadline Approaching</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;">A task deadline is coming up soon.</p>
  <div class="card">
    <div class="label">Task</div>
    <div class="value">${o.taskTitle}</div>
    <div class="label" style="margin-top: 16px;">Due Date</div>
    <div class="value" style="color: #f59e0b;">${o.dueDate}</div>
    <div class="label" style="margin-top: 16px;">Time Remaining</div>
    <div class="value" style="color: #ef4444;">${o.hoursRemaining} hours</div>
  </div>
  <a href="${o.taskUrl}" class="btn">View Task →</a>
`);

const competitionDeadlineTemplate = (o: {
  competitionName: string;
  deadline: string;
  projectUrl: string;
  daysRemaining: number;
}) => baseTemplate(`
  <h2 style="color: #e2e8f0; margin-bottom: 8px;">🏆 Competition Deadline Approaching</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;">Don't miss the deadline!</p>
  <div class="card">
    <div class="label">Competition</div>
    <div class="value">${o.competitionName}</div>
    <div class="label" style="margin-top: 16px;">Deadline</div>
    <div class="value" style="color: #f59e0b;">${o.deadline}</div>
    <div class="label" style="margin-top: 16px;">Days Remaining</div>
    <div class="value" style="color: ${o.daysRemaining <= 2 ? '#ef4444' : '#f59e0b'};">${o.daysRemaining} days</div>
  </div>
  <a href="${o.projectUrl}" class="btn">View Competition →</a>
`);

const invitationTemplate = (o: {
  inviterName: string;
  orgName: string;
  inviteUrl: string;
  role: string;
}) => baseTemplate(`
  <h2 style="color: #e2e8f0; margin-bottom: 8px;">You're Invited to WorkOS! 🎉</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;"><strong>${o.inviterName}</strong> has invited you to join their organization.</p>
  <div class="card">
    <div class="label">Organization</div>
    <div class="value">${o.orgName}</div>
    <div class="label" style="margin-top: 16px;">Your Role</div>
    <div class="value"><span class="badge">${o.role}</span></div>
  </div>
  <a href="${o.inviteUrl}" class="btn">Accept Invitation →</a>
`);

const meetingInviteTemplate = (o: {
  meetingTitle: string;
  date: string;
  time: string;
  meetingUrl: string;
  organizer: string;
}) => baseTemplate(`
  <h2 style="color: #e2e8f0; margin-bottom: 8px;">📅 Meeting Invite</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;"><strong>${o.organizer}</strong> has scheduled a meeting.</p>
  <div class="card">
    <div class="label">Meeting</div>
    <div class="value">${o.meetingTitle}</div>
    <div class="label" style="margin-top: 16px;">Date</div>
    <div class="value">${o.date}</div>
    <div class="label" style="margin-top: 16px;">Time</div>
    <div class="value">${o.time}</div>
    <div class="label" style="margin-top: 16px;">Organized By</div>
    <div class="value">${o.organizer}</div>
  </div>
  <a href="${o.meetingUrl}" class="btn">View Meeting →</a>
`);

export const emailService = new EmailService();
