import { initializeApp, getApps, cert } from "firebase-admin/app";
import fs from "fs";
import path from "path";

/**
 * Firebase Admin Initialization.
 * Checks FIREBASE_SERVICE_ACCOUNT_JSON env var first, then falls back to local service account file.
 */
if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let serviceAccount: any = null;

  if (serviceAccountJson) {
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (error) {
      console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", error);
    }
  }

  if (!serviceAccount) {
    try {
      const localPath = path.resolve(__dirname, "../../config/firebase-serviceaccount.json");
      if (fs.existsSync(localPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      }
    } catch (err) {
      console.warn("[Firebase] Could not load local firebase-serviceaccount.json:", err);
    }
  }

  if (serviceAccount) {
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("[Firebase] Admin initialized successfully.");
    } catch (error) {
      console.error("[Firebase] Failed to initialize Firebase Admin:", error);
    }
  } else {
    console.warn("[Firebase] No service account configuration found — FCM push notifications disabled.");
  }
}
