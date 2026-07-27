import cron from 'node-cron';
import { adminDb } from '../config/firebase';
import { COLLECTIONS } from '../config/collections';
import { emailService } from '../services/email.service';

export function initCronJobs() {
  console.log('[Cron] Initializing scheduled tasks...');

  // Daily check at 08:00 AM for task deadlines
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron Job] Checking upcoming task deadlines...');
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const tasksSnap = await adminDb
        .collection(COLLECTIONS.TASKS)
        .where('status', 'in', ['todo', 'in-progress'])
        .where('dueDate', '<=', tomorrow)
        .where('dueDate', '>=', now)
        .get();

      for (const doc of tasksSnap.docs) {
        const task = doc.data();
        if (task.assigneeId) {
          const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(task.assigneeId).get();
          if (userDoc.exists) {
            const user = userDoc.data();
            if (user?.email) {
              await emailService.sendDeadlineReminder({
                to: user.email,
                taskTitle: task.title,
                dueDate: new Date(task.dueDate.toDate()).toLocaleDateString(),
                taskUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/workspace/${task.workspaceId}/project/${task.projectId}`,
                hoursRemaining: 24,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[Cron Job Error]', error);
    }
  });
}
