import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ReputationDisplay } from '@/components/reputation/ReputationDisplay';
import { ReviewsList } from '@/components/reputation/ReviewsList';
import { reviewApi } from '@/api/ReviewService';
import { chatApi } from '@/api/ChatService'; // Import chatApi
import type { UserProfile } from '@/types/UserProfile';
import type { Review } from '@/types/Review';
import type { ChatConversation } from '@/types/Chat'; // Import ChatConversation type
import { toast } from 'sonner';
import { MessageSquare, MessageSquareText } from 'lucide-react'; // Import icons: MessageSquare for general chat, MessageSquareText for the list
const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function MyProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { userId: userIdFromUrl } = useParams<{ userId?: string }>();

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [reviewsReceived, setReviewsReceived] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewsError, setReviewsError] = useState<string | null>(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    const targetUserId = userIdFromUrl || user?.uid;
    const isViewingOwnProfile = user && targetUserId === user.uid;

    // Effect to fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (authLoading) return;

            if (!targetUserId) {
                setIsLoading(false);
                setError("Please log in to view your profile or specify a user ID.");
                if (!user) {
                    navigate('/login');
                }
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const idToken = user ? await user.getIdToken(true) : null;
                const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

                const response = await axios.get<UserProfile>(
                    `${BASE_URL}/users/${targetUserId}`,
                    { headers }
                );
                setUserProfile(response.data);
            } catch (err: any) {
                console.error('Error fetching profile:', err);
                if (axios.isAxiosError(err) && err.response) {
                    if (err.response.status === 404) {
                        setError("Profile not found.");
                        if (isViewingOwnProfile) {
                            navigate('/profile/setup');
                        }
                    } else if (err.response.status === 401 || err.response.status === 403) {
                        setError("You are not authorized to view this profile. Please log in.");
                        if (!user) navigate('/login');
                    }
                    else {
                        setError('Failed to load profile. Please try again.');
                    }
                } else {
                    setError('Failed to load profile. Please check your network connection.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [targetUserId, user, authLoading, navigate, isViewingOwnProfile]);


    // Effect to fetch reviews for the displayed user
    useEffect(() => {
        const fetchReviews = async () => {
            if (!targetUserId) {
                setIsLoadingReviews(false);
                return;
            }
            setIsLoadingReviews(true);
            setReviewsError(null);
            try {
                const idToken = user ? await user.getIdToken(true) : null;
                const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

                const reviews = await reviewApi.getReviewsReceivedByUser(
                    targetUserId,
                    { headers }
                );
                setReviewsReceived(reviews);
            } catch (err: any) {
                console.error('Error fetching reviews:', err);
                if (axios.isAxiosError(err) && err.response) {
                    if (err.response.status === 401 || err.response.status === 403) {
                        setReviewsError('You must be logged in to view reviews.');
                        if (!user) navigate('/login');
                    } else {
                        setReviewsError('Failed to load reviews for this user. Please try again.');
                    }
                } else {
                    setReviewsError('Failed to load reviews. Please check your network connection.');
                }
            } finally {
                setIsLoadingReviews(false);
            }
        };

        if (!isLoading && !error && userProfile) {
            fetchReviews();
        }
    }, [targetUserId, isLoading, error, userProfile, user, navigate]);

    // Handle review deletion (if viewing own profile, they can delete reviews they wrote)
    const handleReviewDeleted = (deletedReviewId: string) => {
        setReviewsReceived(prev => prev.filter(review => review.id !== deletedReviewId));
        toast.success("Review deleted successfully!");
    };

    // Handle starting a new chat
    const handleStartChat = async () => {
        if (!user || !userProfile || isCreatingChat) return;

        setIsCreatingChat(true);
        try {
            const idToken = await user.getIdToken(true);
            const headers = { Authorization: `Bearer ${idToken}` };

            // Participants array must be sorted for consistent direct chat ID on backend
            const participants = [user.uid, userProfile.firebaseUid].sort();

            const newChat: ChatConversation = await chatApi.createChat(
                { participants, type: 'direct' },
                { headers }
            );
            toast.success(`Chat with ${userProfile.displayName} started!`);
            navigate(`/chats/${newChat.id}`); // Navigate to the new or existing chat room
        } catch (err: any) {
            console.error('Failed to start chat:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to start chat. Please try again.';
            toast.error("Failed to start chat", { description: errorMessage });
        } finally {
            setIsCreatingChat(false);
        }
    };

    if (isLoading) {
        return <div className="container mx-auto p-4 text-center">Loading profile...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
    }

    if (!userProfile) {
        return <div className="container mx-auto p-4 text-center">Profile not available.</div>;
    }

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-lg my-8 max-w-3xl">
            <div className="flex justify-between items-start mb-6">
                <h1 className="text-4xl font-extrabold text-gray-900">
                    {isViewingOwnProfile ? "My Profile" : `${userProfile.displayName}'s Profile`}
                </h1>
                <div className="flex flex-col space-y-2">
                    {isViewingOwnProfile ? (
                        <>
                            <Link to="/profile/edit">
                                <Button>Edit Profile</Button>
                            </Link>
                            {/* NEW: Button to route to ChatListPage */}
                            <Link to="/chats">
                                <Button variant="outline">
                                    <MessageSquareText className="mr-2 h-4 w-4" /> Go to Chats
                                </Button>
                            </Link>
                        </>
                    ) : (
                        user && user.uid !== userProfile.firebaseUid && (
                            <>
                                <Button onClick={handleStartChat} disabled={isCreatingChat}>
                                    {isCreatingChat ? 'Starting Chat...' : <><MessageSquare className="mr-2 h-4 w-4" /> Start Chat</>}
                                </Button>
                                <Link to={`/leave-review/${userProfile.firebaseUid}/select-post`}>
                                    <Button variant="outline">Leave a Review</Button>
                                </Link>
                            </>
                        )
                    )}
                </div>
            </div>

            <Separator className="my-6" />

            {/* Basic Info */}
            <div className="flex items-center gap-6 mb-6">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={userProfile.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.displayName}`} alt={userProfile.displayName} />
                    <AvatarFallback className="text-3xl">{userProfile.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">{userProfile.displayName}</h2>
                    <p className="text-lg text-muted-foreground">{userProfile.location}</p>
                    {isViewingOwnProfile && user?.email && (
                        <p className="text-md text-gray-600">Email: {user.email}</p>
                    )}
                    {userProfile.rating !== undefined && userProfile.rating !== null && (
                        <ReputationDisplay rating={userProfile.rating} className="mt-2" />
                    )}
                </div>
            </div>

            <Separator className="my-6" />

            {/* Bio */}
            {userProfile.bio && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">About {isViewingOwnProfile ? "Me" : userProfile.displayName}</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {userProfile.bio}
                    </p>
                </div>
            )}

            {/* Skills Offered */}
            {userProfile.skillsOffered && userProfile.skillsOffered.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Skills {isViewingOwnProfile ? "I Offer" : "Offered"}</h3>
                    <div className="flex flex-wrap gap-2">
                        {userProfile.skillsOffered.map((skill, index) => (
                            <Badge key={index} variant="default" className="text-base px-3 py-1">{skill}</Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Needs */}
            {userProfile.needs && userProfile.needs.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Skills/Items {isViewingOwnProfile ? "I Need" : "Needed"}</h3>
                    <div className="flex flex-wrap gap-2">
                        {userProfile.needs.map((need, index) => (
                            <Badge key={index} variant="secondary" className="text-base px-3 py-1">{need}</Badge>
                        ))}
                    </div>
                </div>
            )}

            <Separator className="my-6" />

            {/* Link to Listings */}
            <div className="text-center mb-6">
                <Link to={`/my-listings${!isViewingOwnProfile && userProfile.firebaseUid ? `?uploaderId=${userProfile.firebaseUid}` : ''}`}>
                    <Button variant="outline">
                        View {isViewingOwnProfile ? "My" : `${userProfile.displayName}'s`} Listings
                    </Button>
                </Link>
            </div>

            <Separator className="my-6" />

            {/* Reviews Section */}
            <div className="reviews-section">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Reviews {isViewingOwnProfile ? "About Me" : `About ${userProfile.displayName}`}
                </h3>
                {isLoadingReviews ? (
                    <div className="text-center text-gray-600">Loading reviews...</div>
                ) : reviewsError ? (
                    <div className="text-center text-red-500">{reviewsError}</div>
                ) : (
                    <ReviewsList
                        title=""
                        emptyMessage={isViewingOwnProfile ? "No one has reviewed you yet." : `${userProfile.displayName} hasn't received any reviews yet.`}
                        reviews={reviewsReceived}
                        currentUserId={user?.uid}
                        onReviewDeleted={handleReviewDeleted}
                    />
                )}
            </div>
        </div>
    );
}
