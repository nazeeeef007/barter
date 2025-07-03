// src/components/reputation/ReviewsList.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { reviewApi } from '@/api/ReviewService';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Link } from 'react-router-dom'; // Import Link for reviewer profile

// Assuming Review interface is imported from '@/types/Review' and now includes 'fromUser'
import type { Review } from '@/types/Review';

interface ReviewsListProps {
    title: string;
    emptyMessage: string;
    reviews: Review[];
    currentUserId?: string; // Optional: Firebase UID of the currently logged-in user
    onReviewDeleted?: (reviewId: string) => void; // Callback for when a review is deleted
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
    title,
    emptyMessage,
    reviews,
    currentUserId,
    onReviewDeleted
}) => {
    const { user: authUser } = useAuth(); // Get authenticated user from context

    const handleDeleteReview = async (reviewId: string) => {
        if (!currentUserId) {
            toast.error("Authentication required.", { description: "You must be logged in to delete a review." });
            return;
        }

        // Confirmation dialog (using sonner for simplicity, you might use a custom modal)
        toast.info("Confirm Deletion", {
            description: "Are you sure you want to delete this review? This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        const idToken = await authUser?.getIdToken(true);
                        if (!idToken) {
                            toast.error("Authentication failed.", { description: "Could not get authentication token." });
                            return;
                        }
                        const headers = { Authorization: `Bearer ${idToken}` };

                        await reviewApi.deleteReview(reviewId, { headers });
                        toast.success("Review Deleted", { description: "The review has been successfully removed." });
                        onReviewDeleted?.(reviewId); // Notify parent component
                    } catch (error: any) {
                        console.error('Error deleting review:', error);
                        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete review.';
                        toast.error("Deletion Failed", { description: errorMessage });
                    }
                },
            },
            duration: 5000 // Keep the toast visible for a bit for user to click action
        });
    };

    return (
        <div className="reviews-list-container">
            {title && <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>}
            {reviews.length === 0 ? (
                <p className="text-gray-600">{emptyMessage}</p>
            ) : (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="p-4 bg-gray-50 rounded-md shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                {/* Use review.fromUser.displayName and link to profile */}
                                <Link to={`/profile/${review.fromUser.firebaseUid}`} className="font-semibold hover:underline text-blue-700">
                                    {review.fromUser.displayName}
                                </Link>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Rating: {review.rating} ⭐</span>
                                    {/* Only show delete button if current user is the author of this review */}
                                    {currentUserId && review.fromUser.firebaseUid === currentUserId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteReview(review.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Delete this review"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="text-gray-700 text-sm">{review.comment}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};