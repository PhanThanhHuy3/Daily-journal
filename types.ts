export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export type Mood = 'happy' | 'calm' | 'neutral' | 'sad' | 'stressed' | 'inspired';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: Mood;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  aiReflection?: string; // Analysis from Gemini
}

export type ViewState = 'login' | 'signup' | 'dashboard' | 'editor' | 'view-entry';

export interface AuthResponse {
  user: User | null;
  error?: string;
}
