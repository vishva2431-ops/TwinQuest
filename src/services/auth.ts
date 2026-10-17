import { supabase, isSupabaseConfigured } from './supabaseClient';
import { storage } from './storage';
import { PlayerProfile, CharacterGender } from '../types/game';

const GUEST_FLAG = 'twinquest_guest_session';

export type AuthResult =
  | { ok: true; profile: PlayerProfile }
  | { ok: true; needsEmailConfirmation: true }
  | { ok: false; message: string };

export const authAvailable = isSupabaseConfigured && !!supabase;

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (m.includes('email not confirmed')) return 'Please confirm your email first (check your inbox), then sign in.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('password should be')) return 'Password must be at least 6 characters.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Network problem. Check your connection and try again.';
  return message;
}

function toProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, any> }, token?: string): PlayerProfile {
  const email = user.email || '';
  const username = (user.user_metadata?.username as string) || email.split('@')[0] || 'Adventurer';
  const g = user.user_metadata?.gender;
  const gender: CharacterGender | undefined = g === 'boy' || g === 'girl' ? g : undefined;
  return storage.signInProfile({ id: user.id, email, username, token, gender });
}

export const auth = {
  /** Existing valid session on this device? Returns the profile if so. */
  async restoreSession(): Promise<PlayerProfile | null> {
    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return toProfile(data.session.user, data.session.access_token);
      } catch {
        // fall through
      }
    }
    try {
      if (localStorage.getItem(GUEST_FLAG) === '1') {
        storage.setActiveUser(null);
        return storage.getProfile();
      }
    } catch {
      // ignore
    }
    return null;
  },

  async signUp(email: string, password: string, username: string, gender: CharacterGender): Promise<AuthResult> {
    if (!supabase) return { ok: false, message: 'Sign up is unavailable right now (server not configured).' };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim(), gender } }
    });
    if (error) return { ok: false, message: friendlyError(error.message) };
    // Supabase hides duplicates when email confirmation is on: user comes back with no identities
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, message: 'An account with this email already exists. Please sign in instead.' };
    }
    if (!data.session || !data.user) return { ok: true, needsEmailConfirmation: true };
    try { localStorage.removeItem(GUEST_FLAG); } catch { /* ignore */ }
    return { ok: true, profile: toProfile(data.user, data.session.access_token) };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, message: 'Sign in is unavailable right now (server not configured).' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user || !data.session) {
      return { ok: false, message: friendlyError(error?.message || 'Incorrect email or password.') };
    }
    try { localStorage.removeItem(GUEST_FLAG); } catch { /* ignore */ }
    return { ok: true, profile: toProfile(data.user, data.session.access_token) };
  },

  continueAsGuest(): PlayerProfile {
    storage.setActiveUser(null);
    try { localStorage.setItem(GUEST_FLAG, '1'); } catch { /* ignore */ }
    return storage.getProfile();
  },

  async signOut(): Promise<PlayerProfile> {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // ignore
    }
    try { localStorage.removeItem(GUEST_FLAG); } catch { /* ignore */ }
    return storage.signOutProfile();
  },

  /** Called when the session ends elsewhere (expired, signed out in another tab). */
  onSignedOut(cb: () => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') cb();
    });
    return () => data.subscription.unsubscribe();
  }
};
