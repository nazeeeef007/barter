// src/components/navigation/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Adjust path if necessary
import { auth as firebaseAuth } from '@/firebase'; // Adjust path if necessary
import { signOut } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(firebaseAuth);
      // Optional: Add a toast notification for successful logout
      navigate('/login'); // Redirect to login page
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      // Optional: Add a toast notification for logout error
      alert('Failed to sign out: ' + error.message);
    }
  };

  return (
    <nav className="bg-background border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Site Logo/Name */}
        <Link to="/" className="text-2xl font-bold text-primary">
          Barter
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex space-x-6">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/browse" className="text-foreground hover:text-primary transition-colors">Browse Listings</Link>
          {user && ( // Show these links only if logged in
            <>
              <Link to="/my-exchanges" className="text-foreground hover:text-primary transition-colors">My Listings</Link>
              <Link to="/profile" className="text-foreground hover:text-primary transition-colors">My Profile</Link>
            </>
          )}
        </div>

        {/* Auth Buttons / User Menu */}
        <div className="flex items-center space-x-4">
          <Link to="/create-listing">
            <Button variant="default">Post a Listing</Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>
                      {user.displayName ? user.displayName.charAt(0) : (user.email ? user.email.charAt(0) : 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex space-x-2">
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;