import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import type { BarterPost } from '@/types/BarterPost'; // Ensure this type is consistent with your backend

// React Hook Form and Zod for validation
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Shadcn UI Imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { XIcon } from 'lucide-react'; // For the remove image button
const BASE_URL = import.meta.env.VITE_BASE_URL;
// Re-using placeholder components from CreateListingPage.tsx
// It's highly recommended to move these into a common components folder (e.g., `src/components/forms/`)
// if they are used in multiple places.
// --- Placeholder Components ---

interface SkillTagInputProps {
    value: string[];
    onChange: (skills: string[]) => void;
    placeholder?: string; // Added placeholder prop
    maxTags?: number; // Added maxTags prop
}

const SkillTagInput: React.FC<SkillTagInputProps> = ({ value, onChange, placeholder, maxTags }) => {
    const [inputValue, setInputValue] = useState('');

    const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim() !== '') {
            e.preventDefault();
            const newSkill = inputValue.trim();
            if (!value.includes(newSkill) && (!maxTags || value.length < maxTags)) {
                onChange([...value, newSkill]);
            }
            setInputValue('');
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        onChange(value.filter((skill) => skill !== skillToRemove));
    };

    return (
        <div>
            <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder={placeholder || "Add tags (e.g., 'Programming', 'Art')"}
            />
            <div className="mt-2 flex flex-wrap gap-2">
                {value.map((skill, index) => (
                    <span
                        key={index}
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm flex items-center"
                    >
                        {skill}
                        <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-2 text-destructive hover:text-destructive-foreground focus:outline-none"
                        >
                            &times;
                        </button>
                    </span>
                ))}
            </div>
            {maxTags && value.length >= maxTags && (
                <p className="text-sm text-muted-foreground mt-1">You can add up to {maxTags} tags.</p>
            )}
        </div>
    );
};

interface DateRange {
    start: Date;
    end: Date;
}

interface DatePickerProps {
    selectedRanges: DateRange[];
    onChange: (ranges: DateRange[]) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedRanges, onChange }) => {
    const handleDateChange = (dateString: string, type: 'start' | 'end', index: number) => {
        const newDate = dateString ? new Date(dateString) : new Date();
        const newRanges = [...selectedRanges];

        // Ensure the date object is valid before assignment
        if (isNaN(newDate.getTime())) {
            // Handle invalid date input gracefully, maybe don't update or show an error
            return;
        }

        if (newRanges[index]) {
            if (type === 'start') {
                newRanges[index].start = newDate;
            } else {
                newRanges[index].end = newDate;
            }
            onChange(newRanges);
        }
    };

    const addDateRange = () => {
        onChange([...selectedRanges, { start: new Date(), end: new Date() }]);
    };

    const removeDateRange = (indexToRemove: number) => {
        onChange(selectedRanges.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="space-y-3">
            {selectedRanges.map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={range.start instanceof Date && !isNaN(range.start.getTime()) ? range.start.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleDateChange(e.target.value, 'start', index)}
                        className="flex-1"
                    />
                    <span>to</span>
                    <Input
                        type="date"
                        value={range.end instanceof Date && !isNaN(range.end.getTime()) ? range.end.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleDateChange(e.target.value, 'end', index)}
                        className="flex-1"
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeDateRange(index)}>
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button type="button" onClick={addDateRange} variant="outline">
                Add Availability Period
            </Button>
        </div>
    );
};

// --- End Placeholder Components ---

// Zod Schema for form validation
const listingSchema = z.object({
    title: z.string().min(3, 'Title is required and must be at least 3 characters.'),
    description: z.string().min(10, 'Description is required and must be at least 10 characters.'),
    type: z.enum(['offer', 'request'], { message: 'Type must be either "offer" or "request".' }),
    skills: z.array(z.string()).min(1, 'At least one skill is required.'),
    preferredExchange: z.string().optional(),
    availability: z.array(z.object({
        start: z.date(),
        end: z.date(),
    })).optional(),
    location: z.string().min(3, 'Location is required.'),
    // newImageFile is for the File object selected by the user
    newImageFile: z.instanceof(File)
        .optional()
        .nullable() // Allow it to be null
        .refine(file => !file || file.type.startsWith('image/'), {
            message: 'Only image files are allowed.',
        })
        .refine(file => !file || file.size <= 5 * 1024 * 1024, { // 5MB limit
            message: 'Image size must be less than 5MB.',
        }),
    // imageUrl is for the existing image URL fetched from the backend or null if removed
    imageUrl: z.string().nullable().optional(),
    status: z.enum(['open', 'closed'], { message: 'Status must be either "open" or "closed".' }),
});

type ListingFormData = z.infer<typeof listingSchema>;

export default function EditPostPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const {
        handleSubmit,
        control,
        register,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<ListingFormData>({
        resolver: zodResolver(listingSchema),
        defaultValues: {
            title: '',
            description: '',
            type: 'offer',
            skills: [],
            preferredExchange: '',
            availability: [],
            location: '',
            newImageFile: null, // Initialize as null
            imageUrl: null, // Initialize as null
            status: 'open',
        },
    });

    const watchedNewImageFile = watch('newImageFile');
    const watchedImageUrl = watch('imageUrl'); // Watch the existing image URL

    // Effect to create a preview URL for the new image file
    const [newImagePreviewUrl, setNewImagePreviewUrl] = useState<string | null>(null);
    useEffect(() => {
        if (watchedNewImageFile instanceof File) {
            const url = URL.createObjectURL(watchedNewImageFile);
            setNewImagePreviewUrl(url);
            return () => URL.revokeObjectURL(url); // Clean up the object URL
        } else {
            setNewImagePreviewUrl(null);
        }
    }, [watchedNewImageFile]);

    // Fetch the existing post data
    const fetchPost = useCallback(async () => {
        if (authLoading || !user || !id) {
            if (!user && !authLoading) {
                toast.error("You must be logged in to edit posts.");
                navigate('/login');
            } else if (!id) {
                setError("No post ID provided.");
                setIsLoading(false);
            }
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const idToken = await user.getIdToken(true);
            const response = await axios.get<BarterPost>(
                `${BASE_URL}/posts/${id}`,
                {
                    headers: { Authorization: `Bearer ${idToken}` }
                }
            );

            const fetchedPost = response.data;

            if (fetchedPost.userFirebaseUid !== user.uid) {
                toast.error("You are not authorized to edit this post.");
                navigate('/my-listings');
                return;
            }

            // Set form values with fetched data
            reset({
                title: fetchedPost.title || '',
                description: fetchedPost.description || '',
                type: fetchedPost.type,
                skills: fetchedPost.tags || [],
                preferredExchange: fetchedPost.preferredExchange || '',
                location: fetchedPost.location || '',
                availability: fetchedPost.availability?.map(a => ({
                    start: new Date(a.start),
                    end: new Date(a.end)
                })) || [],
                imageUrl: fetchedPost.imageUrl || null, // Set existing image URL
                newImageFile: null, // Ensure new image file is null initially
                status: fetchedPost.status,
            });

        } catch (err) {
            console.error('Error fetching post for editing:', err);
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 404) {
                    setError('Post not found.');
                } else if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You are not authorized to view this post or your session has expired.');
                    toast.error("Authorization error. Please log in again.");
                    navigate('/login');
                } else {
                    setError('Failed to load post. Please try again.');
                }
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [id, user, authLoading, navigate, reset]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setValue('newImageFile', e.target.files[0], { shouldValidate: true });
            // Clear existing image URL preview if a new file is selected
            // The actual imageUrl field will be handled on submit to determine if old one is kept/removed
            setValue('imageUrl', null);
        } else {
            setValue('newImageFile', null);
        }
    };

    const handleRemoveCurrentOrNewImage = () => {
        // Clear both the existing image URL and any newly selected file
        setValue('imageUrl', null); // Signal to backend to remove the current image
        setValue('newImageFile', null); // Clear any newly chosen file
        setNewImagePreviewUrl(null); // Clear the local preview
        // Reset the actual file input element to clear its visual state
        const fileInput = document.getElementById('newImage') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const onSubmit = async (data: ListingFormData) => {
        if (!user || !id) {
            toast.error("Authentication error or post ID missing.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const idToken = await user.getIdToken(true);

            const formDataToSend = new FormData();

            const postJson: Partial<BarterPost> = {
                title: data.title,
                description: data.description,
                type: data.type,
                tags: data.skills, // Map 'skills' back to 'tags' for the backend
                preferredExchange: data.preferredExchange,
                location: data.location,
                availability: data.availability
                    ? data.availability.map((range) => ({
                        start: range.start.toISOString(),
                        end: range.end.toISOString(),
                    }))
                    : [],
                status: data.status,
                // Do NOT include imageUrl here if it's being handled by a file upload
                // or if it's explicitly null to signal removal.
                // We'll add it back only if it's an *existing* URL that remains unchanged.
            };

            // Handle image logic:
            if (data.newImageFile) {
                // If a new image file is selected, append it. The backend expects 'image'.
                formDataToSend.append('image', data.newImageFile);
                // Also, if a new image is provided, we tell the backend to ignore any existing URL for this request
                // or simply don't set imageUrl in postJson to avoid conflicts.
                // The backend should prioritize the 'image' part if present.
            } else if (data.imageUrl === null && watchedImageUrl !== null) {
                // User explicitly removed the existing image, and no new file was chosen.
                // Signal to the backend to delete the old image by sending "null" string.
                postJson.imageUrl = 'null';
            } else if (data.imageUrl) {
                // No new image, and existing image URL is still present (not removed).
                // Send the existing image URL to the backend to keep it.
                postJson.imageUrl = data.imageUrl;
            } else {
                // No image existed initially, and no new image was uploaded.
                // Ensure imageUrl is null in the payload.
                postJson.imageUrl = null;
            }

            // CRITICAL FIX: Append the JSON data as a Blob with 'application/json' content type
            formDataToSend.append(
                'post',
                new Blob([JSON.stringify(postJson)], { type: 'application/json' })
            );

            await axios.put(
                `${BASE_URL}/posts/${id}`,
                formDataToSend,
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                        // 'Content-Type': 'multipart/form-data' is NOT needed here.
                        // Axios automatically sets it correctly with the boundary for FormData.
                        // Setting it manually can cause issues.
                    },
                }
            );

            toast.success('Post updated successfully!');
            navigate(`/my-listings`);
        } catch (err) {
            console.error('Error updating post:', err);
            if (axios.isAxiosError(err) && err.response) {
                console.error("Backend error response:", err.response.data); // Log backend response
                if (err.response.status === 404) {
                    setError('Post not found.');
                    toast.error('Post not found.');
                } else if (err.response.status === 403) {
                    setError('You are not authorized to update this post.');
                    toast.error('Not authorized to update this post.');
                } else if (err.response.status === 400) {
                    // Check if response data is a string or object for message extraction
                    const errorMessage = typeof err.response.data === 'string' ? err.response.data : err.response.data?.message || 'Bad Request.';
                    setError(`Bad Request: ${errorMessage}`);
                    toast.error(`Bad Request: ${errorMessage}`);
                } else {
                    setError('Failed to update post. Please try again.');
                    toast.error('Failed to update post.');
                }
            } else {
                setError('An unexpected error occurred while updating the post.');
                toast.error('An unexpected error occurred.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayImageSrc = newImagePreviewUrl || watchedImageUrl;

    if (isLoading) {
        return <div className="container mx-auto p-8 text-center text-lg text-gray-600">Loading post data...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-8 text-center text-red-500 text-lg">{error}</div>;
    }

    if (!user && !authLoading) {
        return (
            <div className="container mx-auto p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Edit Listing</h1>
                <p className="text-lg text-gray-600">Please log in to edit a listing.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-lg my-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Edit Barter Post</h1>
            <Separator className="my-6" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <div>
                    <Label htmlFor="title" className="text-lg">Title</Label>
                    <Input id="title" {...register('title')} placeholder="e.g., 'Experienced Photographer for Events'" />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                {/* Description */}
                <div>
                    <Label htmlFor="description" className="text-lg">Description</Label>
                    <Textarea id="description" {...register('description')} rows={5} placeholder="Provide a detailed description of your skill or service, what you offer, or what you need." />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>

                {/* Type (Offer/Request) */}
                <div>
                    <Label className="text-lg">Type of Listing</Label>
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6 mt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="offer" id="offer" />
                                    <Label htmlFor="offer" className="text-base">Offer a Skill/Service</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="request" id="request" />
                                    <Label htmlFor="request" className="text-base">Request a Skill/Service</Label>
                                </div>
                            </RadioGroup>
                        )}
                    />
                    {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                </div>

                {/* Skills Offered/Needed */}
                <div>
                    <Label htmlFor="skills" className="text-lg">Skills/Tags</Label>
                    <Controller
                        name="skills"
                        control={control}
                        render={({ field }) => (
                            <SkillTagInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Add skills (e.g., 'Web Development', 'Guitar Lessons')"
                                maxTags={10} // Optional: set a max limit
                            />
                        )}
                    />
                    {errors.skills && <p className="text-red-500 text-sm mt-1">{errors.skills.message}</p>}
                </div>

                {/* Preferred Exchange */}
                <div>
                    <Label htmlFor="preferredExchange" className="text-lg">Preferred Exchange (Optional)</Label>
                    <Textarea id="preferredExchange" {...register('preferredExchange')} rows={3} placeholder="e.g., 'Looking for someone to teach me guitar in exchange for web development help.', 'Open to various offers.'" />
                    {errors.preferredExchange && <p className="text-red-500 text-sm mt-1">{errors.preferredExchange.message}</p>}
                </div>

                {/* Availability */}
                <div>
                    <Label htmlFor="availability" className="text-lg">Availability Periods (Optional)</Label>
                    <Controller
                        name="availability"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                selectedRanges={field.value || []}
                                onChange={(ranges: { start: Date; end: Date }[]) => field.onChange(ranges)}
                            />
                        )}
                    />
                    {errors.availability && <p className="text-red-500 text-sm mt-1">{errors.availability.message}</p>}
                </div>

                {/* Location */}
                <div>
                    <Label htmlFor="location" className="text-lg">Location</Label>
                    <Input id="location" {...register('location')} placeholder="e.g., 'Singapore, Bishan', 'Online', 'Remote'" />
                    {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                </div>

                {/* Image Handling */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="newImage" className="text-lg">Image</Label>
                    {(displayImageSrc) ? (
                        <div className="relative w-48 h-32 mb-2 border rounded-md overflow-hidden">
                            <img src={displayImageSrc} alt="Post" className="w-full h-full object-cover" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 rounded-full p-0.5 h-6 w-6 flex items-center justify-center"
                                onClick={handleRemoveCurrentOrNewImage}
                                title="Remove current image"
                            >
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mb-2">No image currently selected.</p>
                    )}

                    <Label htmlFor="newImage" className="text-md mt-2">Upload New Image (Optional)</Label>
                    <Input
                        id="newImage"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="file:text-primary file:bg-primary-foreground hover:file:bg-accent hover:file:text-accent-foreground"
                    />
                    {errors.newImageFile && <p className="text-red-500 text-sm mt-1">{errors.newImageFile.message}</p>}
                </div>

                {/* Status */}
                <div>
                    <Label htmlFor="status" className="text-lg">Status</Label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open (Actively seeking exchange)</SelectItem>
                                    <SelectItem value="closed">Closed (No longer seeking exchange)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full text-lg py-3">
                    {isSubmitting ? 'Updating Listing...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    );
}