import React, { useState, useEffect, useCallback } from 'react';
import { User, JournalEntry, ViewState, Mood } from './types';
import * as SupabaseService from './services/supabase';
import * as GeminiService from './services/geminiService';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { MoodBadge } from './components/MoodBadge';
import { LogOut, Plus, Search, Calendar, ChevronLeft, Sparkles, Trash2, Edit2, BookOpen, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Editor State
  const [currentEntry, setCurrentEntry] = useState<Partial<JournalEntry>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState('');

  // Dashboard State
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Initialize Supabase Auth Listener
  useEffect(() => {
    // Check active session immediately
    SupabaseService.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(SupabaseService.mapUser(session.user));
        setView('dashboard');
      }
      setIsLoading(false);
    });

    // Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = SupabaseService.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(SupabaseService.mapUser(session.user));
        // Force view to dashboard on successful login
        setView('dashboard');
      } else {
        setUser(null);
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load entries when user changes
  useEffect(() => {
    if (user) {
      loadEntries();
    } else {
      setEntries([]);
    }
  }, [user]);

  const loadEntries = async () => {
    setEntriesLoading(true);
    try {
      const loaded = await SupabaseService.getEntries();
      setEntries(loaded);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setEntriesLoading(false);
    }
  };

  // --- Auth Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    
    try {
      const { error } = await SupabaseService.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Note: The onAuthStateChange listener in useEffect will handle the redirect to 'dashboard' automatically
    } catch (err: any) {
      setAuthError('Đăng nhập thất bại. Vui lòng kiểm tra email hoặc mật khẩu.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      const { data, error } = await SupabaseService.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      if (data.user && !data.session) {
        setAuthSuccess('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
        // Don't switch view, let them read the message
        return;
      }
      
      // If session exists immediately (rare for Supabase default settings), the listener handles it.
    } catch (err: any) {
      setAuthError(err.message || 'Đăng ký thất bại.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await SupabaseService.supabase.auth.signOut();
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccess('');
    // Auth listener handles state clear and redirect to login
  };

  // --- CRUD Handlers ---

  const handleCreateNew = () => {
    setCurrentEntry({
      mood: 'neutral',
      content: '',
      title: '',
      tags: [],
    });
    setView('editor');
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setCurrentEntry({ ...entry });
    setView('editor');
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setCurrentEntry({ ...entry });
    setView('view-entry');
  };

  const handleSaveEntry = async () => {
    if (!user) return;
    if (!currentEntry.title || !currentEntry.content) {
      setEditorError('Title and content are required.');
      return;
    }

    setIsSaving(true);
    setEditorError('');

    try {
      const now = Date.now();
      const entryToSave = {
        id: currentEntry.id || crypto.randomUUID(),
        userId: user.id,
        title: currentEntry.title,
        content: currentEntry.content,
        mood: currentEntry.mood || 'neutral',
        tags: currentEntry.tags || [],
        createdAt: currentEntry.createdAt || now,
        updatedAt: now,
        aiReflection: currentEntry.aiReflection,
      };

      await SupabaseService.saveEntry(entryToSave);
      await loadEntries(); // Refresh list
      setView('dashboard');
    } catch (err: any) {
      setEditorError(err.message || 'Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await SupabaseService.deleteEntry(id);
        await loadEntries();
        setView('dashboard');
      } catch (err) {
        console.error("Failed to delete", err);
        alert("Failed to delete entry");
      }
    }
  };

  const handleGenerateReflection = async () => {
    if (!currentEntry.content || !currentEntry.title) return;
    setIsGenerating(true);
    
    // Create a temporary entry object to pass to service
    const tempEntry = { ...currentEntry } as JournalEntry;
    
    const reflection = await GeminiService.generateReflection(tempEntry);
    setCurrentEntry(prev => ({ ...prev, aiReflection: reflection }));
    setIsGenerating(false);
  };

  // --- Renderers ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (view === 'login' || view === 'signup') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-brand-50 rounded-full">
              <BookOpen className="w-8 h-8 text-brand-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {view === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
          </h1>
          <p className="text-center text-slate-500 mb-8">
            {view === 'login' ? 'Đăng nhập để truy cập nhật ký của bạn.' : 'Tạo tài khoản để bắt đầu viết nhật ký.'}
          </p>
          
          <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {view === 'signup' && (
              <Input 
                label="Họ và tên" 
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Input 
              label="Email" 
              type="email" 
              placeholder="ban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Mật khẩu" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {authSuccess && (
              <div className="text-sm p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                {authSuccess}
              </div>
            )}

            {authError && (
              <div className="text-sm p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={authLoading}>
              {view === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {view === 'login' ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button 
              onClick={() => {
                setView(view === 'login' ? 'signup' : 'login');
                setAuthError('');
                setAuthSuccess('');
              }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {view === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Common Layout for logged in views
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <aside className="bg-white border-r border-slate-200 md:w-64 flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0 z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-slate-800">SereneJournal</span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="md:hidden" title="Logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4 flex-1 flex flex-col space-y-2 overflow-y-auto">
           <div className="hidden md:block mb-4">
             <div className="flex items-center space-x-3 px-2 py-3 mb-2">
               <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                 {user?.name.charAt(0).toUpperCase()}
               </div>
               <div className="overflow-hidden">
                 <p className="font-medium text-slate-900 truncate">{user?.name}</p>
                 <p className="text-xs text-slate-500 truncate">{user?.email}</p>
               </div>
             </div>
           </div>

           <Button onClick={() => setView('dashboard')} variant={view === 'dashboard' ? 'secondary' : 'ghost'} className="justify-start w-full">
             <Calendar className="w-4 h-4 mr-2" />
             Dashboard
           </Button>
           
           <div className="mt-auto hidden md:block pt-4 border-t border-slate-100">
             <Button variant="ghost" onClick={handleLogout} className="justify-start w-full text-red-600 hover:bg-red-50 hover:text-red-700">
               <LogOut className="w-4 h-4 mr-2" />
               Sign Out
             </Button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto">
          
          {view === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Your Entries</h1>
                <Button onClick={handleCreateNew}>
                  <Plus className="w-5 h-5 mr-2" />
                  New Entry
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Search entries..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {entriesLoading ? (
                 <div className="flex justify-center py-12">
                   <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                 </div>
              ) : (
                <div className="grid gap-4">
                  {entries
                    .filter(e => 
                      e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      e.content.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(entry => (
                      <div 
                        key={entry.id} 
                        onClick={() => handleViewEntry(entry)}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
                            {entry.title}
                          </h3>
                          <MoodBadge mood={entry.mood} />
                        </div>
                        <p className="text-slate-600 line-clamp-2 mb-3 text-sm">{entry.content}</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>{format(entry.createdAt, 'MMM d, yyyy • h:mm a')}</span>
                          {entry.aiReflection && (
                            <span className="flex items-center text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Reflected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {entries.length === 0 && (
                      <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                        <p>No entries found. Start writing today!</p>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {view === 'editor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[calc(100vh-6rem)]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')}>
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </Button>
                <div className="text-sm font-medium text-slate-600">
                  {currentEntry.id ? 'Edit Entry' : 'New Entry'}
                </div>
                <Button onClick={handleSaveEntry} disabled={isGenerating || isSaving} isLoading={isSaving}>Save</Button>
              </div>

              <div className="p-6 space-y-6 flex-1 flex flex-col">
                {editorError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {editorError}
                  </div>
                )}
                
                <input
                  type="text"
                  placeholder="Entry Title..."
                  className="text-3xl font-bold w-full border-none focus:ring-0 placeholder:text-slate-300 text-slate-800 p-0 bg-transparent"
                  value={currentEntry.title || ''}
                  onChange={e => setCurrentEntry({...currentEntry, title: e.target.value})}
                />

                <div className="flex flex-wrap gap-2 items-center text-sm text-slate-600">
                  <span className="mr-2">How are you feeling?</span>
                  {(['happy', 'calm', 'neutral', 'sad', 'stressed', 'inspired'] as Mood[]).map(mood => (
                    <MoodBadge 
                      key={mood} 
                      mood={mood} 
                      selected={currentEntry.mood === mood}
                      onClick={() => setCurrentEntry({...currentEntry, mood})}
                      size="md"
                    />
                  ))}
                </div>

                <textarea
                  placeholder="Write your thoughts here..."
                  className="flex-1 w-full resize-none border-none focus:ring-0 text-lg leading-relaxed text-slate-700 placeholder:text-slate-300 p-0 bg-transparent"
                  value={currentEntry.content || ''}
                  onChange={e => setCurrentEntry({...currentEntry, content: e.target.value})}
                />
                
                {currentEntry.aiReflection && (
                  <div className="mt-6 bg-brand-50 p-4 rounded-xl border border-brand-100">
                    <div className="flex items-center text-brand-700 font-semibold mb-2">
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Reflection
                    </div>
                    <p className="text-brand-800 text-sm italic leading-relaxed">
                      "{currentEntry.aiReflection}"
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-xs text-slate-400">
                   {currentEntry.content ? `${currentEntry.content.length} characters` : '0 characters'}
                 </div>
                 {!currentEntry.aiReflection && (
                   <Button 
                    variant="secondary" 
                    onClick={handleGenerateReflection}
                    disabled={!currentEntry.content || isGenerating}
                    isLoading={isGenerating}
                    className="text-xs"
                   >
                     <Sparkles className="w-4 h-4 mr-2 text-brand-500" />
                     Generate Insight
                   </Button>
                 )}
              </div>
            </div>
          )}

          {view === 'view-entry' && currentEntry && (
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                 <Button variant="ghost" onClick={() => setView('dashboard')}>
                   <ChevronLeft className="w-5 h-5 mr-1" />
                   Dashboard
                 </Button>
                 <div className="flex space-x-2">
                   <Button variant="secondary" onClick={() => handleEditEntry(currentEntry as JournalEntry)}>
                     <Edit2 className="w-4 h-4 mr-2" />
                     Edit
                   </Button>
                   <Button variant="danger" onClick={() => handleDeleteEntry(currentEntry.id!)} className="px-3">
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
               </div>

               <div className="p-8 max-w-3xl mx-auto">
                 <div className="mb-6 flex flex-col space-y-4">
                    <h1 className="text-4xl font-bold text-slate-900">{currentEntry.title}</h1>
                    <div className="flex items-center space-x-4">
                      <MoodBadge mood={currentEntry.mood as Mood} size="lg" />
                      <span className="text-slate-400 text-sm border-l border-slate-200 pl-4">
                        {format(currentEntry.createdAt || 0, 'EEEE, MMMM do, yyyy • h:mm a')}
                      </span>
                    </div>
                 </div>

                 <div className="prose prose-slate max-w-none mb-12">
                   <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-700">
                     {currentEntry.content}
                   </p>
                 </div>

                 {currentEntry.aiReflection ? (
                   <div className="bg-gradient-to-r from-brand-50 to-indigo-50 p-6 rounded-xl border border-brand-100 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10 text-brand-500">
                       <Sparkles size={120} />
                     </div>
                     <h3 className="text-brand-800 font-semibold mb-3 flex items-center relative z-10">
                       <Sparkles className="w-5 h-5 mr-2" />
                       Reflection
                     </h3>
                     <p className="text-slate-700 italic relative z-10">
                       {currentEntry.aiReflection}
                     </p>
                   </div>
                 ) : (
                    <div className="border-t border-slate-100 pt-8 text-center">
                      <Button variant="ghost" onClick={handleGenerateReflection} isLoading={isGenerating}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Reflect on this entry
                      </Button>
                    </div>
                 )}
               </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;