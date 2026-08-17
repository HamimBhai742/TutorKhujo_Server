import { initializeApp, getApps, cert } from "firebase-admin/app";

/**
 * Firebase Admin Initialization.
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON environment variable (JSON string)
 * instead of a hardcoded local file path — works in any deployment environment.
 *
 * To set: copy the firebase service account JSON content and set as env var.
 * Example: FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 */
if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.warn("[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM push notifications will be disabled.");
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("[Firebase] Admin initialized successfully.");
    } catch (error) {
      console.error("[Firebase] Failed to parse service account JSON:", error);
    }
  }
}
