// pages/CreateListingPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app, auth } from '../firebase'; // Import 'app' and 'auth' from your firebase.ts
import axios from 'axios';

// Shadcn UI Imports - Adjust paths if necessary based on your project
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Corrected for Shadcn
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Import toast directly from sonner
const BASE_URL = import.meta.env.VITE_BASE_URL;

// --- Placeholder Components (You'll replace these with real implementations) ---

// Placeholder SkillTagInput component
interface SkillTagInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
}

const SkillTagInput: React.FC<SkillTagInputProps> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      const newSkill = inputValue.trim();
      if (!value.includes(newSkill)) {
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
        placeholder="Add skills (e.g., 'Web Development', 'Guitar Lessons')"
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
    </div>
  );
};

// Placeholder DatePicker component
// This is a very basic placeholder using HTML date inputs.
// For a real-world app, you'd integrate a library like react-day-picker, react-datepicker, or similar.
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
    const newDate = dateString ? new Date(dateString) : new Date(); // Handle empty string
    const newRanges = [...selectedRanges];
    if (newRanges[index]) {
      if (type === 'start') {
        newRanges[index].start = newDate;
      } else {
        newRanges[index].end = newDate;
      }
    }
    onChange(newRanges);
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
            value={range.start.toISOString().split('T')[0]}
            onChange={(e) => handleDateChange(e.target.value, 'start', index)}
            className="flex-1"
          />
          <span>to</span>
          <Input
            type="date"
            value={range.end.toISOString().split('T')[0]}
            onChange={(e) => handleDateChange(e.target.value, 'end', index)}
            className="flex-1"
          />
          <Button type="button" variant="destructive" size="icon" onClick={() => removeDateRange(index)}>
            &times;
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
  image: typeof window === 'undefined' ? z.any().optional() : z.instanceof(File).optional(), // Client-side check for File type
});

type ListingFormData = z.infer<typeof listingSchema>;

const CreateListingPage: React.FC = () => {
  // Initialize storage here using 'app' from your firebase.ts
  const storage = getStorage(app);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      image: undefined,
    },
  });

  const watchedImage = watch('image');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        toast.error("You must be logged in to create a listing."); // Sonner toast
      }
    });
    return () => unsubscribe();
  }, [auth]); // No 'toast' dependency needed for sonner

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setValue('image', e.target.files[0]);
    }
  };

  const uploadImageToFirebase = async (imageFile: File): Promise<string> => {
    if (!currentUser || !storage) {
      throw new Error("Firebase user or storage not initialized for image upload.");
    }

    const storageRef = ref(storage, `listing_images/${currentUser.uid}/${imageFile.name}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Image upload failed:', error);
          toast.error("Failed to upload image. Please try again."); // Sonner toast
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

 

  const onSubmit = async (data: ListingFormData) => {
  if (!currentUser) {
    toast.error("You must be logged in to create a listing.");
    return;
  }

  setLoading(true);

  try {
    const idToken = await currentUser.getIdToken(true);

    const formData = new FormData();
    
    // Append the JSON post data as a Blob (required because your backend expects @RequestPart("post"))
    const postJson = JSON.stringify({
      title: data.title,
      description: data.description,
      type: data.type,
      tags: data.skills,
      preferredExchange: data.preferredExchange,
      location: data.location,
      availability: data.availability
        ? data.availability.map((range) => ({
            start: range.start.toISOString(),
            end: range.end.toISOString(),
          }))
        : [],
    });
    console.log(postJson);
    formData.append(
      'post',
      new Blob([postJson], { type: 'application/json' })
    );

    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await axios.post(`${BASE_URL}/posts`, formData, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    toast.success("Listing created successfully!");
    reset();
  } catch (error) {
    console.error(error);
    toast.error("Failed to create listing.");
  } finally {
    setLoading(false);
  }
};


  if (currentUser === null) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Create New Listing</h1>
        <p className="text-lg text-gray-600">Please log in to create a listing.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-extrabold text-center mb-8">Create New Listing</h1>
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
              <SkillTagInput value={field.value} onChange={field.onChange} />
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

        {/* Image Upload */}
        <div>
          <Label htmlFor="image" className="text-lg">Upload Image (Optional)</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file:text-primary file:bg-primary-foreground hover:file:bg-accent hover:file:text-accent-foreground"
          />
          {watchedImage && <p className="text-sm text-gray-500 mt-1">Selected: {watchedImage.name}</p>}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-sm text-primary mt-1">{uploadProgress.toFixed(0)}% uploaded</p>
            </div>
          )}
          {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image.message}</p>}
        </div>

        <Button type="submit" disabled={loading} className="w-full text-lg py-3">
          {loading ? 'Creating Listing...' : 'Create Listing'}
        </Button>
      </form>
    </div>
  );
};

export default CreateListingPage;