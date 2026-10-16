import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 25
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    client = null;
  }
} else {
  console.warn(
    '[TwinQuest Online] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are missing or set to placeholder values. ' +
    'Real-time online multiplayer requires valid Supabase credentials in your environment. ' +
    'Local single-player and local co-op modes remain fully operational.'
  );
}

export const supabase = client;
