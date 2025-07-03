import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, dbHelpers } from '../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string;
  role: string;
  district?: string;
  sector?: string;
  cell?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  profile_image_url?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  address?: string;
  language_preference?: string;
  is_active?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

interface AuthUser extends User {
  profile?: UserProfile;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
          return;
        }

        if (mounted) {
          setSession(session);
          if (session?.user) {
            await loadUserProfile(session.user);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (mounted) {
        setSession(session);
        setError(null);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      setLoading(true);
      const profile = await dbHelpers.getUserById(authUser.id);
      
      setUser({
        ...authUser,
        profile: profile
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      // If profile doesn't exist, user still has basic auth info
      setUser(authUser as AuthUser);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: {
    full_name: string;
    phone_number: string;
    date_of_birth?: string;
    gender?: string;
    district?: string;
    sector?: string;
    cell?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      // Create user profile in our users table
      if (data.user) {
        try {
          await dbHelpers.createUser({
            id: data.user.id,
            email,
            ...userData
          });
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't throw here as auth was successful
        }
      }

      return data;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Signup error:', authError);
      setError(authError.message);
      throw authError;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update last login
      if (data.user) {
        try {
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
        } catch (updateError) {
          console.error('Error updating last login:', updateError);
        }
      }

      return data;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Signin error:', authError);
      setError(authError.message);
      throw authError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      setUser(null);
      setSession(null);
    } catch (error) {
      const authError = error as AuthError;
      console.error('Signout error:', authError);
      setError(authError.message);
      throw authError;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: {
    full_name?: string;
    phone_number?: string;
    district?: string;
    sector?: string;
    cell?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    insurance_provider?: string;
    insurance_number?: string;
  }) => {
    if (!user) throw new Error('No user logged in');

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local user state
      setUser({
        ...user,
        profile: { ...user.profile, ...data }
      });

      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Password reset error:', authError);
      setError(authError.message);
      throw authError;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Password update error:', authError);
      setError(authError.message);
      throw authError;
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
  };
};