// src/pages/EditProfilePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { UserProfileForm } from '@/components/forms/UserProfileForm';
import type { UserProfile, UserProfileFormData } from '@/types/UserProfile';
import { toast } from 'sonner';
const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function EditProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [profileData, setProfileData] = useState<UserProfileFormData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchUserProfile = useCallback(async () => {
        if (authLoading) return; // Wait until auth state is determined

        if (!user) {
            setIsLoadingProfile(false);
            setError("Please log in to edit your profile.");
            toast.error("Authentication Required", {
                description: "Please log in to edit your profile.",
            });
            navigate('/login');
            return;
        }

        setIsLoadingProfile(true);
        setError(null);
        try {
            const idToken = await user.getIdToken(true);
            const response = await axios.get<UserProfile>(
                `${BASE_URL}/users/${user.uid}`,
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                }
            );

            const fetchedProfile: UserProfile = response.data;
            setProfileData({
                displayName: fetchedProfile.displayName,
                location: fetchedProfile.location,
                bio: fetchedProfile.bio || '',
                skillsOffered: fetchedProfile.skillsOffered || [],
                needs: fetchedProfile.needs || [],
                profileImageUrl: fetchedProfile.profileImageUrl || null, // Ensure it's null if not present
                profileImageFile: null, // No file initially
            });
        } catch (err) {
            console.error('Error fetching user profile for editing:', err);
            setError('Failed to load profile. Please try again.');
            toast.error("Profile Load Failed", {
                description: "Could not load your profile for editing.",
            });
        } finally {
            setIsLoadingProfile(false);
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]); // Depend on the memoized fetchUserProfile

    const handleSubmit = async (data: UserProfileFormData) => {
        if (!user) {
            toast.error("Authentication Required", {
                description: "Please log in to save your profile.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const idToken = await user.getIdToken(true);

            const formData = new FormData();

            // Prepare the JSON part of the user data
            const userJson: Partial<UserProfile> = {
                displayName: data.displayName,
                location: data.location,
                bio: data.bio,
                skillsOffered: data.skillsOffered,
                needs: data.needs,
            };

            // Handle profileImageUrl: Send 'null' string if explicitly cleared, otherwise keep current or empty
            if (data.profileImageUrl === null) {
                userJson.profileImageUrl = 'null'; // Signal to backend to remove existing image
            } else if (data.profileImageUrl) {
                userJson.profileImageUrl = data.profileImageUrl; // Keep existing image URL
            } else {
                userJson.profileImageUrl = null; // No image existed, and no new image was uploaded
            }


            // CRITICAL FIX: Append the JSON data as a Blob with 'application/json' content type
            formData.append(
                'user',
                new Blob([JSON.stringify(userJson)], { type: 'application/json' })
            );

            // Append image file if provided
            if (data.profileImageFile) {
                formData.append('image', data.profileImageFile);
            }

            await axios.put(`${BASE_URL}/users/${user.uid}`, formData, {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    // IMPORTANT: DO NOT set 'Content-Type': 'multipart/form-data' manually here.
                    // Axios automatically sets it correctly with the boundary when FormData is used.
                    // Setting it manually can cause issues.
                },
            });

            toast.success("Profile Updated!", {
                description: "Your profile has been successfully saved.",
            });
            navigate('/my-profile');
        } catch (error) {
            console.error('Error updating profile:', error);
            // More granular error handling for axios
            if (axios.isAxiosError(error) && error.response) {
                console.error("Backend error response:", error.response.data);
                toast.error("Profile Update Failed", {
                    description: `Error: ${typeof error.response.data === 'string' ? error.response.data : error.response.data?.message || "Unknown error"}`,
                });
            } else {
                toast.error("Profile Update Failed", {
                    description: "There was an error updating your profile. Please try again.",
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingProfile || authLoading) {
        return <div className="flex justify-center items-center h-screen text-lg text-gray-600">Loading profile...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500 text-lg">{error}</div>;
    }

    if (!profileData) {
        return <div className="container mx-auto p-4 text-center text-gray-600 text-lg">No profile data found. Please set up your profile.</div>;
    }

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-center mb-8">Edit Your Profile</h1>
            <UserProfileForm
                onSubmit={handleSubmit}
                defaultValues={profileData}
                isLoading={isSubmitting}
                submitButtonText="Save Changes"
            />
        </div>
    );
}