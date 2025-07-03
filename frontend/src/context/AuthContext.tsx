// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import axios from "axios";
import { toast } from "sonner";
const BASE_URL = import.meta.env.VITE_BASE_URL;
// Define FirebaseUser type
interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  hasProfile: boolean | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setHasProfile(false);
        setLoading(false);
        return;
      }

      setUser(currentUser as FirebaseUser);

      try {
        const idToken = await currentUser.getIdToken();
        const res = await axios.get(
          `${BASE_URL}/users/${currentUser.uid}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );
        setHasProfile(!!res.data);
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setHasProfile(false);
        } else {
          console.error("Error checking profile:", err);
          setHasProfile(false);
          toast.error("Error loading user profile status.", {
            description:
              "Please refresh or contact support if the issue persists.",
          });
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      setUser(null);
      setHasProfile(false);
      toast.info("You have been signed out.");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Sign out failed.", {
        description: "There was an issue signing you out. Please try again.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
