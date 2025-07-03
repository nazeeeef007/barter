// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth"; // <--- REMOVE FirebaseError FROM HERE
import { FirebaseError } from "firebase/app"; // <--- ADD THIS IMPORT
import { auth as firebaseAuth } from "../firebase"; // Import the auth instance

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
import { Label } from "@/components/ui/label";

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
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null); // State for Firebase errors
  const [isSubmitting, setIsSubmitting] = useState(false); // For loading state on button

  // 1. Define your form with React Hook Form and Zod
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 2. Define a submit handler
  const onSubmit = async (values: LoginFormValues) => {
    setError(null); // Clear previous errors
    setIsSubmitting(true);

    try {
      if (!firebaseAuth) {
        throw new Error("Firebase Auth instance is not available.");
      }
      await signInWithEmailAndPassword(firebaseAuth, values.email, values.password);
      // If successful, onAuthStateChanged in AuthContext will update user state
      // and App.tsx will redirect to "/"
      // navigate("/"); // No need to manually navigate here due to AuthContext listener
    } catch (err: any) {
      if (err instanceof FirebaseError) { // This `FirebaseError` will now be correctly typed
        switch (err.code) {
          case "auth/invalid-email":
          case "auth/user-not-found":
          case "auth/wrong-password": // Use "auth/invalid-credential" in newer Firebase SDKs
          case "auth/invalid-credential":
            setError("Invalid email or password.");
            break;
          case "auth/user-disabled":
            setError("Your account has been disabled.");
            break;
          case "auth/too-many-requests":
            setError("Too many login attempts. Please try again later.");
            break;
          default:
            setError("Login failed: " + err.message);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error("Login error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login to your account</CardTitle>
          <CardDescription>
            Enter your email and password below to log in.
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

              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="underline hover:text-primary">
              Sign up
            </Link>
          </div>
          {/* Optional: Add a "Forgot Password" link */}
          {/* <Link to="/forgot-password" className="text-sm underline hover:text-primary">
            Forgot Password?
          </Link> */}
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage;