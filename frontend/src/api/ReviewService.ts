// src/api/ReviewService.ts
import axios, { type AxiosRequestConfig } from 'axios';
import type { BarterPost } from '@/types/BarterPost';
import type { Review } from '@/types/Review'; // This will now include the nested 'fromUser'
import type { UserProfile } from '@/types/UserProfile';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface CreateReviewPayload {
    // Renamed to match backend model's field names for creation
    fromUserFirebaseUid: string;
    toUserFirebaseUid: string;
    barterPostId: string;
    rating: number;
    comment: string;
}

export const reviewApi = {
    /**
     * Fetches reviews received by a specific user.
     * @param toUserFirebaseUid The Firebase UID of the user who received the reviews.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    getReviewsReceivedByUser: async (toUserFirebaseUid: string, config?: AxiosRequestConfig): Promise<Review[]> => {
        const response = await axios.get<Review[]>(`${BASE_URL}/reviews/received`, {
            params: { toUserId: toUserFirebaseUid }, // Corrected: Changed to 'toUserId'
            ...config
        });
        return response.data;
    },

    /**
     * Fetches reviews written by a specific user.
     * @param fromUserFirebaseUid The Firebase UID of the user who wrote the reviews.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    getReviewsWrittenByUser: async (fromUserFirebaseUid: string, config?: AxiosRequestConfig): Promise<Review[]> => {
        const response = await axios.get<Review[]>(`${BASE_URL}/reviews/written`, {
            params: { fromUserId: fromUserFirebaseUid }, // Corrected: Changed to 'fromUserId'
            ...config
        });
        return response.data;
    },

    /**
     * Fetches reviews for a specific barter post.
     * @param barterPostId The ID of the related BarterPost.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    getReviewsForBarterPost: async (barterPostId: string, config?: AxiosRequestConfig): Promise<Review[]> => {
        const response = await axios.get<Review[]>(`${BASE_URL}/reviews/post/${barterPostId}`, config);
        return response.data;
    },

    /**
     * Creates a new review.
     * @param reviewData The review object to create.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    createReview: async (reviewData: CreateReviewPayload, config?: AxiosRequestConfig): Promise<Review> => {
        const response = await axios.post<Review>(`${BASE_URL}/reviews`, reviewData, config);
        return response.data;
    },

    /**
     * Deletes a review.
     * @param reviewId The ID of the review to delete.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    deleteReview: async (reviewId: string, config?: AxiosRequestConfig): Promise<void> => {
        await axios.delete(`${BASE_URL}/reviews/${reviewId}`, config);
    },

    /**
     * Fetches a single user profile.
     * @param uid The Firebase UID of the user.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    getUserProfile: async (uid: string, config?: AxiosRequestConfig): Promise<UserProfile> => {
        const response = await axios.get<UserProfile>(`${BASE_URL}/users/${uid}`, config);
        return response.data;
    },

    /**
     * Fetches a single barter post by ID.
     * @param postId The ID of the barter post.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    getBarterPostById: async (postId: string, config?: AxiosRequestConfig): Promise<BarterPost> => {
        const response = await axios.get<BarterPost>(`${BASE_URL}/posts/${postId}`, config);
        return response.data;
    },

    /**
     * Fetches filtered barter posts.
     * This is useful for getting a user's specific posts (e.g., completed posts for review selection).
     * @param params Query parameters for filtering.
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     */
    getFilteredBarterPosts: async (params: any, config?: AxiosRequestConfig): Promise<BarterPost[]> => {
        const response = await axios.get<BarterPost[]>(`${BASE_URL}/posts`, { params, ...config });
        return response.data;
    }
};
