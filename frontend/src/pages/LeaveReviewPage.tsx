// src/pages/LeaveReviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewApi } from '@/api/ReviewService';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BarterPost } from '@/types/BarterPost';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface LeaveReviewPageParams extends Record<string, string | undefined> {
    toUserFirebaseUid: string;
    barterPostId?: string;
}

export default function LeaveReviewPage() {
    const { toUserFirebaseUid, barterPostId } = useParams<LeaveReviewPageParams>();
    const navigate = useNavigate();
    const { user: currentUser, loading: authLoading } = useAuth();

    // DIAGNOSTIC LOG: Check what useParams is returning
    console.log("LeaveReviewPage - useParams:", { toUserFirebaseUid, barterPostId });

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [barterPostTitle, setBarterPostTitle] = useState<string | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(barterPostId === 'select-post' ? null : barterPostId || null);
    const [reviewedUserName, setReviewedUserName] = useState<string | null>(null);
    const [showPostSelection, setShowPostSelection] = useState(false);
    const [userPosts, setUserPosts] = useState<BarterPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [postsError, setPostsError] = useState<string | null>(null);

    // Effect to fetch initial data (user profile and potentially post title)
    useEffect(() => {
        const fetchData = async () => {
            if (!toUserFirebaseUid) {
                setError("Missing target user ID.");
                return;
            }

            if (currentUser && currentUser.uid === toUserFirebaseUid) {
                setError("You cannot leave a review for yourself.");
                return;
            }

            try {
                const userResponse = await reviewApi.getUserProfile(toUserFirebaseUid);
                setReviewedUserName(userResponse.displayName);

                if (barterPostId && barterPostId !== 'select-post') {
                    const token = await currentUser?.getIdToken(true);
                    if (!token) {
                        setError("Authentication required to fetch post details. Please log in.");
                        return;
                    }
                    const headers = { Authorization: `Bearer ${token}` };
                    const postResponse = await reviewApi.getBarterPostById(barterPostId, { headers });
                    setBarterPostTitle(postResponse.title);
                    setSelectedPostId(barterPostId);
                } else {
                    setBarterPostTitle("a specific exchange");
                    setShowPostSelection(true);
                }

            } catch (err: any) {
                console.error("Failed to fetch initial review details:", err);
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    setError("Authentication required to load post details. Please log in.");
                } else {
                    setError("Failed to load details for review. Please check the provided IDs.");
                }
            }
        };
        if (!authLoading) {
            fetchData();
        }
    }, [toUserFirebaseUid, barterPostId, currentUser, authLoading]);

    // Effect to fetch user's posts for selection if needed
    useEffect(() => {
        const fetchUserPosts = async () => {
            if (!currentUser || !currentUser.uid) {
                setPostsError("You must be logged in to fetch your posts for selection.");
                return;
            }
            if (!toUserFirebaseUid) { // Ensure toUserFirebaseUid is available
                setPostsError("Target user ID is missing for post selection.");
                return;
            }

            setIsLoadingPosts(true);
            setPostsError(null);
            try {
                const token = await currentUser.getIdToken(true);
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch completed posts uploaded by the current user
                const postsUploadedByCurrentUser = await reviewApi.getFilteredBarterPosts(
                    { uploaderId: currentUser.uid, status: 'closed' },
                    { headers }
                );

                // Fetch completed posts uploaded by the user being reviewed
                const postsUploadedByTargetUser = await reviewApi.getFilteredBarterPosts(
                    { uploaderId: toUserFirebaseUid, status: 'closed' },
                    { headers }
                );

                // Combine the lists and remove potential duplicates (though IDs should be unique)
                const combinedPosts = [...postsUploadedByCurrentUser, ...postsUploadedByTargetUser];
                const uniquePosts = Array.from(new Map(combinedPosts.map(post => [post.id, post])).values());

                // Sort posts by creation date, most recent first
                uniquePosts.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });

                setUserPosts(uniquePosts);

            } catch (err: any) {
                console.error("Error fetching user's posts:", err);
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    setPostsError("Authentication required to load your posts. Please log in.");
                } else {
                    setPostsError("Failed to load relevant posts. Please try again.");
                }
            } finally {
                setIsLoadingPosts(false);
            }
        };

        if (showPostSelection && currentUser && !authLoading) {
            fetchUserPosts();
        }
    }, [showPostSelection, currentUser, authLoading, toUserFirebaseUid]);

    const handleSelectPost = (post: BarterPost) => {
        setSelectedPostId(post.id || null);
        setBarterPostTitle(post.title);
        setShowPostSelection(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!currentUser || !currentUser.uid) {
            setError("You must be logged in to leave a review.");
            toast.error("Authentication required.", { description: "Please log in to submit a review." });
            return;
        }
        if (!toUserFirebaseUid || !selectedPostId) {
            setError("User or Barter Post ID is missing. Please select a post.");
            toast.error("Missing Information.", { description: "Please ensure a post is selected." });
            return;
        }
        if (rating === 0) {
            setError("Please select a rating.");
            toast.error("Rating required.", { description: "Please select a star rating." });
            return;
        }
        if (comment.trim() === '') {
            setError("Please provide a comment.");
            toast.error("Comment required.", { description: "Please provide a comment for your review." });
            return;
        }
        if (currentUser.uid === toUserFirebaseUid) {
            setError("You cannot leave a review for yourself.");
            toast.error("Self-review not allowed.", { description: "You cannot leave a review for your own profile." });
            return;
        }

        setIsLoading(true);
        try {
            const idToken = await currentUser.getIdToken(true);
            const headers = { Authorization: `Bearer ${idToken}` };

            await reviewApi.createReview(
                {
                    fromUserFirebaseUid: currentUser.uid,
                    toUserFirebaseUid: toUserFirebaseUid,
                    barterPostId: selectedPostId,
                    rating: rating,
                    comment: comment,
                },
                { headers }
            );
            toast.success('Review submitted!', { description: "Your review has been successfully submitted." });
            navigate(`/profile/${toUserFirebaseUid}`);
        } catch (err: any) {
            console.error('Failed to submit review:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to submit review. Please try again.';
            setError(errorMessage);
            toast.error("Submission failed.", { description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || !currentUser && !toUserFirebaseUid) {
        return (
            <div className="container mx-auto p-4 text-center text-gray-600">
                Loading authentication...
            </div>
        );
    }

    if (error && !isLoading) {
        return (
            <div className="container mx-auto p-4 text-center text-red-600">
                <h1 className="text-3xl font-bold mb-4">Error</h1>
                <p>{error}</p>
                <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
            </div>
        );
    }

    if (!reviewedUserName) {
        return (
            <div className="container mx-auto p-4 text-center text-gray-600">
                Loading review details...
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Leave a Review</CardTitle>
                    <CardDescription>
                        Reviewing{' '}
                        <span className="font-semibold text-gray-800">{reviewedUserName}</span>
                        {' '}for{' '}
                        <span className="font-semibold text-gray-800">"{barterPostTitle || 'a specific exchange'}"</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Post selection if needed */}
                        {(barterPostId === 'select-post' || !selectedPostId) && (
                            <div className="flex flex-col items-start space-y-2">
                                <Label htmlFor="post-select">Associated Post</Label>
                                {selectedPostId ? (
                                    <p className="text-sm">Selected Post: <span className="font-semibold">{barterPostTitle}</span></p>
                                ) : (
                                    <p className="text-red-500 text-sm">Please select a post to link this review to.</p>
                                )}
                                <Dialog open={showPostSelection} onOpenChange={setShowPostSelection}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" type="button">
                                            {selectedPostId ? 'Change Post' : 'Select Post'}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md md:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>Select a Barter Post</DialogTitle>
                                            <DialogDescription>
                                                Choose a completed barter post that you or {reviewedUserName} uploaded, which relates to your exchange.
                                            </DialogDescription>
                                        </DialogHeader>
                                        {isLoadingPosts ? (
                                            <div className="text-center py-4">Loading relevant posts...</div>
                                        ) : postsError ? (
                                            <div className="text-center text-red-500 py-4">{postsError}</div>
                                        ) : userPosts.length === 0 ? (
                                            <div className="text-center py-4 text-gray-600">No completed posts found related to this interaction.</div>
                                        ) : (
                                            <ScrollArea className="h-64 pr-4">
                                                <div className="space-y-2">
                                                    {userPosts.map(post => (
                                                        <Button
                                                            key={post.id}
                                                            variant={selectedPostId === post.id ? "default" : "outline"}
                                                            className="w-full justify-start h-auto py-2 text-left"
                                                            onClick={() => handleSelectPost(post)}
                                                        >
                                                            <div>
                                                                <p className="font-semibold">{post.title}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    Uploaded by: {post.userFirebaseUid === currentUser?.uid ? 'You' : (post.displayName || 'Unknown')}
                                                                    {post.createdAt && ` on ${new Date(post.createdAt).toLocaleDateString()}`}
                                                                </p>
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </DialogContent>
                                </Dialog>
                                <Separator className="my-4" />
                            </div>
                        )}

                        <div>
                            <Label htmlFor="rating" className="block text-sm font-medium mb-2">Rating</Label>
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((starValue) => (
                                    <Star
                                        key={starValue}
                                        className={cn(
                                            "cursor-pointer h-8 w-8",
                                            rating >= starValue ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                                        )}
                                        onClick={() => setRating(starValue)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="comment" className="block text-sm font-medium mb-2">Comment</Label>
                            <Textarea
                                id="comment"
                                placeholder="Share your experience..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={5}
                                required
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading || (barterPostId === 'select-post' && !selectedPostId)}
                        >
                            {isLoading ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
