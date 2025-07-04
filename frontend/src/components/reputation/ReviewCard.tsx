import { useEffect, useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

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

const createUnknownUser = (uid: string, displayName = 'Unknown User'): UserProfile => ({
    id: uid,
    firebaseUid: uid,
    displayName,
    email: '',
    location: '',
    bio: '',
    skillsOffered: [],
    needs: [],
    rating: 0,
    profileImageUrl: '',
    createdAt: new Date().toISOString(),
});

export function ReviewCard({ review, currentUserId, onDeleteSuccess }: ReviewCardProps) {
    const { user: currentUser, loading: authLoading } = useAuth();

    const [fromUser, setFromUser] = useState<UserProfile | null>(null);
    const [toUser, setToUser] = useState<UserProfile | null>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        const fetchUserProfiles = async () => {
            setIsLoadingUsers(true);
            try {
                let headers = {};
                // Optionally add auth headers if needed

                const [fromUserData, toUserData] = await Promise.all([
                    reviewApi.getUserProfile(review.fromUserFirebaseUid, { headers }),
                    reviewApi.getUserProfile(review.toUserFirebaseUid, { headers }),
                ]);

                setFromUser(fromUserData);
                setToUser(toUserData);
            } catch (error) {
                console.error('Failed to fetch user profiles for review:', error);

                // Use nested fromUser data if available, else fallback unknown user
                if (review.fromUser && review.fromUser.firebaseUid) {
                    setFromUser({
                        ...createUnknownUser(review.fromUser.firebaseUid),
                        displayName: review.fromUser.displayName || 'Unknown User',
                    });
                } else {
                    setFromUser(createUnknownUser(review.fromUserFirebaseUid));
                }

                setToUser(createUnknownUser(review.toUserFirebaseUid));
            } finally {
                setIsLoadingUsers(false);
            }
        };

        if (!authLoading) {
            fetchUserProfiles();
        }
    }, [review.fromUserFirebaseUid, review.toUserFirebaseUid, review.fromUser, authLoading]);

    const handleDelete = async () => {
        if (!currentUser || !currentUser.uid) {
            toast.error('Authentication required.', { description: 'Please log in to delete this review.' });
            return;
        }
        try {
            const token = await currentUser.getIdToken(true);
            const headers = { Authorization: `Bearer ${token}` };
            await reviewApi.deleteReview(review.id, { headers });
            onDeleteSuccess?.(review.id);
            toast.success('Review deleted!', { description: 'Your review has been successfully removed.' });
        } catch (error: any) {
            console.error('Failed to delete review:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to delete review. Please try again.';
            toast.error('Deletion failed.', { description: errorMessage });
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
                        <AvatarImage src={fromUser?.profileImageUrl ?? undefined} alt={fromUser?.displayName} />

                        <AvatarFallback>{fromUser?.displayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <Link to={`/profile/${fromUser?.firebaseUid}`} className="font-semibold hover:underline">
                            {fromUser?.displayName || 'Unknown User'}
                        </Link>
                        <span className="text-sm text-gray-500">
                            reviewed{' '}
                            <Link to={`/profile/${toUser?.firebaseUid}`} className="font-semibold hover:underline">
                                {toUser?.displayName || 'Unknown User'}
                            </Link>
                        </span>
                    </div>
                </div>
                {currentUserId === review.fromUserFirebaseUid && (
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
                    <span className="text-sm text-gray-500 ml-3">{format(reviewDate, 'MMM dd, yyyy')}</span>
                </div>
                <p className="text-gray-700 mb-3">{review.comment}</p>
                {review.barterPostId && (
                    <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-1">Related to:</span>
                        <Link to={`/listings/${review.barterPostId}`}>
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
