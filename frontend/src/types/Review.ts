export interface Review {
    id: string;
    // Renamed to match backend
    fromUserFirebaseUid: string;
    // Renamed to match backend
    toUserFirebaseUid: string;
    barterPostId?: string;
    rating: number;
    comment: string;
    createdAt: string;

    // NEW: Added nested fromUser object to match backend model
    fromUser: {
        firebaseUid: string;
        displayName: string;
    };
}