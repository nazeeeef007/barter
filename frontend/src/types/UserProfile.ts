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
  profileImageUrl?: string|null; // URL to profile picture
  createdAt: string; // ISO string date
  // Add other fields as per your backend UserProfile model
}



export interface UserProfileFormData {
    displayName: string;
    location: string;
    bio?: string;  // <-- make optional
    skillsOffered: string[];
    needs: string[];
    profileImageUrl?: string | null;
    profileImageFile?: File | null;
}
