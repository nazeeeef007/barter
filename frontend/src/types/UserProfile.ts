// src/types/UserProfile.tsx
export interface UserProfile {
  id: string; // Corresponds to Firebase UID
  firebaseUid: string; // Redundant if id is Firebase UID, but explicitly stating
  displayName: string;
  email: string;
  location: string;
  bio: string;
  skillsOffered: string[];
  needs: string[];
  rating: number; // Optional, might be null initially
  profileImageUrl: string; // URL to profile picture
  createdAt: string; // ISO string date
  // Add other fields as per your backend UserProfile model
}

// Interface for the data expected by the form
// export interface UserProfileFormData {
//   displayName: string;
//   location: string;
//   bio: string;
//   skillsOffered: string[];
//   needs: string[];
//   profileImageUrl: string; // Even if optional, form might handle it as string
// }

export interface UserProfileFormData {
    displayName: string;
    location: string;
    bio: string;
    skillsOffered: string[];
    needs: string[];
    profileImageUrl?: string | null; // URL string for existing image or null to remove
    profileImageFile?: File | null; // New file to upload
}