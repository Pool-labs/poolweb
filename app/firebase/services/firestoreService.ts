import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "../firebaseConfig";

const db = getFirestore(app);

// Types
export interface SurveyData {
  hangoutFrequency?: string;
  avgSpend?: string;
  splitWith?: string;
  splitWithOther?: string;
  splitTypes?: string[];
  splitTypesOther?: string;
  poolWithAcquaintance?: string;
  poolWithStranger?: string;
  dailyRoutinePooling?: string;
  discoveryInterest?: string;
  openPoolTypes?: string[];
  openPoolTypesOther?: string;
  trustRequirements?: string;
  valuableFeatures?: string[];
  concerns?: string;
}

export interface PreregisterUser {
  firstName: string;
  lastName: string;
  email: string;
  hasPreregistered?: boolean;
  hasCompletedSurvey?: boolean;
  surveyData?: SurveyData;
  hasVisitedSite?: boolean;
  location?: string;
  submittedAt?: string;
}

export interface PreregisterUserWithId extends PreregisterUser {
  id: string;
}

/**
 * Add a new preregister user to the Firestore collection
 * @param userData - Object containing firstName, lastName, and email
 * @returns Promise with the document ID
 * @throws Error if user already preregistered
 */
export async function addPreregisterUser(userData: PreregisterUser): Promise<string> {
  try {
    // Check if user already exists
    const existingUser = await getPreregisterUserByEmail(userData.email);
    
    if (existingUser) {
      // If they already preregistered, throw error
      if (existingUser.hasPreregistered) {
        throw new Error("USER_ALREADY_EXISTS");
      }
      
      // If they exist but haven't preregistered (came from survey), update their profile
      await updateDoc(doc(db, "preregistered_users", existingUser.id), {
        firstName: userData.firstName,
        lastName: userData.lastName,
        hasPreregistered: true,
        location: userData.location || existingUser.location,
        submittedAt: userData.submittedAt || existingUser.submittedAt || new Date().toISOString(),
        // Keep their existing survey data and completion status
      });
      
      return existingUser.id;
    }
    
    // Create new user
    const docRef = await addDoc(collection(db, "preregistered_users"), {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      hasPreregistered: userData.hasPreregistered ?? true,
      hasCompletedSurvey: userData.hasCompletedSurvey ?? false,
      surveyData: userData.surveyData ?? {},
      location: userData.location || "Unknown",
      submittedAt: userData.submittedAt || new Date().toISOString(),
    });

    return docRef.id;
  } catch (error: any) {
    if (error.message === "USER_ALREADY_EXISTS") {
      throw error;
    }
    throw new Error("Failed to add preregister user");
  }
}

/**
 * Get all preregister users from the Firestore collection
 * @returns Promise with array of preregister users
 */
export async function getPreregisterUsers(): Promise<PreregisterUserWithId[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "preregistered_users"));
    const users: PreregisterUserWithId[] = [];

    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      } as PreregisterUserWithId);
    });

    return users;
  } catch (error) {
    throw new Error("Failed to retrieve preregister users");
  }
}

/**
 * Update a preregister user by document ID
 * @param docId - The document ID to update
 * @param userData - Object containing updated firstName, lastName, and/or email
 * @returns Promise that resolves when update is complete
 */
export async function updatePreregisterUser(
  docId: string,
  userData: Partial<PreregisterUser>
): Promise<void> {
  try {
    const userRef = doc(db, "preregistered_users", docId);
    await updateDoc(userRef, userData);

  } catch (error) {
    throw new Error("Failed to update preregister user");
  }
}

/**
 * Delete a preregister user by document ID
 * @param docId - The document ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deletePreregisterUser(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "preregistered_users", docId));

  } catch (error) {
    throw new Error("Failed to delete preregister user");
  }
}

/**
 * Get a specific preregister user by document ID
 * @param docId - The document ID to retrieve
 * @returns Promise with the user data or null if not found
 */
export async function getPreregisterUserById(docId: string): Promise<PreregisterUserWithId | null> {
  try {
    const userDoc = await getDoc(doc(db, "preregistered_users", docId));

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as PreregisterUserWithId;
    } else {
      return null;
    }
  } catch (error) {
    throw new Error("Failed to retrieve preregister user");
  }
}

/**
 * Get a preregister user by email
 * @param email - The email to search for
 * @returns Promise with the user data or null if not found
 */
export async function getPreregisterUserByEmail(email: string): Promise<PreregisterUserWithId | null> {
  try {
    const querySnapshot = await getDocs(collection(db, "preregistered_users"));
    
    for (const doc of querySnapshot.docs) {
      const userData = doc.data();
      if (userData.email === email) {
        return {
          id: doc.id,
          ...userData,
        } as PreregisterUserWithId;
      }
    }
    
    return null;
  } catch (error) {
    throw new Error("Failed to retrieve preregister user by email");
  }
}

/**
 * Submit survey data for a user
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @param email - User's email
 * @param surveyData - The survey responses
 * @param location - User's location
 * @returns Promise with the document ID
 * @throws Error if survey already completed
 */
export async function submitSurvey(
  firstName: string,
  lastName: string,
  email: string,
  surveyData: SurveyData,
  location?: string,
  hasVisitedSite?: boolean
): Promise<{ id: string; isUpdate?: boolean }> {
  try {
    // Check if user already exists
    const existingUser = await getPreregisterUserByEmail(email);
    
    if (existingUser) {
      // Check if all questions are answered in the new survey data
      const allQuestionsAnswered = checkIfAllQuestionsAnswered(surveyData);
      
      // If they already completed survey with all questions, throw error
      if (existingUser.hasCompletedSurvey && existingUser.surveyData && 
          checkIfAllQuestionsAnswered(existingUser.surveyData as SurveyData)) {
        throw new Error("SURVEY_ALREADY_COMPLETED");
      }
      
      // Update existing user - merge survey data
      const updatedSurveyData = {
        ...(existingUser.surveyData || {}),
        ...surveyData
      };
      
      const updateData: any = {
        surveyData: updatedSurveyData,
        hasCompletedSurvey: allQuestionsAnswered,
        // Update name fields in case they've changed
        firstName: firstName,
        lastName: lastName,
        location: location || existingUser.location || "Unknown",
        submittedAt: new Date().toISOString()
      };
      
      // Only update hasVisitedSite if it's not already set
      if (hasVisitedSite !== undefined && existingUser.hasVisitedSite === undefined) {
        updateData.hasVisitedSite = hasVisitedSite;
      }
      
      await updateDoc(doc(db, "preregistered_users", existingUser.id), updateData);
      
      return { id: existingUser.id, isUpdate: true };
    } else {
      // Check if all questions are answered
      const allQuestionsAnswered = checkIfAllQuestionsAnswered(surveyData);
      
      // Create new user with survey data
      const newUser: PreregisterUser = {
        firstName,
        lastName,
        email,
        hasPreregistered: false, // They didn't preregister, came directly to survey
        hasCompletedSurvey: allQuestionsAnswered,
        surveyData: surveyData,
        location: location || "Unknown",
        submittedAt: new Date().toISOString()
      };
      
      // Only set hasVisitedSite if it's explicitly provided
      if (hasVisitedSite !== undefined) {
        newUser.hasVisitedSite = hasVisitedSite;
      }
      
      // Use addDoc directly to avoid the email check in addPreregisterUser
      const docRef = await addDoc(collection(db, "preregistered_users"), newUser);
      return { id: docRef.id, isUpdate: false };
    }
  } catch (error: any) {
    if (error.message === "SURVEY_ALREADY_COMPLETED") {
      throw error;
    }
    throw new Error("Failed to submit survey");
  }
}

/**
 * Update user's hasVisitedSite status
 * @param email - The user's email
 * @param visited - Whether the user has visited the site
 * @returns Promise with success status
 */
export async function updateUserVisitedSite(email: string, visited: boolean): Promise<boolean> {
  try {
    const existingUser = await getPreregisterUserByEmail(email);
    
    if (existingUser) {
      await updateDoc(doc(db, "preregistered_users", existingUser.id), {
        hasVisitedSite: visited
      });
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error("Error updating hasVisitedSite:", error);
    throw new Error("Failed to update site visit status");
  }
}

/**
 * Helper function to check if all survey questions are answered
 */
function checkIfAllQuestionsAnswered(surveyData: SurveyData): boolean {
  const requiredFields = [
    'hangoutFrequency',
    'avgSpend',
    'splitWith',
    'splitTypes',
    'poolWithAcquaintance',
    'poolWithStranger',
    'dailyRoutinePooling',
    'discoveryInterest',
    'openPoolTypes',
    'trustRequirements',
    'valuableFeatures',
    'concerns'
  ];

  for (const field of requiredFields) {
    const value = surveyData[field as keyof SurveyData];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      // Check for "Other" fields that might need to be filled
      if (field === 'splitWith' && value === 'Other' && !surveyData.splitWithOther) {
        return false;
      }
      if (field === 'splitTypes' && Array.isArray(value) && value.includes('Other') && !surveyData.splitTypesOther) {
        return false;
      }
      if (field === 'openPoolTypes' && Array.isArray(value) && value.includes('Other') && !surveyData.openPoolTypesOther) {
        return false;
      }
      return false;
    }
  }

  return true;
}

/**
 * Handle preregistration form submission
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @param email - User's email
 * @returns Promise with the document ID and status
 */
export async function preregisterUser(
  firstName: string,
  lastName: string,
  email: string
): Promise<{ id: string; isUpdate: boolean }> {
  try {
    // First check if user exists
    const existingUser = await getPreregisterUserByEmail(email);
    const wasUpdate = !!(existingUser && !existingUser.hasPreregistered);
    
    // This will either create new or update existing
    const docId = await addPreregisterUser({
      firstName,
      lastName,
      email,
      hasPreregistered: true,
    });
    
    return { id: docId, isUpdate: wasUpdate };
  } catch (error: any) {
    throw error;
  }
}

// Export all functions as a service object for easier importing
export const firestoreService = {
  addPreregisterUser,
  getPreregisterUsers,
  updatePreregisterUser,
  deletePreregisterUser,
  getPreregisterUserById,
  getPreregisterUserByEmail,
  submitSurvey,
  preregisterUser,
};
