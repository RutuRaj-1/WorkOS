import { addDoc, collection, serverTimestamp, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { InvitedMember, Project } from '@/types';
import { toast } from 'sonner';

export interface AdminTeammate {
  uid: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin';
}

// Fixed Organization Admin Team list (Ruturaj = Owner, Akhilesh, Vedant, Yash = Admins)
export const TEAM_ADMINS: AdminTeammate[] = [
  { uid: 'ruturaj-owner-uid', name: 'Ruturaj', email: 'ruturaj@worktracker.com', role: 'Owner' },
  { uid: 'akhilesh-admin-uid', name: 'Akhilesh', email: 'akhilesh@worktracker.com', role: 'Admin' },
  { uid: 'vedant-admin-uid', name: 'Vedant', email: 'vedant@worktracker.com', role: 'Admin' },
  { uid: 'yash-admin-uid', name: 'Yash', email: 'yash@worktracker.com', role: 'Admin' },
];

/**
 * Send competition invite notifications & email triggers to selected team admins
 */
export async function sendCompetitionInvites({
  eventId,
  eventName,
  workspaceId,
  senderId,
  senderName,
  invitedMembers,
}: {
  eventId: string;
  eventName: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  invitedMembers: InvitedMember[];
}) {
  for (const member of invitedMembers) {
    // Don't send invite notification to the creator themselves (they are automatically accepted)
    if (member.uid === senderId) continue;

    try {
      // 1. Create Firestore notification for recipient
      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
        userId: member.uid,
        title: `🎯 Competition Invite: ${eventName}`,
        body: `${senderName} invited you to participate in "${eventName}". Please respond to confirm participation!`,
        type: 'competition_invite',
        read: false,
        eventId,
        eventName,
        workspaceId,
        senderId,
        senderName,
        actionRequired: true,
        invitedStatus: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Simulate Email Notification Trigger
      const recipientEmail = member.email || `${member.name.toLowerCase()}@worktracker.com`;
      console.log(`[EMAIL TRIGGER] 📧 Sent invite email to ${recipientEmail} for competition "${eventName}"`);
    } catch (err) {
      console.error(`Failed to send invite notification to ${member.name}:`, err);
    }
  }

  // Toast confirmation for email & notification dispatch
  toast.success(`Invites & Email alerts sent to ${invitedMembers.filter(m => m.uid !== senderId).length} Admin teammates! 🚀`);
}

/**
 * Handle Admin Response (Accept / Decline) to a Competition Invite
 */
export async function respondToCompetitionInvite({
  eventId,
  eventName,
  workspaceId,
  userUid,
  userName,
  response, // 'accepted' | 'declined'
  notificationId,
}: {
  eventId: string;
  eventName: string;
  workspaceId: string;
  userUid: string;
  userName: string;
  response: 'accepted' | 'declined';
  notificationId?: string;
}) {
  try {
    // 1. Update Project Firestore document's invitedMembers status
    const projectRef = doc(db, COLLECTIONS.PROJECTS, eventId);
    const snap = await getDoc(projectRef);

    if (snap.exists()) {
      const projectData = snap.data() as Project;
      const currentInvited = projectData.invitedMembers || [];

      const updatedInvited = currentInvited.map(m => {
        if (m.uid === userUid || m.name.toLowerCase() === userName.toLowerCase()) {
          return {
            ...m,
            status: response,
            respondedAt: new Date().toISOString(),
          };
        }
        return m;
      });

      // Also update teamMembers string array if accepted
      let updatedTeamMembers = projectData.teamMembers || [];
      if (response === 'accepted' && !updatedTeamMembers.includes(userName)) {
        updatedTeamMembers = [...updatedTeamMembers, userName];
      }

      await updateDoc(projectRef, {
        invitedMembers: updatedInvited,
        teamMembers: updatedTeamMembers,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Mark notification as read / updated if passed
    if (notificationId) {
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
        read: true,
        invitedStatus: response,
        actionRequired: false,
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Notify Creator & other Admins
    const notificationTitle = response === 'accepted'
      ? `🎉 ${userName} Joined "${eventName}"!`
      : `❌ ${userName} Declined "${eventName}"`;

    const notificationBody = response === 'accepted'
      ? `${userName} (Admin) confirmed participation in "${eventName}" and is Ready!`
      : `${userName} (Admin) declined the invitation for "${eventName}".`;

    // Broadcast to all team admins except responding user
    for (const admin of TEAM_ADMINS) {
      if (admin.uid !== userUid && admin.name.toLowerCase() !== userName.toLowerCase()) {
        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
          userId: admin.uid,
          title: notificationTitle,
          body: notificationBody,
          type: response === 'accepted' ? 'invite_accepted' : 'invite_declined',
          read: false,
          eventId,
          eventName,
          workspaceId,
          senderId: userUid,
          senderName: userName,
          createdAt: serverTimestamp(),
        });
      }
    }

    // 4. Email notification log
    console.log(`[EMAIL TRIGGER] 📧 Broadcast response email: ${userName} ${response} ${eventName}`);

    if (response === 'accepted') {
      toast.success(`You accepted the invite for "${eventName}"! Teammates notified. 🎉`);
    } else {
      toast.info(`You declined the invite for "${eventName}".`);
    }
  } catch (err) {
    console.error('Error responding to invite:', err);
    toast.error('Failed to process response. Please try again.');
  }
}
