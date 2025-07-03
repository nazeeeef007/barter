import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { UserProfileForm } from '@/components/forms/UserProfileForm';
import type { UserProfileFormData } from '@/types/UserProfile';
import { toast } from 'sonner';
const BASE_URL = import.meta.env.VITE_BASE_URL;
export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserProfileFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to set up your profile.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await user.getIdToken(true);

      // Build FormData for multipart/form-data request
      const formData = new FormData();
      const userBlob = new Blob([
        JSON.stringify({
          ...data,
          firebaseUid: user.uid,
          email: user.email,
        })
      ], { type: 'application/json' });

      formData.append("user", userBlob);

      // Optional: If image handling is added to form in the future:
      // if (data.profileImageFile) {
      //   formData.append("image", data.profileImageFile);
      // }

      await axios.post(`${BASE_URL}/users`, formData, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          // DO NOT manually set 'Content-Type'; let the browser set it including boundary
        },
      });

      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully set up.",
      });
      navigate('/my-profile');
    } catch (error) {
      console.error('Error setting up profile:', error);
      toast({
        title: "Profile Setup Failed",
        description: "There was an error setting up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading authentication state...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-8">Set Up Your Profile</h1>
      <UserProfileForm
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        submitButtonText="Create Profile"
      />
    </div>
  );
}
