import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

/**
 * Firebase auth is NO LONGER used for the platform-admin gate (#85).
 *
 * Admin authentication moved to the Pool API's Email-OTP + httpOnly-cookie flow
 * behind the Next server proxy (see app/admin/api/auth/* and middleware.ts). The
 * former Firebase admin gate (`signIn` against the `admins` collection,
 * `getCurrentAdmin`, `onAuthChange`, the `AdminUser` type) has been removed.
 *
 * Only `signOut` remains, purely so the legacy Firestore-backed waitlist screens
 * (app/admin/dashboard, app/admin/stats) keep compiling unchanged; it is a
 * harmless no-op when there is no Firebase session.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
