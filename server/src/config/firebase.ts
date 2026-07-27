import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || 'workos-c497e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Check if valid credentials provided
  const hasValidCreds =
    clientEmail &&
    clientEmail.includes('@') &&
    privateKey &&
    privateKey.includes('-----BEGIN PRIVATE KEY-----') &&
    !privateKey.includes('YOUR_PRIVATE_KEY_HERE');

  if (hasValidCreds) {
    try {
      console.log('[Firebase Admin] Initializing with Service Account Cert...');
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (err: any) {
      console.warn('[Firebase Admin Warning] Cert parsing failed:', err.message);
    }
  }

  // Graceful Fallback: Initialize with Project ID only (for local dev / unauthenticated server mode)
  console.log(`[Firebase Admin] Initializing in Default Project mode (${projectId})...`);
  return admin.initializeApp({
    projectId,
  });
}

const firebaseApp = initFirebaseAdmin();

export const adminDb = admin.firestore(firebaseApp);
export const adminAuth = admin.auth(firebaseApp);
export const adminStorage = admin.storage(firebaseApp);

export default admin;
