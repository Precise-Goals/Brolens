import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function getFirebaseAdminAuth() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  const adminApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

  return getAuth(adminApp);
}

export async function verifyFirebaseBearerToken(authorization) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  return adminAuth.verifyIdToken(authorization.slice("Bearer ".length));
}
