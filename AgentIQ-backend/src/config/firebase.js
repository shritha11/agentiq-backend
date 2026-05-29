import admin from "firebase-admin";
import serviceAccount from "../../agentiq.json" with { type: "json" };
admin.initializeApp({credential: admin.credential.cert(serviceAccount)});

export const db = admin.firestore();

export default admin;