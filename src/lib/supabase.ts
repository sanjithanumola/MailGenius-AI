import { createClient, User as SupabaseUser } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Initialize Supabase Client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface SupabaseDraft {
  id: string;
  user_id: string;
  recipient: string;
  recipient_email: string;
  subject: string;
  body: string;
  tone: string;
  language: string;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  userId: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  body: string;
  tone: string;
  language: string;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export type { SupabaseUser };

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

// Supabase Auth Functions
export async function supabaseSignUp(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onSupabaseAuthStateChange(callback: (user: SupabaseUser | null) => void) {
  if (!supabase) return () => {};
  
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user || null);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}


// SQL Helper string to show the user if their table is missing
export const SUPABASE_SETUP_SQL = `-- Run this in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS public.drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  subject TEXT DEFAULT '(No Subject)',
  body TEXT DEFAULT '',
  tone TEXT DEFAULT 'professional',
  language TEXT DEFAULT 'English',
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for access control based on user_id (using Firebase Auth UID)
CREATE POLICY "Enable all operations for users on their own drafts" ON public.drafts
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;

// Map database fields from Snake Case (Supabase) to Camel Case (UI)
function mapFromSupabase(d: SupabaseDraft) {
  return {
    id: d.id,
    userId: d.user_id,
    recipient: d.recipient || "",
    recipientEmail: d.recipient_email || "",
    subject: d.subject || "",
    body: d.body || "",
    tone: d.tone || "professional",
    language: d.language || "English",
    isStarred: !!d.is_starred,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

// Fetch all drafts for the authenticated user from Supabase
export async function getSupabaseDrafts(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured. Please check your .env credentials.");

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      // Table doesn't exist error
      throw new Error("SUPABASE_TABLE_MISSING");
    }
    throw error;
  }

  return (data || []).map(mapFromSupabase);
}

// Save (Insert or Update) a draft in Supabase
export async function saveSupabaseDraft(
  userId: string,
  draft: {
    id?: string;
    recipient?: string;
    recipientEmail?: string;
    subject: string;
    body: string;
    tone?: string;
    language?: string;
    isStarred?: boolean;
  }
) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    user_id: userId,
    recipient: draft.recipient || "",
    recipient_email: draft.recipientEmail || "",
    subject: draft.subject || "No Subject",
    body: draft.body || "",
    tone: draft.tone || "professional",
    language: draft.language || "English",
    is_starred: !!draft.isStarred,
    updated_at: new Date().toISOString(),
  };

  if (draft.id) {
    // Perform update
    const { data, error } = await supabase
      .from("drafts")
      .update(payload)
      .eq("id", draft.id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    return draft.id;
  } else {
    // Perform insert
    const { data, error } = await supabase
      .from("drafts")
      .insert({
        ...payload,
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      if (error.code === "42P01") {
        throw new Error("SUPABASE_TABLE_MISSING");
      }
      throw error;
    }

    return data && data[0] ? data[0].id : "";
  }
}

// Toggle Star on a draft in Supabase
export async function toggleSupabaseStarDraft(draftId: string, currentStarred: boolean, userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("drafts")
    .update({
      is_starred: !currentStarred,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) throw error;
}

// Delete a draft from Supabase
export async function deleteSupabaseDraft(draftId: string, userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) throw error;
}
