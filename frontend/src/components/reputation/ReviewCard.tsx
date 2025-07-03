// src/components/reputation/ReviewCard.tsx
import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ReputationDisplay } from './ReputationDisplay';
import type { Review } from '@/types/Review';
import type { UserProfile } from '@/types/UserProfile';
import { reviewApi } from '@/api/ReviewService'; // Ensure this path is correct
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth to get current user's token
import { toast } from 'sonner'; // Import toast for notifications

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReviewCardProps {
    review: Review;
    currentUserId?: string;
    onDeleteSuccess?: (reviewId: string) => void;
}

export function ReviewCard({ review, currentUserId, onDeleteSuccess }: ReviewCardProps) {
    const { user: currentUser, loading: authLoading } = useAuth(); // Get current user for token
    const [fromUser, setFromUser] = useState<UserProfile | null>(null);
    const [toUser, setToUser] = useState<UserProfile | null>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        const fetchUserProfiles = async () => {
            setIsLoadingUsers(true);
            try {
                let headers = {};
                // If getUserProfile needs authentication (e.g., for non-public profiles)
                // then get the token here. Based on your SecurityConfig, /api/users/{id} is public (GET).
                // So, no token needed here unless you change SecurityConfig.
                // If it were protected:
                // if (currentUser && !authLoading) {
                //     const token = await currentUser.getIdToken(true);
                //     headers = { Authorization: `Bearer ${token}` };
                // }

                const [fromUserData, toUserData] = await Promise.all([
                    reviewApi.getUserProfile(review.fromUserId, { headers }), // Pass headers if needed
                    reviewApi.getUserProfile(review.toUserId, { headers })  // Pass headers if needed
                ]);
                setFromUser(fromUserData);
                setToUser(toUserData);
            } catch (error) {
                console.error('Failed to fetch user profiles for review:', error);
                setFromUser({ uid: review.fromUserId, displayName: 'Unknown User' } as UserProfile); // Cast for type safety
                setToUser({ uid: review.toUserId, displayName: 'Unknown User' } as UserProfile); // Cast for type safety
            } finally {
                setIsLoadingUsers(false);
            }
        };

        // Only fetch if auth is not loading, as currentUser might be needed for token (if used)
        if (!authLoading) {
            fetchUserProfiles();
        }
    }, [review.fromUserId, review.toUserId, currentUser, authLoading]); // Add currentUser, authLoading to dependencies

    const handleDelete = async () => {
        if (!currentUser || !currentUser.uid) {
            toast.error("Authentication required.", { description: "Please log in to delete this review." });
            return;
        }
        try {
            const token = await currentUser.getIdToken(true);
            const headers = { Authorization: `Bearer ${token}` };
            await reviewApi.deleteReview(review.id, { headers });
            onDeleteSuccess?.(review.id);
            toast.success("Review deleted!", { description: "Your review has been successfully removed." });
        } catch (error: any) {
            console.error('Failed to delete review:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to delete review. Please try again.';
            toast.error("Deletion failed.", { description: errorMessage });
        }
    };

    if (isLoadingUsers) {
        return (
            <Card className="flex items-center space-x-4 p-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </Card>
        );
    }

    const reviewDate = new Date(review.createdAt);

    return (
        <Card className="w-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={fromUser?.profileImageUrl} alt={fromUser?.displayName} />
                        <AvatarFallback>{fromUser?.displayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <Link to={`/profile/${fromUser?.uid}`} className="font-semibold hover:underline">
                            {fromUser?.displayName || 'Unknown User'}
                        </Link>
                        <span className="text-sm text-gray-500">
                            reviewed{' '}
                            <Link to={`/profile/${toUser?.uid}`} className="font-semibold hover:underline">
                                {toUser?.displayName || 'Unknown User'}
                            </Link>
                        </span>
                    </div>
                </div>
                {currentUserId === review.fromUserId && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your review.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center mb-2">
                    <ReputationDisplay rating={review.rating} />
                    <span className="text-sm text-gray-500 ml-3">
                        {format(reviewDate, 'MMM dd,yyyy')}
                    </span>
                </div>
                <p className="text-gray-700 mb-3">{review.comment}</p>
                {review.barterPostId && (
                    <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-1">Related to:</span>
                        <Link to={`/listings/${review.barterPostId}`}> {/* Link to listing detail page */}
                            <Badge variant="outline" className="hover:bg-gray-100">
                                Barter Post ID: {review.barterPostId.substring(0, 8)}...
                            </Badge>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}