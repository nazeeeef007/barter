// src/pages/ListingDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ReputationDisplay } from '@/components/reputation/ReputationDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
const BASE_URL = import.meta.env.VITE_BASE_URL;
// Assuming these types are defined globally or imported from a types file.
// IMPORTANT: Updated BarterPost interface to reflect backend's FLAT structure for user data.
// If your backend changes to a nested 'userProfile' object, you'll need to revert this.
interface BarterPost {
    id: string; // Assuming string IDs for consistency with Firebase UIDs
    title: string;
    description: string;
    type: 'offer' | 'request';
    tags?: string[];
    preferredExchange?: string;
    imageUrl?: string;
    // --- CRITICAL CHANGE START: Flat user fields from backend ---
    userFirebaseUid: string; // The uploader's Firebase UID, directly on the post
    displayName: string;     // The uploader's display name, directly on the post
    profileImageUrl?: string; // The uploader's profile image URL, directly on the post
    // --- CRITICAL CHANGE END ---
    status: string; // e.g., 'open', 'completed', 'cancelled'
}

// Extend BarterPost interface for more details for this page
interface BarterPostDetail extends BarterPost {
    availability?: Array<{ day: string; time: string }>; // Make optional if not always present
    // The frontend's 'userProfile' for reputation/location will still be fetched separately.
}

interface UserProfileDetail {
    id: number; // Backend ID
    firebaseUid: string; // Firebase UID
    displayName: string;
    email: string;
    location: string;
    bio: string;
    skillsOffered: string[];
    needs: string[];
    rating: number; // Overall rating
    createdAt: string;
    profileImageUrl?: string; // Add profile image URL
}

interface Review {
    id: string; // Assuming string IDs for reviews for consistency
    rating: number;
    comment: string;
    fromUser: {
        firebaseUid: string; // Reviewer's Firebase UID
        displayName: string;
    };
    createdAt: string;
    barterPostId?: string; // If review is specific to a post, ensure type consistency
}

export default function ListingDetailPage() {
    const { id } = useParams<{ id: string }>(); // 'id' will be the barterPostId
    const [listing, setListing] = useState<BarterPostDetail | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfileDetail | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Use the useAuth hook to get the current user and authentication loading state
    const { user: currentUser, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchListingDetails = async () => {
            setIsLoading(true);
            setError(null);

            // If authentication is still loading, wait for it to complete
            if (authLoading) {
                return;
            }

            // If no user is logged in, and the backend endpoint requires a token,
            // we already know it will fail. Set error immediately.
            if (!currentUser) {
                setIsLoading(false);
                setError("You must be logged in to view this listing. This endpoint requires authentication.");
                return;
            }

            try {
                // Get the Firebase ID token
                const idToken = await currentUser.getIdToken(true);
                const headers = { Authorization: `Bearer ${idToken}` };

                // Fetch the BarterPost details
                // This call will ONLY succeed if the currentUser is the owner of the post.
                // Otherwise, the backend will return 403 Forbidden.
                const listingResponse = await axios.get<BarterPostDetail>(
                    `${BASE_URL}/posts/${id}`,
                    { headers } // Pass authentication headers here
                );
                setListing(listingResponse.data);

                // --- CRITICAL CHANGE START: Access userFirebaseUid directly from listing.data ---
                const uploaderFirebaseUid = listingResponse.data.userFirebaseUid; // Access directly
                // --- CRITICAL CHANGE END ---

                if (!uploaderFirebaseUid) {
                    // This error should theoretically not happen if backend consistently sends it
                    throw new Error("Uploader's Firebase UID missing from listing data.");
                }

                // Fetch the associated UserProfile details using firebaseUid, with token
                const userProfileResponse = await axios.get<UserProfileDetail>(
                    `${BASE_URL}/users/${uploaderFirebaseUid}`,
                    { headers } // Pass authentication headers here as well
                );
                setUserProfile(userProfileResponse.data);

                // Fetch reviews for this user, with token
                const reviewsResponse = await axios.get<Review[]>(
                    `${BASE_URL}/reviews/toUser/${uploaderFirebaseUid}`,
                    { headers } // Pass authentication headers here as well
                );
                setReviews(reviewsResponse.data);

            } catch (err: any) {
                console.error('Error fetching listing details:', err);
                if (axios.isAxiosError(err) && err.response) {
                    if (err.response.status === 404) {
                        setError('Listing or associated user profile not found.');
                    } else if (err.response.status === 401) {
                        setError('Authentication required to view this listing. Please log in.');
                    } else if (err.response.status === 403) {
                        setError('You are not authorized to view this listing. Only the owner can view it.');
                    }
                    else {
                        setError(`Failed to load listing details: ${err.response.data?.message || err.message}`);
                    }
                } else {
                    setError('Failed to load listing details. Please check your network connection.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if ID is present and authentication state has resolved
        // and we have a current user (since the backend endpoint requires it)
        if (id && !authLoading && currentUser) {
            fetchListingDetails();
        } else if (!id) {
            setIsLoading(false);
            setError("Listing ID is missing from the URL.");
        }
        // If authLoading is true, useEffect will re-run when it becomes false.
        // If currentUser is null after authLoading is false, the error will be set above.
    }, [id, currentUser, authLoading]); // Add currentUser and authLoading to dependency array

    if (isLoading) {
        return <div className="container mx-auto p-4 text-center text-gray-600">Loading listing details...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 text-center text-red-600">
                <h1 className="text-2xl font-bold mb-4">Error</h1>
                <p>{error}</p>
                <Button onClick={() => window.history.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    // Now, `listing` will have `displayName` and `profileImageUrl` directly
    // `userProfile` will be fetched separately for its other details (location, bio, skills, rating)
    if (!listing || !userProfile) {
        // This case should ideally be caught by error handling, but as a fallback:
        return <div className="container mx-auto p-4 text-center text-gray-600">Listing or user profile data is incomplete.</div>;
    }

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-lg my-8 max-w-4xl">
            {/* Title and Propose Exchange Button */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{listing.title}</h1>
                    <Badge className="text-lg px-3 py-1 font-semibold">
                        {listing.type === 'offer' ? 'Offering' : 'Requesting'}
                    </Badge>
                </div>
                {/* Conditionally render or disable "Propose Exchange" if it's the current user's post */}
                {/* A user cannot propose exchange on their own post */}
                {currentUser && listing.userFirebaseUid !== currentUser.uid && (
                    <Button size="lg" className="px-8 py-3 text-lg">Propose Exchange</Button>
                )}
            </div>

            <Separator className="my-6" />

            {/* User Information - Use `userProfile` for full details, fallback to `listing` for display name/image if userProfile isn't fully loaded yet */}
            <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                    {/* Use userProfile.profileImageUrl for full profile, or fallback to listing.profileImageUrl */}
                    <AvatarImage src={userProfile.profileImageUrl || listing.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.displayName || listing.displayName}`} alt={userProfile.displayName || listing.displayName} />
                    <AvatarFallback className="text-xl">{(userProfile.displayName || listing.displayName)?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {/* Link to profile using userProfile.firebaseUid */}
                        <Link to={`/profile/${userProfile.firebaseUid}`} className="hover:underline">
                            {userProfile.displayName}
                        </Link>
                    </h2>
                    <p className="text-md text-muted-foreground">{userProfile.location}</p>
                    {userProfile.rating !== undefined && userProfile.rating !== null && (
                        <ReputationDisplay rating={userProfile.rating} />
                    )}
                    <p className="text-sm text-gray-600 italic mt-2">{userProfile.bio}</p>
                </div>
            </div>

            <Separator className="my-6" />

            {/* Comprehensive Description */}
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Details</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {listing.description}
                </p>
            </div>

            {/* Key Skills / Tags */}
            {listing.tags && listing.tags.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Key Skills / Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {listing.tags.map((tag, index) => (
                            <Badge key={index} variant="default" className="text-base px-3 py-1">{tag}</Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Preferred Exchange */}
            {listing.preferredExchange && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Preferred Exchange</h3>
                    <p className="text-gray-700 leading-relaxed">
                        {listing.preferredExchange}
                    </p>
                </div>
            )}

            {/* Images (if applicable) */}
            {listing.imageUrl && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Images</h3>
                    <img src={listing.imageUrl} alt={listing.title} className="w-full max-w-lg h-auto rounded-lg shadow-md object-cover" />
                </div>
            )}

            {/* Availability */}
            {listing.availability && listing.availability.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Availability</h3>
                    <ul className="list-disc pl-5 text-gray-700">
                        {listing.availability.map((avail, index) => (
                            <li key={index}>{`${avail.day}: ${avail.time}`}</li>
                        ))}
                    </ul>
                </div>
            )}

            <Separator className="my-6" />

            {/* List of Reviews for that user */}
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Reviews for {userProfile?.displayName}</h3>
                {reviews.length === 0 ? (
                    <p className="text-gray-600">No reviews yet for this user.</p>
                ) : (
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <div key={review.id} className="p-4 bg-gray-50 rounded-md shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold">{review.fromUser.displayName}</p>
                                    <p className="text-sm text-gray-500">Rating: {review.rating} ⭐</p>
                                </div>
                                <p className="text-gray-700 text-sm">{review.comment}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p> {/* Better date formatting */}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Back button */}
            <Button variant="outline" onClick={() => window.history.back()} className="mt-8">
                Back to Listings
            </Button>
        </div>
    );
}