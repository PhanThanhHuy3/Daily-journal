import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { JournalEntry, User } from '../types';

const SUPABASE_URL = 'https://fzwkhycwyafragnqccpw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6d2toeWN3eWFmcmFnbnFjY3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njc0OTksImV4cCI6MjA4MTU0MzQ5OX0.JzR5MA87P25JYvpI9BjrO7Tb2oNRJBn-N0j1psI7HtY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const mapUser = (sbUser: SupabaseUser): User => ({
  id: sbUser.id,
  email: sbUser.email || '',
  name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
  createdAt: new Date(sbUser.created_at).getTime(),
});

export const getEntries = async (): Promise<JournalEntry[]> => {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    title: item.title,
    content: item.content,
    mood: item.mood,
    tags: item.tags || [],
    createdAt: new Date(item.created_at).getTime(),
    updatedAt: new Date(item.updated_at).getTime(),
    aiReflection: item.ai_reflection,
  }));
};

export const saveEntry = async (entry: Partial<JournalEntry> & { userId: string }) => {
  const payload = {
    id: entry.id,
    user_id: entry.userId,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    tags: entry.tags,
    ai_reflection: entry.aiReflection,
    updated_at: new Date().toISOString(),
    created_at: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('entries')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  
  return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      content: data.content,
      mood: data.mood,
      tags: data.tags || [],
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      aiReflection: data.ai_reflection,
  } as JournalEntry;
};

export const deleteEntry = async (id: string) => {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
};