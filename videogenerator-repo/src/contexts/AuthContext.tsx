import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  guestSessionId: string | null;
  loading: boolean;
  lastActivity: number;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  migrateGuestData: () => Promise<void>;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_SESSION_KEY = 'guest_session_id';
const LAST_ACTIVITY_KEY = 'last_activity';
const IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours
const WARNING_BEFORE_LOGOUT_MS = 5 * 60 * 1000; // 5 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [warningShown, setWarningShown] = useState(false);
  const { toast } = useToast();

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    setWarningShown(false);
  }, []);

  // Initialize guest session
  const continueAsGuest = useCallback(() => {
    const guestId = crypto.randomUUID();
    setGuestSessionId(guestId);
    setIsGuest(true);
    localStorage.setItem(GUEST_SESSION_KEY, guestId);
    updateActivity();
    toast({
      title: "Guest Mode",
      description: "You're using guest mode. Log in to save your generations.",
    });
  }, [toast, updateActivity]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      // Use production URL if available, otherwise fall back to current origin
      const productionUrl = 'https://aicontentcreator.adventurousinvestorhub.com';
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isDevelopment ? window.location.origin : productionUrl;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectUrl}/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Failed to sign in with Google",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setIsGuest(false);
      setGuestSessionId(null);
      localStorage.removeItem(GUEST_SESSION_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Sign Out Failed",
        description: error instanceof Error ? error.message : "Failed to sign out",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Migrate guest data to authenticated user
  const migrateGuestData = useCallback(async () => {
    const guestId = localStorage.getItem(GUEST_SESSION_KEY);
    if (!guestId || !session) return;

    // Guest generations are not saved to database, so no migration needed
    // Just clean up the guest session ID
    localStorage.removeItem(GUEST_SESSION_KEY);
    setGuestSessionId(null);
  }, [session]);

  // Check for idle timeout
  useEffect(() => {
    if (!session) return;

    const checkIdleTimeout = () => {
      const now = Date.now();
      const lastActivityTime = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || now.toString());
      const timeSinceActivity = now - lastActivityTime;

      // Show warning 5 minutes before logout
      if (timeSinceActivity >= IDLE_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS && 
          timeSinceActivity < IDLE_TIMEOUT_MS && 
          !warningShown) {
        setWarningShown(true);
        toast({
          title: "Session Expiring Soon",
          description: "You'll be logged out in 5 minutes due to inactivity.",
          action: (
            <button
              onClick={updateActivity}
              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Stay Logged In
            </button>
          ),
          duration: 300000, // 5 minutes
        });
      }

      // Logout after 6 hours
      if (timeSinceActivity >= IDLE_TIMEOUT_MS) {
        signOut();
        toast({
          title: "Session Expired",
          description: "You've been logged out due to inactivity.",
          variant: "destructive",
        });
      }
    };

    const interval = setInterval(checkIdleTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session, warningShown, signOut, toast, updateActivity]);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsGuest(false);
        // Check for guest data to migrate
        const guestId = localStorage.getItem(GUEST_SESSION_KEY);
        if (guestId) {
          setGuestSessionId(guestId);
          // Migration will be triggered by migrateGuestData being available
        }
      } else {
        // Check if previously in guest mode
        const guestId = localStorage.getItem(GUEST_SESSION_KEY);
        if (guestId) {
          setGuestSessionId(guestId);
          setIsGuest(true);
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsGuest(false);
          const now = Date.now();
          setLastActivity(now);
          localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
          
          // Auto-migrate guest data on login - only on SIGNED_IN event to prevent duplicates
          if (event === 'SIGNED_IN') {
            const guestId = localStorage.getItem(GUEST_SESSION_KEY);
            if (guestId) {
              // Guest generations are not saved to database, so no migration needed
              // Just clean up the guest session ID
              localStorage.removeItem(GUEST_SESSION_KEY);
              setGuestSessionId(null);
            }
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const value: AuthContextType = {
    user,
    session,
    isGuest,
    guestSessionId,
    loading,
    lastActivity,
    signInWithGoogle,
    signOut,
    continueAsGuest,
    migrateGuestData,
    updateActivity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
