import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner"; // Import sonner

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Label is not used directly, but usually good to have

// For form validation with react-hook-form and zod
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the schema for your form validation
const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Path for the error message
});

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupPage() {
  const navigate = useNavigate();
  // const [error, setError] = useState<string | null>(null); // No longer needed if using sonner for all errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Define your form with React Hook Form and Zod
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 2. Define a submit handler
  const onSubmit = async (values: SignupFormValues) => {
    // setError(null); // Clear previous errors, handled by new toast
    setIsSubmitting(true);

    try {
      if (!firebaseAuth) {
        throw new Error("Firebase Auth instance is not available.");
      }
      await createUserWithEmailAndPassword(firebaseAuth, values.email, values.password);
      
      // If successful, onAuthStateChanged in AuthContext will update user state
      // The App.tsx top-level logic will then redirect to /profile/setup if hasProfile is false
      toast.success("Account created successfully!", {
        description: "You are now logged in. Please set up your profile.",
        duration: 3000,
      });
      // Explicitly navigate to profile setup. The App.tsx redirect will also handle it,
      // but this provides immediate feedback and clear intent.
      navigate("/profile/setup");
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/email-already-in-use":
            errorMessage = "This email address is already in use.";
            break;
          case "auth/weak-password":
            errorMessage = "Password is too weak. Please use a stronger password.";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address.";
            break;
          case "auth/operation-not-allowed":
            errorMessage = "Email/password sign-up is disabled. Please enable it in Firebase console.";
            break;
          default:
            errorMessage = "Sign up failed: " + err.message;
        }
      }
      toast.error("Sign Up Failed", {
        description: errorMessage,
        duration: 5000,
      });
      console.error("Signup error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your email and password below to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Error display handled by sonner now
              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
              */}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="underline hover:text-primary">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SignupPage;