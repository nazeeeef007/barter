// src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/HomePage";
import CreateListingPage from "./pages/CreateListingPage";
import BrowseListingsPage from "./pages/BrowseListingPage";
import ListingDetailPage from "./pages/ListingDetailPage";

import MyProfilePage from "./pages/MyProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import ProfileSetupPage from "./pages/ProfileSetupPage";

import MyListingsPage from "./pages/MyListingsPage";
import EditPostPage from "./pages/EditPostPage";
import LeaveReviewPage from "./pages/LeaveReviewPage";

// NEW CHAT IMPORTS
import ChatListPage from "./pages/ChatListPage";
import ChatRoomPage from "./pages/ChatRoomPage";

import MainLayout from "./components/layout/MainLayout";

// Placeholder pages
const SettingsPage = () => <h1 className="text-3xl font-bold p-8">Settings Page</h1>;
const PrivacyPolicyPage = () => <h1 className="text-3xl font-bold p-8">Privacy Policy</h1>;
const TermsOfServicePage = () => <h1 className="text-3xl font-bold p-8">Terms of Service</h1>;
const AboutUsPage = () => <h1 className="text-3xl font-bold p-8">About Us Page</h1>;
const ContactPage = () => <h1 className="text-3xl font-bold p-8">Contact Page</h1>;

function App() {
  const { user, loading, hasProfile } = useAuth();
  const location = useLocation();

  if (loading || hasProfile == null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <p>Loading app...</p>
      </div>
    );
  }

  // Redirect to profile setup if logged in but no profile
  // Prevent redirect loop on login/signup/profile/setup pages
  const isOnAuthOrSetupPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/profile/setup";

  if (user && !hasProfile && !isOnAuthOrSetupPage) {
    return <Navigate to="/profile/setup" replace />;
  }

  return (
    <>
      <Routes>
        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" replace /> : <SignupPage />}
        />

        {/* Public Routes */}
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/browse-listings" element={<MainLayout><BrowseListingsPage /></MainLayout>} />
        <Route path="/listings/:id" element={<MainLayout><ListingDetailPage /></MainLayout>} />
        <Route path="/privacy-policy" element={<MainLayout><PrivacyPolicyPage /></MainLayout>} />
        <Route path="/terms-of-service" element={<MainLayout><TermsOfServicePage /></MainLayout>} />
        <Route path="/about" element={<MainLayout><AboutUsPage /></MainLayout>} />
        <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />

        {/* Protected Routes */}
        <Route
          path="/my-exchanges"
          element={user ? <MainLayout><MyListingsPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/my-listings"
          element={user ? <MainLayout><MyListingsPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={user ? <MainLayout><SettingsPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/create-listing"
          element={user ? <MainLayout><CreateListingPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/edit-post/:id"
          element={user ? <MainLayout><EditPostPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/leave-review/:toUserFirebaseUid/:barterPostId?"
          element={user ? <MainLayout><LeaveReviewPage /></MainLayout> : <Navigate to="/login" replace />}
        />

        {/* NEW CHAT ROUTES */}
        <Route
          path="/chats"
          element={user ? <MainLayout><ChatListPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/chats/:chatId"
          element={user ? <MainLayout><ChatRoomPage /></MainLayout> : <Navigate to="/login" replace />}
        />

        {/* Profile Routes */}
        <Route
          path="/profile"
          element={user ? <MainLayout><MyProfilePage /></MainLayout> : <Navigate to="/login" replace />}
        />
        {/* Public view of other users' profiles */}
        <Route
          path="/profile/:userId"
          element={<MainLayout><MyProfilePage /></MainLayout>}
        />
        <Route
          path="/profile/edit"
          element={user ? <MainLayout><EditProfilePage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/setup"
          element={user ? <MainLayout><ProfileSetupPage /></MainLayout> : <Navigate to="/login" replace />}
        />

        {/* Catch all - Redirects to home if no other route matches */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
