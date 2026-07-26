// Export all Firebase services
export * from './firestoreService';
export * from './authService';

// Re-export types for convenience
export type { PreregisterUser, PreregisterUserWithId, SurveyData } from './firestoreService';

// Re-export specific functions for convenience
export { preregisterUser, submitSurvey, updateUserVisitedSite } from './firestoreService';

// Firebase auth is no longer the admin gate (#85). Only `signOut` remains, for
// the legacy Firestore waitlist screens.
export { signOut } from './authService';

// Re-export the service object
export { firestoreService } from './firestoreService';
