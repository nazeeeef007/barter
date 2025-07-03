// src/pages/MyListingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ListingCard } from '@/components/listings/ListingCard';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button'; // Import Button for status toggles
import type { BarterPost } from '@/types/BarterPost';
import type { UserProfile } from '@/types/UserProfile';
const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function MyListingsPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [listings, setListings] = useState<BarterPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [targetUserProfile, setTargetUserProfile] = useState<UserProfile | null>(null);
    // NEW: State to manage the status filter. Default to 'open'
    const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');

    const uploaderIdFromUrl = new URLSearchParams(location.search).get('uploaderId');
    const actualUploaderId = uploaderIdFromUrl || user?.uid;

    const isViewingOwnListings = user && actualUploaderId === user.uid;

    const fetchTargetUserProfile = useCallback(async () => {
        if (!actualUploaderId) return;

        try {
            const idToken = await user?.getIdToken(true);
            const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

            const response = await axios.get<UserProfile>(
                `${BASE_URL}/users/${actualUploaderId}`,
                { headers }
            );
            setTargetUserProfile(response.data);
        } catch (err) {
            console.error("Error fetching target user's profile:", err);
            setTargetUserProfile(null);
        }
    }, [actualUploaderId, user]);

    // MODIFIED: Fetch listings based on the resolved uploader ID and status filter
    const fetchListings = useCallback(async () => {
        if (authLoading) return;

        if (!actualUploaderId) {
            setIsLoading(false);
            setError("Please log in to view listings or specify a user ID.");
            if (!user) {
                navigate('/login');
            }
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const idToken = await user?.getIdToken(true);
            const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

            const params = new URLSearchParams();
            params.append('uploaderId', actualUploaderId);

            // NEW: Conditionally append the status filter
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            const response = await axios.get<BarterPost[]>(
                `${BASE_URL}/posts?${params.toString()}`,
                { headers }
            );
            setListings(response.data);
        } catch (err: any) {
            console.error('Error fetching listings:', err);
            if (axios.isAxiosError(err) && err.response) {
                if (err.response.status === 404) {
                    setError("No listings found for this user.");
                } else if (err.response.status === 401 || err.response.status === 403) {
                    setError("You are not authorized to view these listings or your session has expired. Please log in.");
                    navigate('/login');
                } else {
                    setError('Failed to load listings. Please try again.');
                }
            } else {
                setError('Failed to load listings. Please check your network connection.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [actualUploaderId, user, authLoading, navigate, statusFilter]); // ADD statusFilter to dependencies

    useEffect(() => {
        if (!authLoading) {
            fetchTargetUserProfile();
            fetchListings();
        }
    }, [fetchListings, fetchTargetUserProfile, authLoading]);

    const pageTitle = isViewingOwnListings
        ? "My Listings"
        : targetUserProfile?.displayName ? `${targetUserProfile.displayName}'s Listings` : "User Listings";

    // Handle status button click
    const handleStatusFilterChange = (status: 'open' | 'closed' | 'all') => {
        setStatusFilter(status);
        // fetchListings will be called by useEffect due to statusFilter change
    };

    if (isLoading) {
        return <div className="container mx-auto p-8 text-center text-lg text-gray-600">Loading listings...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-8 text-center text-red-500 text-lg">{error}</div>;
    }

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-lg my-8 max-w-5xl">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center">{pageTitle}</h1>
            <Separator className="my-6" />

            {/* NEW: Status Filter Buttons */}
            {isViewingOwnListings && ( // Only show status filter for own listings
                <div className="flex justify-center space-x-4 mb-6">
                    <Button
                        variant={statusFilter === 'open' ? 'default' : 'outline'}
                        onClick={() => handleStatusFilterChange('open')}
                    >
                        Open Posts
                    </Button>
                    <Button
                        variant={statusFilter === 'closed' ? 'default' : 'outline'}
                        onClick={() => handleStatusFilterChange('closed')}
                    >
                        Closed Posts
                    </Button>
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => handleStatusFilterChange('all')}
                    >
                        All Posts
                    </Button>
                </div>
            )}

            {listings.length === 0 ? (
                <p className="text-center text-gray-600 text-lg mt-8">
                    No {statusFilter !== 'all' ? statusFilter : ''} listings found for {isViewingOwnListings ? "you" : targetUserProfile?.displayName || "this user"}.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {listings.map((listing) => (
                        <ListingCard key={listing.id} listing={listing} />
                    ))}
                </div>
            )}
        </div>
    );
}