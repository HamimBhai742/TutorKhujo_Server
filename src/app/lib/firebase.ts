import { initializeApp, cert } from "firebase-admin/app";
import * as path from "path";

const serviceAccountPath = path.join(__dirname, "../../config/firebase-serviceaccount.json");

try {
  initializeApp({
    credential: cert(serviceAccountPath),
  });
  console.log("Firebase Admin initialized successfully.");
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}
