// src/components/forms/UserProfileForm.tsx
import React, {  useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { SkillTagInput } from './SkillTagInput';
import type { UserProfileFormData } from '@/types/UserProfile'; // Ensure this type is updated as discussed
import { XIcon } from 'lucide-react'; // For the remove image button

// ---
// Zod schema for form validation
// Updated to handle profileImageFile and more flexible profileImageUrl
const formSchema = z.object({
    displayName: z.string().min(2, {
        message: "Display name must be at least 2 characters.",
    }).max(50, {
        message: "Display name must not exceed 50 characters.",
    }),
    location: z.string().min(2, {
        message: "Location must be at least 2 characters.",
    }).max(100, {
        message: "Location must not exceed 100 characters.",
    }),
    bio: z.string().max(500, {
        message: "Bio must not exceed 500 characters.",
    }).optional(),
    skillsOffered: z.array(z.string()).max(10, {
        message: "You can list up to 10 skills offered."
    }),
    needs: z.array(z.string()).max(10, {
        message: "You can list up to 10 needs."
    }),
    // profileImageUrl will now primarily be used for displaying the current image,
    // and can be explicitly set to null by the user if they want to remove it.
    // We'll trust the backend for actual URL validation.
    profileImageUrl: z.string().optional().nullable(), // Allow string or null

    // This field won't be directly bound by `register` for type="file" inputs.
    // We handle it manually. Make it `z.any()` to satisfy Zod, as it's not a direct string/number.
    profileImageFile: z.any().optional().nullable(),
}).refine(data => {
    // Optional: Add custom validation for file type/size if needed
    if (data.profileImageFile instanceof File) {
        if (!data.profileImageFile.type.startsWith('image/')) {
            throw new z.ZodError([{
                code: z.ZodIssueCode.custom,
                path: ['profileImageFile'],
                message: 'Only image files are allowed.',
            }]);
        }
        if (data.profileImageFile.size > 5 * 1024 * 1024) { // 5MB limit
            throw new z.ZodError([{
                code: z.ZodIssueCode.custom,
                path: ['profileImageFile'],
                message: 'Image size must be less than 5MB.',
            }]);
        }
    }
    return true;
}, {
    message: "Invalid file type or size.",
    path: ["profileImageFile"],
});

// ---

interface UserProfileFormProps {
    onSubmit: (data: UserProfileFormData) => void;
    defaultValues?: UserProfileFormData;
    isLoading?: boolean;
    submitButtonText: string;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
    onSubmit,
    defaultValues,
    isLoading,
    submitButtonText,
}) => {
    const form = useForm<z.infer<typeof formSchema>>({ // Use z.infer for type safety from schema
        resolver: zodResolver(formSchema),
        defaultValues: {
            displayName: defaultValues?.displayName || '',
            location: defaultValues?.location || '',
            bio: defaultValues?.bio || '',
            skillsOffered: defaultValues?.skillsOffered || [],
            needs: defaultValues?.needs || [],
            profileImageUrl: defaultValues?.profileImageUrl || null, // Initialize with null or existing URL
            profileImageFile: null, // Always start with no file selected
        },
    });

    // Watchers for image state to handle previews and removal
    const currentProfileImageUrl = form.watch('profileImageUrl'); // This is the URL (either existing or a local blob URL)
    const currentProfileImageFile = form.watch('profileImageFile'); // This is the actual File object

    // Effect to update default values from props (e.g., when profile data finishes loading)
    useEffect(() => {
        if (defaultValues) {
            form.reset({
                displayName: defaultValues.displayName || '',
                location: defaultValues.location || '',
                bio: defaultValues.bio || '',
                skillsOffered: defaultValues.skillsOffered || [],
                needs: defaultValues.needs || [],
                profileImageUrl: defaultValues.profileImageUrl || null,
                profileImageFile: null, // Reset file input when new defaultValues arrive
            });
        }
    }, [defaultValues, form]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            form.setValue('profileImageFile', file, { shouldValidate: true });
            form.setValue('profileImageUrl', URL.createObjectURL(file)); // Create URL for local preview
        } else {
            form.setValue('profileImageFile', null);
            // Don't clear profileImageUrl here, let the remove button handle it
        }
    };

    const handleRemoveImage = () => {
        form.setValue('profileImageFile', null); // Clear any newly selected file
        form.setValue('profileImageUrl', null); // Explicitly set URL to null to signal removal to backend
        // Reset the actual file input element to clear its visual state
        const fileInput = document.getElementById('profileImageUpload') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSubmitAndCombine = (formData: z.infer<typeof formSchema>) => {
        // Pass the combined data to the parent onSubmit
        onSubmit({
            ...formData,
            profileImageUrl: formData.profileImageUrl, // This will be the actual URL or null
            profileImageFile: currentProfileImageFile, // Pass the File object
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitAndCombine)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your display name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Profile Picture Upload Section */}
                <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex items-center space-x-4">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                            {currentProfileImageUrl ? (
                                <img
                                    src={currentProfileImageUrl}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-gray-400 text-xs text-center p-2">No Image</span>
                            )}
                            {(currentProfileImageUrl || currentProfileImageFile) && ( // Show remove if either URL or new file exists
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-0 right-0 w-6 h-6 rounded-full"
                                    onClick={handleRemoveImage}
                                >
                                    <XIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex-1">
                            <FormControl>
                                <Input
                                    id="profileImageUpload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="file:text-sm file:font-medium"
                                />
                            </FormControl>
                        </div>
                    </div>
                    {form.formState.errors.profileImageFile && (
                        <FormMessage>{form.formState.errors.profileImageFile.message}</FormMessage>
                    )}
                </FormItem>

                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Singapore, Central Area" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Tell us about yourself..." {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="skillsOffered"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Skills You Offer</FormLabel>
                            <FormControl>
                                <SkillTagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="e.g., Web Development, Guitar Lessons"
                                    maxTags={10}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="needs"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Skills/Items You Need</FormLabel>
                            <FormControl>
                                <SkillTagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="e.g., Photography Services, Gardening Tools"
                                    maxTags={10}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : submitButtonText}
                </Button>
            </form>
        </Form>
    );
};