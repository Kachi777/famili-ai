import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Target, 
  Activity, 
  User, 
  Brain, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  Upload, 
  FileText, 
  ChevronRight, 
  Check, 
  HelpCircle, 
  Flame, 
  RotateCcw,
  UserCheck,
  Award,
  AlertCircle,
  Clock,
  BookMarked,
  Loader2
} from 'lucide-react';
import { 
  UserProfile, 
  Habit, 
  Goal, 
  StudyMaterial, 
  QuizQuestion, 
  Flashcard, 
  ChatMessage 
} from '../types';
import SubscriptionDashboard from './SubscriptionDashboard';

interface AppWorkspaceProps {
  onOpenCheckout: () => void;
  subscriptionPlan: string;
  onIncrementAirdropPoints: (pts: number) => void;
  autoRenew: boolean;
  expiryTimestamp: number;
  onCancelSubscription: () => void;
  presaleTokens: number;
  onBuyPresaleTokens: (amount: number) => void;
}

const mockProfiles: UserProfile[] = [
  { id: '1', name: 'Student Alexis', role: 'Student', avatarUrl: '🎓' },
  { id: '2', name: 'Parent Marcus', role: 'Parent', avatarUrl: '🏡' },
  { id: '3', name: 'Kid Leo', role: 'Child', avatarUrl: '🧸' },
  { id: '4', name: 'Dr. Evelyn', role: 'Professional', avatarUrl: '💼' }
];

const initialMaterials: StudyMaterial[] = [
  { id: 'mat1', name: 'Intro_to_Python_Syntax.pdf', type: 'pdf', size: '1.2 MB', uploadedAt: '2 hours ago' },
  { id: 'mat2', name: 'Photosynthesis_Diagram.png', type: 'image', size: '2.4 MB', uploadedAt: '1 day ago' },
  { id: 'mat3', name: 'Mindset_Goal_Habits.txt', type: 'text', size: '45 KB', uploadedAt: '3 days ago' }
];

export default function AppWorkspace({
  onOpenCheckout,
  subscriptionPlan,
  onIncrementAirdropPoints,
  autoRenew,
  expiryTimestamp,
  onCancelSubscription,
  presaleTokens,
  onBuyPresaleTokens
}: AppWorkspaceProps) {
  // Tabs: 'tutor' (StudyPilot), 'growth' (Nexa Life), 'materials', 'subscription'
  const [activeTab, setActiveTab] = useState<'tutor' | 'growth' | 'materials' | 'subscription'>('tutor');
  
  // Profile state
  const [activeProfile, setActiveProfile] = useState<UserProfile>(mockProfiles[0]);
  
  // Materials state
  const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Chat State
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Welcome! I am your FAMILI AI personal companion. Feel free to upload study materials or ask any scientific, software, or growth-oriented question!', timestamp: 'Just now' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('TON Ecosystem');
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showGrading, setShowGrading] = useState(false);
  const [gradeScore, setGradeScore] = useState(0);

  // Flashcards State
  const [cardTopic, setCardTopic] = useState('Python Syntax');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Growth / Habits State
  const [habits, setHabits] = useState<Habit[]>([
    { id: 'hab1', name: 'Maintain 30-min Reading Streak', frequency: 'Daily', streak: 4, completedToday: false },
    { id: 'hab2', name: 'Complete 1 Practice AI Quiz', frequency: 'Daily', streak: 2, completedToday: false },
    { id: 'hab3', name: 'Morning Goal Planning Reflection', frequency: 'Daily', streak: 8, completedToday: true }
  ]);
  const [newHabitName, setNewHabitName] = useState('');

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([
    { id: 'g1', title: 'Master Basic Python loops', category: 'Learning', targetDate: 'Q3 2026', progress: 40 },
    { id: 'g2', title: 'Establish solid morning growth routine', category: 'Mindset', targetDate: 'August 2026', progress: 80 },
    { id: 'g3', title: 'Complete Ecosystem Testnet tasks', category: 'Focus', targetDate: 'End of Q3', progress: 10 }
  ]);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  // Reflection Journal
  const [journalText, setJournalText] = useState('');
  const [savedJournal, setSavedJournal] = useState<string | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, chatLoading]);

  // Actions

  // 1. Chat Response via Server-Side Gemini API
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim() || chatLoading) return;

    const userMsg = chatPrompt;
    setChatPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          chatHistory: chatHistory.slice(-6) // Send last few messages for memory context
        })
      });

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'model', text: data.text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
      onIncrementAirdropPoints(100); // 100 points for active tutor chats!
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Error communicating with AI service. Please make sure the server is healthy.', timestamp: 'Now' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 2. Quiz Generator via Server-Side Gemini API
  const handleGenerateQuiz = async () => {
    if (quizLoading) return;
    setQuizLoading(true);
    setQuizzes([]);
    setSelectedAnswers({});
    setShowGrading(false);

    try {
      const response = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: quizTopic })
      });
      const data = await response.json();
      setQuizzes(data.quiz || []);
      onIncrementAirdropPoints(200); // 200 points for study quiz generation!
    } catch (err) {
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  // Grade Quiz
  const handleGradeQuiz = () => {
    let score = 0;
    quizzes.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        score++;
      }
    });
    setGradeScore(score);
    setShowGrading(true);

    if (score === quizzes.length) {
      onIncrementAirdropPoints(800); // Massive points for 100% quiz score!
    } else {
      onIncrementAirdropPoints(300);
    }
  };

  // 3. Flashcards Generator via Server-Side Gemini API
  const handleGenerateCards = async () => {
    if (cardLoading) return;
    setCardLoading(true);
    setFlashcards([]);
    setActiveCardIndex(0);
    setCardFlipped(false);

    try {
      const response = await fetch('/api/gemini/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cardTopic })
      });
      const data = await response.json();
      setFlashcards(data.flashcards || []);
      onIncrementAirdropPoints(150); // Points for creating revision cards!
    } catch (err) {
      console.error(err);
    } finally {
      setCardLoading(false);
    }
  };

  // 4. Custom Materials Mock Upload
  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setIsUploading(true);
      setUploadProgress(10);
      
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              const newMat: StudyMaterial = {
                id: 'mat_' + Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.name.split('.').pop() as any || 'pdf',
                size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                uploadedAt: 'Just now'
              };
              setMaterials(prevMat => [newMat, ...prevMat]);
              setIsUploading(false);
              onIncrementAirdropPoints(500); // 500 Points for active proof of upload!
              alert(`Successfully uploaded "${file.name}" to StudyPilot. The AI Tutor has indexed this document and is ready to generate quizzes or flashcards!`);
            }, 300);
            return 100;
          }
          return prev + 30;
        });
      }, 200);
    }
  };

  // 5. Growth Goals and Habits
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHab: Habit = {
      id: 'hab_' + Math.random().toString(36).substr(2, 9),
      name: newHabitName,
      frequency: 'Daily',
      streak: 0,
      completedToday: false
    };

    setHabits(prev => [...prev, newHab]);
    setNewHabitName('');
    onIncrementAirdropPoints(100);
  };

  const handleToggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const completed = !h.completedToday;
        if (completed) onIncrementAirdropPoints(200); // 200 points for daily routine completed!
        return {
          ...h,
          completedToday: completed,
          streak: completed ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newGl: Goal = {
      id: 'g_' + Math.random().toString(36).substr(2, 9),
      title: newGoalTitle,
      category: 'Learning',
      targetDate: 'Q4 2026',
      progress: 10
    };

    setGoals(prev => [...prev, newGl]);
    setNewGoalTitle('');
    onIncrementAirdropPoints(150);
  };

  const handleProgressGoal = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const nextProgress = Math.min(100, g.progress + 10);
        if (nextProgress === 100) onIncrementAirdropPoints(500); // Completing goal rewards!
        return { ...g, progress: nextProgress };
      }
      return g;
    }));
  };

  const handleSaveJournal = () => {
    if (journalText.trim()) {
      setSavedJournal(journalText);
      onIncrementAirdropPoints(300); // Reflection rewards!
      alert("Reflective insights logged into local growth storage! +300 $FAMILI points earned.");
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans">
      
      {/* Top Bar / Profiles Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Profile Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs font-mono font-bold uppercase tracking-widest shrink-0">Family Active Profiles:</span>
          <div className="flex gap-1.5 overflow-x-auto py-1">
            {mockProfiles.map((prof) => (
              <button
                key={prof.id}
                onClick={() => setActiveProfile(prof)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
                  activeProfile.id === prof.id 
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.2)]' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{prof.avatarUrl}</span>
                <span>{prof.name}</span>
                {activeProfile.id === prof.id && <UserCheck className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Upgrade button / Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">Subscription Status:</span>
            <span className="text-cyan-400 font-bold uppercase">{subscriptionPlan}</span>
          </div>

          {subscriptionPlan === 'free' && (
            <button
              onClick={onOpenCheckout}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.15)]"
            >
              🚀 Upgrade Premium
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Navigation Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-white text-sm">FAMILI AI Modules</h4>
            </div>

            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveTab('tutor')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'tutor'
                    ? 'bg-gradient-to-r from-cyan-950/40 to-slate-950 border-l-2 border-cyan-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Phase 1 — StudyPilot AI Tutor</span>
                </div>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono px-1.5 py-0.5 rounded">Active</span>
              </button>

              <button
                onClick={() => setActiveTab('growth')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'growth'
                    ? 'bg-gradient-to-r from-cyan-950/40 to-slate-950 border-l-2 border-cyan-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-violet-400" />
                  <span>NEXA — Personal Growth Coach</span>
                </div>
                <span className="text-[10px] bg-violet-500/10 text-violet-400 font-mono px-1.5 py-0.5 rounded">Active</span>
              </button>

              <button
                onClick={() => setActiveTab('materials')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'materials'
                    ? 'bg-gradient-to-r from-cyan-950/40 to-slate-950 border-l-2 border-cyan-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Study Materials Vault</span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-1.5 py-0.5 rounded">
                  {materials.length} files
                </span>
              </button>

              <button
                onClick={() => setActiveTab('subscription')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'subscription'
                    ? 'bg-gradient-to-r from-cyan-950/40 to-slate-950 border-l-2 border-cyan-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Subscription &amp; Presale Hub</span>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono px-1.5 py-0.5 rounded font-bold">
                  10% Presale
                </span>
              </button>
            </nav>
          </div>

          {/* Prompt sandbox instructions */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-relaxed">
            <h5 className="font-bold text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              How to Test Server-Side Gemini:
            </h5>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Type any prompt like <span className="text-cyan-400 font-semibold font-mono">Explain Python functions</span> and send.</li>
              <li>Ask for structured practice quizzes or card sets in study tools.</li>
              <li>Toggle profiles to see customized micro-learning experiences!</li>
            </ol>
          </div>
        </div>

        {/* Main Panel Content Area */}
        <div className="lg:col-span-9 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl min-h-[600px] flex flex-col justify-between">
          
          {/* Active Tab: Tutor (StudyPilot AI) */}
          {activeTab === 'tutor' && (
            <div className="flex-grow flex flex-col justify-between space-y-6">
              
              {/* Header Info */}
              <div className="border-b border-slate-800/60 pb-4 flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    StudyPilot AI Tutor Workspace
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Powered by server-side Gemini 3.5 models. Ask questions, build revision plans, and test your knowledge.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-full border border-slate-800/80 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">Streak:</span>
                  <span className="text-white font-bold flex items-center gap-0.5">
                    3 Days <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  </span>
                </div>
              </div>

              {/* Chat View & Study Tools Side-by-Side */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Chat Column */}
                <div className="xl:col-span-7 bg-slate-950/80 rounded-2xl border border-slate-800/80 p-4 flex flex-col h-[400px]">
                  
                  {/* Messages list */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3.5 mb-4 pr-1 scrollbar-thin">
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-cyan-500 text-slate-950 font-medium rounded-tr-none' 
                            : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-600 mt-1 font-mono tracking-wider">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 pl-3">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                        <span>FAMILI AI is thinking...</span>
                      </div>
                    )}
                  </div>

                  {/* Chat input form */}
                  <form onSubmit={handleSendChat} className="flex gap-2 border-t border-slate-800/60 pt-3">
                    <input
                      type="text"
                      value={chatPrompt}
                      onChange={(e) => setChatPrompt(e.target.value)}
                      placeholder="Ask Alexis' AI Tutor a question..."
                      className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatPrompt.trim()}
                      className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 p-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Quizzes & Flashcards Generator Column */}
                <div className="xl:col-span-5 space-y-4">
                  
                  {/* Quiz Generator card */}
                  <div className="bg-slate-950/40 border border-slate-850/80 rounded-2xl p-4">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-violet-400" />
                      Dynamic AI Quiz Generator
                    </h4>

                    {quizzes.length === 0 ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={quizTopic}
                          onChange={(e) => setQuizTopic(e.target.value)}
                          placeholder="Enter quiz topic (e.g. Science, Space)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={handleGenerateQuiz}
                          disabled={quizLoading || !quizTopic}
                          className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          {quizLoading ? 'Generating Questions...' : 'Create Practice Quiz (+200 Pts)'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {quizzes.map((q, idx) => (
                          <div key={q.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                            <p className="font-semibold text-white mb-2">{idx + 1}. {q.question}</p>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  disabled={showGrading}
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                                    selectedAnswers[q.id] === optIdx
                                      ? showGrading 
                                        ? optIdx === q.correctAnswerIndex 
                                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                          : 'bg-red-500/10 border-red-500 text-red-400'
                                        : 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                      : showGrading && optIdx === q.correctAnswerIndex
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                        : 'bg-slate-900 border-slate-800 hover:border-slate-750 text-slate-300'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>

                            {showGrading && (
                              <div className="mt-2.5 p-2 rounded bg-slate-900 border-l-2 border-cyan-400 text-[10px] text-slate-400">
                                💡 {q.explanation}
                              </div>
                            )}
                          </div>
                        ))}

                        {!showGrading ? (
                          <button
                            onClick={handleGradeQuiz}
                            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                          >
                            Submit and Grade Practice Quiz
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-3 text-center rounded-xl bg-slate-950 border border-slate-850">
                              <span className="text-slate-400 text-[10px] uppercase block">Grade Score</span>
                              <span className="text-xl font-extrabold text-white">
                                {gradeScore} / {quizzes.length} Correct
                              </span>
                            </div>
                            <button
                              onClick={() => { setQuizzes([]); setSelectedAnswers({}); setShowGrading(false); }}
                              className="w-full py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs hover:bg-slate-850"
                            >
                              Try Another Quiz Topic
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flashcards Generator card */}
                  <div className="bg-slate-950/40 border border-slate-850/80 rounded-2xl p-4">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <BookMarked className="w-4 h-4 text-emerald-400" />
                      Dynamic Flashcard Deck
                    </h4>

                    {flashcards.length === 0 ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={cardTopic}
                          onChange={(e) => setCardTopic(e.target.value)}
                          placeholder="Enter flashcard topic (e.g. Science)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={handleGenerateCards}
                          disabled={cardLoading || !cardTopic}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                        >
                          {cardLoading ? 'Formulating Decks...' : 'Generate AI Flashcards (+150 Pts)'}
                        </button>
                      </div>
                    ) : (
                      <div>
                        {/* Interactive Flip Card */}
                        <div 
                          onClick={() => setCardFlipped(!cardFlipped)}
                          className="cursor-pointer min-h-[120px] rounded-2xl bg-slate-950 border border-slate-850 p-6 flex flex-col justify-between items-center text-center relative hover:shadow-[0_0_15px_rgba(34,211,238,0.05)] transition-all select-none mb-4"
                        >
                          <span className="absolute top-2 right-3 text-[9px] font-mono text-slate-600">
                            {cardFlipped ? 'BACK (Click to flip)' : 'FRONT (Click to flip)'}
                          </span>

                          <div className="flex-1 flex items-center justify-center pt-2">
                            <p className="text-xs text-slate-200 leading-relaxed">
                              {cardFlipped ? flashcards[activeCardIndex].back : flashcards[activeCardIndex].front}
                            </p>
                          </div>

                          <span className="text-[10px] text-cyan-400/80 mt-3 font-semibold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Click card to flip
                          </span>
                        </div>

                        {/* Navigation controls */}
                        <div className="flex justify-between items-center text-xs">
                          <button
                            disabled={activeCardIndex === 0}
                            onClick={() => { setActiveCardIndex(p => p - 1); setCardFlipped(false); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <span className="font-mono text-slate-500">
                            {activeCardIndex + 1} / {flashcards.length}
                          </span>
                          <button
                            disabled={activeCardIndex === flashcards.length - 1}
                            onClick={() => { setActiveCardIndex(p => p + 1); setCardFlipped(false); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>

                        <button
                          onClick={() => setFlashcards([])}
                          className="w-full mt-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-850 text-[10px] text-slate-400"
                        >
                          Create New Decks
                        </button>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* Active Tab: Growth (Nexa Life Coach) */}
          {activeTab === 'growth' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              
              {/* Header */}
              <div className="border-b border-slate-800/60 pb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    NEXA Life — Personal Growth Coach
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Establish routine habits, define focus-oriented milestones, and log mindful thoughts into local memories.
                  </p>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Habits Column */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-850/80 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Daily Habits Tracker
                    </h4>
                  </div>

                  <form onSubmit={handleAddHabit} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="Add custom growth routine..."
                      className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-cyan-400 transition-all cursor-pointer"
                    >
                      Add
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {habits.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => handleToggleHabit(h.id)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          h.completedToday 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400' 
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-750 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1 rounded-full ${h.completedToday ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>
                            {h.completedToday ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-700" />}
                          </div>
                          <div>
                            <p className={`text-xs font-medium ${h.completedToday ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {h.name}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono">Streak: {h.streak} days</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-[10px] text-orange-400">
                          <Flame className="w-3.5 h-3.5" />
                          <span>{h.streak}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goals Column */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-850/80 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-violet-400" />
                    Focus Milestones
                  </h4>

                  <form onSubmit={handleAddGoal} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      placeholder="Add personal life milestone..."
                      className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-violet-500 transition-all cursor-pointer"
                    >
                      Define
                    </button>
                  </form>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {goals.map((g) => (
                      <div key={g.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h5 className="text-xs font-semibold text-white">{g.title}</h5>
                            <span className="text-[10px] text-slate-500 capitalize">{g.category} • Target {g.targetDate}</span>
                          </div>
                          
                          {g.progress < 100 ? (
                            <button
                              onClick={() => handleProgressGoal(g.id)}
                              className="text-[10px] text-violet-400 hover:underline shrink-0"
                            >
                              +10% Progress
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              ACHIEVED
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300" 
                              style={{ width: `${g.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between font-mono text-[9px] text-slate-500">
                            <span>Progress</span>
                            <span>{g.progress}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Daily Reflection Journal Footer block */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850/80 space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  Daily Reflection &amp; Mindset Log
                </h4>

                <textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="How was your focus, clarity, and curiosity today? Log your growth insights..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />

                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-500">
                    Reflective summaries reinforce memory encoding by up to 2x.
                  </p>
                  <button
                    onClick={handleSaveJournal}
                    disabled={!journalText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Log Reflection (+300 Pts)
                  </button>
                </div>

                {savedJournal && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-850/85">
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Latest Logged Reflection:</p>
                    <p className="text-xs text-slate-400 font-serif italic">"{savedJournal}"</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Active Tab: Materials (Study Materials vault) */}
          {activeTab === 'materials' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              
              <div className="border-b border-slate-800/60 pb-4">
                <h3 className="text-xl font-bold text-white">Study Materials Vault</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload PDF, school textbooks, images or notes. StudyPilot AI parses files to customize quizzes and tutoring.
                </p>
              </div>

              {/* Upload Drag/Drop area */}
              <div className="p-8 text-center border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-3xl bg-slate-950/40 cursor-pointer relative group transition-all">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx,image/*"
                  onChange={handleMockUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                
                {isUploading ? (
                  <div className="space-y-3 py-4">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-white">Uploading Study Material...</p>
                    <div className="w-48 bg-slate-900 h-1.5 rounded-full overflow-hidden mx-auto">
                      <div className="bg-cyan-500 h-full" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <Upload className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition-colors mx-auto" />
                    <p className="text-sm font-semibold text-white">Drag and Drop, or click to browse</p>
                    <p className="text-xs text-slate-500">
                      Supports PDF, PNG, JPG, TXT or school notes (Max size 50MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Vault File listing */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                  Indexed Library ({materials.length} Files)
                </h4>

                <div className="grid sm:grid-cols-2 gap-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {materials.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-850/80 text-cyan-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{m.name}</p>
                          <span className="text-[10px] text-slate-500">{m.size} • Uploaded {m.uploadedAt}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setQuizTopic(m.name.split('.').shift() || '');
                          setActiveTab('tutor');
                          alert(`Ready! AI quiz parameter initialized to match "${m.name}". Create quiz inside tutoring panel.`);
                        }}
                        className="text-[10px] text-cyan-400 hover:underline shrink-0"
                      >
                        Create Quiz
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Active Tab: Subscription & Presale Hub */}
          {activeTab === 'subscription' && (
            <SubscriptionDashboard 
              subscriptionPlan={subscriptionPlan}
              onOpenUpgrade={onOpenCheckout}
              onCancelSubscription={onCancelSubscription}
              autoRenew={autoRenew}
              expiryTimestamp={expiryTimestamp}
              presaleTokens={presaleTokens}
              onBuyPresaleTokens={onBuyPresaleTokens}
            />
          )}

          {/* Sandbox Indicator Banner */}
          <div className="mt-8 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-cyan-500/80 shrink-0" />
              <span>Session: Full-Stack Gemini Integration Live</span>
            </div>
            
            <button
              onClick={() => {
                setActiveTab('tutor');
                setChatPrompt('Perform a detailed explanation of educational smart contracts on TON.');
              }}
              className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
            >
              ⚡ Pre-load Educational TON AI Query
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
