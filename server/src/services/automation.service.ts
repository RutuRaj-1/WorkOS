import { adminDb } from '../config/firebase';
import { emailService } from './email.service';

export type TriggerType =
  | 'entity_created'
  | 'field_updated'
  | 'task_completed'
  | 'expense_added'
  | 'competition_scraped';

export type ActionType =
  | 'send_email'
  | 'create_notification'
  | 'generate_tasks'
  | 'update_field'
  | 'recalculate_roi';

export class AutomationService {
  /**
   * Evaluate all active rules that match the given trigger
   */
  async evaluateTrigger(triggerType: TriggerType, workspaceId: string, orgId: string, payload: any, userId: string = 'system') {
    console.log(`[Automation] Evaluating trigger: ${triggerType} for workspace: ${workspaceId}`);
    try {
      const rulesSnapshot = await adminDb.collection('automations')
        .where('orgId', '==', orgId)
        .where('workspaceId', '==', workspaceId)
        .where('enabled', '==', true)
        .where('trigger.type', '==', triggerType)
        .get();

      if (rulesSnapshot.empty) {
        console.log(`[Automation] No matching rules found for trigger: ${triggerType}`);
        return;
      }

      for (const doc of rulesSnapshot.docs) {
        const rule = doc.data();
        console.log(`[Automation] Executing rule: ${rule.name}`);
        await this.executeAction(rule.action.type, payload, rule, userId);
      }
    } catch (error) {
      console.error(`[Automation] Error evaluating trigger ${triggerType}:`, error);
    }
  }

  /**
   * Execute the configured action
   */
  private async executeAction(actionType: ActionType, payload: any, ruleContext: any, userId: string) {
    switch (actionType) {
      case 'send_email':
        console.log('[Automation] Action: send_email', payload);
        break;
      case 'create_notification':
        console.log('[Automation] Action: create_notification', payload);
        if (userId !== 'system') {
          await adminDb.collection('notifications').add({
            userId: userId,
            title: `Automation: ${ruleContext.name}`,
            body: `Triggered by ${ruleContext.trigger.type} event.`,
            type: 'automation',
            read: false,
            createdAt: new Date()
          });
        }
        break;
      case 'generate_tasks':
        console.log('[Automation] Action: generate_tasks', payload);
        if (payload.workspaceId && payload.orgId) {
          const defaultTasks = [
            { title: 'Initial Review', priority: 'medium', status: 'todo' },
            { title: 'Follow up', priority: 'high', status: 'todo' }
          ];
          for (const task of defaultTasks) {
            await adminDb.collection('tasks').add({
              ...task,
              workspaceId: payload.workspaceId,
              orgId: payload.orgId,
              entityId: payload.entityId || null,
              projectId: payload.projectId || null,
              createdBy: userId,
              createdAt: new Date()
            });
          }
        }
        break;
      case 'update_field':
        console.log('[Automation] Action: update_field', payload);
        break;
      case 'recalculate_roi':
        console.log('[Automation] Action: recalculate_roi', payload);
        break;
      default:
        console.log(`[Automation] Unknown action type: ${actionType}`);
    }
  }
}

export const automationService = new AutomationService();
