import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Command,
  FileText,
  Headphones,
  Lightbulb,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Tone = 'professional' | 'casual' | 'concise';
type MessageRole = 'user' | 'assistant';

type Thread = {
  id: string;
  title: string;
  preview: string;
  tone: Tone;
  updatedAt: string;
  isSaved?: boolean;
};

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

type DatabaseThread = {
  id: string;
  title: string;
  preview: string;
  tone: Tone;
  updated_at: string;
};

type DatabaseMessage = {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

const toneOptions: { value: Tone; label: string; detail: string }[] = [
  { value: 'professional', label: 'Professional', detail: 'Clear and polished' },
  { value: 'casual', label: 'Casual', detail: 'Warm and conversational' },
  { value: 'concise', label: 'Concise', detail: 'Direct and focused' },
];

const demoThread: Thread = {
  id: 'demo-aria',
  title: 'Launch plan for Q4',
  preview: 'Can you help me shape a launch plan…',
  tone: 'professional',
  updatedAt: 'Just now',
  isSaved: true,
};

const demoMessages: Message[] = [
  {
    id: 'demo-1',
    role: 'assistant',
    content: 'Good morning, Maya. I’m Aria, your thinking partner. What are we working through today?',
    createdAt: '09:41 AM',
  },
  {
    id: 'demo-2',
    role: 'user',
    content: 'Can you help me shape a launch plan for our Q4 product update? I want it to feel focused, not overwhelming.',
    createdAt: '09:42 AM',
  },
  {
    id: 'demo-3',
    role: 'assistant',
    content: 'Absolutely. A focused launch plan is easier to act on when it has one clear story, a small set of moments, and visible owners.\n\nI’d shape it around three beats:\n\n**1. Create anticipation**\nGive your audience one useful reason to care before the update arrives.\n\n**2. Make the moment feel effortless**\nLead with the clearest product outcome, then let people explore the detail.\n\n**3. Keep the conversation moving**\nFollow launch day with proof, answers, and a simple next step.\n\nWant me to turn this into a week-by-week plan with sample messaging?',
    createdAt: '09:42 AM',
  },
];

const promptStarters = [
  { icon: WandSparkles, label: 'Shape an idea', prompt: 'Help me shape an idea into a clear plan.' },
  { icon: FileText, label: 'Write something', prompt: 'Help me write a thoughtful announcement.' },
  { icon: Lightbulb, label: 'Think it through', prompt: 'Help me think through a difficult decision.' },
];

const formatTime = (date: Date): string =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatThreadDate = (value: string): string => {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return 'Today';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const createLocalThread = (): Thread => ({
  id: `local-${Date.now()}`,
  title: 'New conversation',
  preview: 'Start a new thought…',
  tone: 'professional',
  updatedAt: 'New',
});

const replyFor = (prompt: string, tone: Tone): string => {
  const normalizedPrompt = prompt.toLowerCase();
  const opening = tone === 'casual'
    ? 'Absolutely — let’s make this feel simple and useful.'
    : tone === 'concise'
      ? 'Here’s a focused way to approach it.'
      : 'Absolutely. Here’s a clear way to approach it.';

  if (normalizedPrompt.includes('decision')) {
    return `${opening}\n\nStart by separating the decision into three parts:\n\n**What matters most**\nName the outcome you want, not just the options in front of you.\n\n**What you know**\nList the facts, constraints, and assumptions that should shape the choice.\n\n**What you can test**\nLook for a small next step that creates useful information without locking you in.\n\nIf you share the decision, I can help you map the trade-offs and choose a practical next move.`;
  }

  if (normalizedPrompt.includes('announcement') || normalizedPrompt.includes('write')) {
    return `${opening}\n\nA strong announcement usually needs four pieces:\n\n**The headline**\nLead with the change and why it matters.\n\n**The human benefit**\nShow what becomes easier, faster, or more possible.\n\n**The proof**\nAdd one specific detail that makes the message credible.\n\n**The next step**\nTell people exactly what to do next.\n\nSend me the audience and the main idea, and I’ll turn this into a polished draft.`;
  }

  return `${opening}\n\nLet’s turn the thought into something actionable:\n\n**1. Define the outcome**\nWhat should be different when this is done?\n\n**2. Choose the smallest useful first step**\nMake it easy to start and easy to evaluate.\n\n**3. Create a simple rhythm**\nA short sequence of focused actions will keep the idea moving.\n\n**4. Leave room to learn**\nUse the first pass to gather signal, then improve from there.\n\nTell me a little more about the context and I’ll help you build the next version.`;
};

function App() {
  const [threads, setThreads] = useState<Thread[]>([demoThread]);
  const [activeThreadId, setActiveThreadId] = useState(demoThread.id);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({ [demoThread.id]: demoMessages });
  const [tone, setTone] = useState<Tone>('professional');
  const [composerValue, setComposerValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isToneOpen, setIsToneOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? demoThread;
  const activeMessages = useMemo(() => messagesByThread[activeThreadId] ?? [], [activeThreadId, messagesByThread]);
  const filteredThreads = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => `${thread.title} ${thread.preview}`.toLowerCase().includes(query));
  }, [searchValue, threads]);

  useEffect(() => {
    const loadWorkspace = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, title, preview, tone, updated_at')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const loadedThreads = (data as DatabaseThread[]).map((thread) => ({
          id: thread.id,
          title: thread.title,
          preview: thread.preview,
          tone: thread.tone,
          updatedAt: formatThreadDate(thread.updated_at),
        }));
        setThreads(loadedThreads);
        setActiveThreadId(loadedThreads[0].id);
        setTone(loadedThreads[0].tone);

        const { data: loadedMessages } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('thread_id', loadedThreads[0].id)
          .order('created_at', { ascending: true });

        if (loadedMessages) {
          setMessagesByThread({
            [loadedThreads[0].id]: (loadedMessages as DatabaseMessage[]).map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              createdAt: formatTime(new Date(message.created_at)),
            })),
          });
        }
      }
      setIsLoading(false);
    };

    void loadWorkspace();
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [activeMessages, isStreaming]);

  const selectThread = async (thread: Thread): Promise<void> => {
    setActiveThreadId(thread.id);
    setTone(thread.tone);
    setIsSidebarOpen(false);
    setErrorMessage('');

    if (messagesByThread[thread.id] || thread.id.startsWith('local-') || thread.id === 'demo-aria') return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessagesByThread((current) => ({
        ...current,
        [thread.id]: (data as DatabaseMessage[]).map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: formatTime(new Date(message.created_at)),
        })),
      }));
    }
  };

  const startNewConversation = useCallback((): void => {
    const newThread = createLocalThread();
    setThreads((current) => [newThread, ...current]);
    setActiveThreadId(newThread.id);
    setTone('professional');
    setComposerValue('');
    setErrorMessage('');
    setIsSidebarOpen(false);
    composerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        startNewConversation();
      } else if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [startNewConversation]);

  const updateThread = (threadId: string, updates: Partial<Thread>): void => {
    setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, ...updates } : thread));
  };

  const ensurePersistedThread = async (thread: Thread, firstPrompt: string): Promise<string | null> => {
    if (!thread.id.startsWith('local-') && thread.id !== 'demo-aria') return thread.id;

    const nextTitle = firstPrompt.length > 34 ? `${firstPrompt.slice(0, 34)}…` : firstPrompt;
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({ title: nextTitle, preview: firstPrompt, tone })
      .select('id, title, preview, tone, updated_at')
      .maybeSingle();

    if (error || !data) return null;

    const persistedThread = data as DatabaseThread;
    const nextThread: Thread = {
      id: persistedThread.id,
      title: persistedThread.title,
      preview: persistedThread.preview,
      tone: persistedThread.tone,
      updatedAt: 'Today',
    };
    setThreads((current) => current.map((item) => item.id === thread.id ? nextThread : item));
    setActiveThreadId(persistedThread.id);
    setMessagesByThread((current) => ({ ...current, [persistedThread.id]: [] }));
    return persistedThread.id;
  };

  const handleSubmit = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault();
    const prompt = composerValue.trim();
    if (!prompt || isStreaming) return;

    setErrorMessage('');
    const currentThread = activeThread;
    const persistedThreadId = await ensurePersistedThread(currentThread, prompt);
    if (!persistedThreadId) {
      setErrorMessage('Your message could not be saved. Please try again.');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: formatTime(new Date()),
    };
    const response = replyFor(prompt, tone);
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: formatTime(new Date()),
    };

    setComposerValue('');
    setMessagesByThread((current) => ({
      ...current,
      [persistedThreadId]: [...(current[persistedThreadId] ?? []), userMessage, assistantMessage],
    }));
    updateThread(persistedThreadId, { preview: prompt, title: currentThread.title === 'New conversation' ? prompt.slice(0, 34) : currentThread.title, updatedAt: 'Today', tone });
    setIsStreaming(true);

    const { error: userSaveError } = await supabase.from('chat_messages').insert({
      thread_id: persistedThreadId,
      role: 'user',
      content: prompt,
    });

    if (userSaveError) {
      setErrorMessage('Your message is showing here, but could not be saved.');
    }

    for (let index = 0; index < response.length; index += 1) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 14));
      const partialResponse = response.slice(0, index + 1);
      setMessagesByThread((current) => ({
        ...current,
        [persistedThreadId]: (current[persistedThreadId] ?? []).map((message) => message.id === assistantMessage.id ? { ...message, content: partialResponse } : message),
      }));
    }

    const { error: assistantSaveError } = await supabase.from('chat_messages').insert({
      thread_id: persistedThreadId,
      role: 'assistant',
      content: response,
    });

    await supabase.from('chat_threads').update({ preview: response.slice(0, 80), tone, updated_at: new Date().toISOString() }).eq('id', persistedThreadId);
    if (assistantSaveError) setErrorMessage('The response is complete, but could not be saved.');
    setIsStreaming(false);
  };

  const handleDeleteThread = async (): Promise<void> => {
    if (activeThread.id.startsWith('local-') || activeThread.id === 'demo-aria') {
      const newThread = createLocalThread();
      setThreads((current) => [newThread, ...current.filter((thread) => thread.id !== activeThread.id)]);
      setActiveThreadId(newThread.id);
      setTone('professional');
      setComposerValue('');
      return;
    }

    await supabase.from('chat_threads').delete().eq('id', activeThread.id);
    const remainingThreads = threads.filter((thread) => thread.id !== activeThread.id);
    setThreads(remainingThreads);
    if (remainingThreads.length > 0) {
      await selectThread(remainingThreads[0]);
    } else {
      startNewConversation();
    }
  };

  const showToast = (message: string): void => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2400);
  };

  const handleCopyMessage = async (message: Message): Promise<void> => {
    if (!navigator.clipboard) {
      setErrorMessage('Copy is not available in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      showToast('Response copied to your clipboard');
      window.setTimeout(() => setCopiedMessageId(null), 1800);
    } catch {
      setErrorMessage('The response could not be copied.');
    }
  };

  const renderMessageContent = (content: string): JSX.Element[] => content.split('\n').map((line, index) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={`${line}-${index}`} className="message-line">
        {parts.map((part, partIndex) => part.startsWith('**') && part.endsWith('**') ? <strong key={`${part}-${partIndex}`}>{part.slice(2, -2)}</strong> : part)}
      </span>
    );
  });

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup">
            <div className="brand-mark"><Sparkles size={17} strokeWidth={2.5} /></div>
            <span>aria</span>
          </div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)}><X size={18} /></button>
        </div>

        <button className="new-chat-button" onClick={startNewConversation}>
          <Plus size={17} strokeWidth={2.4} />
          <span>New conversation</span>
          <span className="shortcut"><Command size={12} /> K</span>
        </button>

        <div className="sidebar-search">
          <Search size={16} />
          <input ref={searchRef} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
          <span className="search-shortcut">/</span>
        </div>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <button className="nav-item active"><MessageSquare size={16} /> Conversations <span className="nav-count">{threads.length}</span></button>
          <button className="nav-item"><Bookmark size={16} /> Saved prompts</button>
          <button className="nav-item"><Archive size={16} /> Archive</button>
        </nav>

        <div className="history-heading"><span>Recent</span><button aria-label="More history options"><MoreHorizontal size={17} /></button></div>
        <div className="thread-list">
          {filteredThreads.length === 0 ? <div className="empty-history">No conversations match that search.</div> : filteredThreads.map((thread) => (
            <button key={thread.id} className={`thread-item ${thread.id === activeThreadId ? 'selected' : ''}`} onClick={() => void selectThread(thread)}>
              <span className="thread-icon"><MessageSquare size={15} /></span>
              <span className="thread-copy"><strong>{thread.title}</strong><small>{thread.preview}</small></span>
              <span className="thread-date">{thread.updatedAt}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Zap size={15} fill="currentColor" /></div>
            <div><strong>Go further with Aria</strong><span>Unlock deeper thinking</span></div>
            <ArrowUpRight size={15} />
          </div>
          <div className="profile-row">
            <div className="avatar">MK</div>
            <div className="profile-copy"><strong>Maya Kapoor</strong><span>Personal workspace</span></div>
            <Settings2 size={17} />
          </div>
        </div>
      </aside>

      {isSidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeThread.title}</strong></div>
          <div className="topbar-actions">
            <div className="live-indicator"><span className="live-dot" /> Live workspace</div>
            <button className="icon-button" aria-label="More conversation options"><MoreHorizontal size={19} /></button>
          </div>
        </header>

        <div className="conversation-wrap">
          <div className="conversation-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> Thinking space</div>
              <h1>{activeThread.title}</h1>
              <p>Private notes, sharper thinking, and a little momentum.</p>
            </div>
            <div className="conversation-actions">
              <button className="subtle-button"><Bookmark size={15} /> Save</button>
              <button className="subtle-button danger-button" onClick={() => void handleDeleteThread()}><Trash2 size={15} /> Delete</button>
            </div>
          </div>

          <div className="message-scroll" ref={scrollRef}>
            {isLoading ? <div className="loading-state"><div className="loading-orb"><Sparkles size={18} /></div><span>Preparing your workspace…</span></div> : activeMessages.length === 0 ? (
              <div className="welcome-state">
                <div className="welcome-orb"><Sparkles size={24} /></div>
                <span className="welcome-label">A fresh page</span>
                <h2>What would you like to<br />think through?</h2>
                <p>Bring a question, a half-formed idea, or a blank page. We’ll find the next step together.</p>
                <div className="starter-grid">
                  {promptStarters.map(({ icon: Icon, label, prompt }) => <button key={label} className="starter-card" onClick={() => { setComposerValue(prompt); composerRef.current?.focus(); }}><Icon size={18} /><span>{label}</span><ArrowUpRight size={14} /></button>)}
                </div>
              </div>
            ) : (
              <div className="messages">
                {activeMessages.map((message) => <article key={message.id} className={`message-row ${message.role}`}>
                  <div className={`message-avatar ${message.role === 'assistant' ? 'aria-avatar' : 'maya-avatar'}`}>{message.role === 'assistant' ? <Sparkles size={15} /> : 'MK'}</div>
                  <div className="message-body">
                    <div className="message-meta"><strong>{message.role === 'assistant' ? 'Aria' : 'You'}</strong><span>{message.createdAt}</span>{message.role === 'assistant' && <span className="response-label">Response</span>}</div>
                    <div className="message-content">{renderMessageContent(message.content)}{message.role === 'assistant' && isStreaming && message.id === activeMessages[activeMessages.length - 1]?.id && <span className="typing-cursor" />}</div>
                    {message.role === 'assistant' && message.content && !isStreaming && <div className="message-tools"><button onClick={() => showToast('Thanks for the feedback')}><Check size={13} /> Helpful</button><button onClick={() => void handleCopyMessage(message)}><Copy size={13} /> {copiedMessageId === message.id ? 'Copied' : 'Copy response'}</button></div>}
                  </div>
                </article>)}
              </div>
            )}
          </div>

          <div className="composer-area">
            {errorMessage && <div className="inline-error">{errorMessage}</div>}
            <div className="composer-shell">
              <form className="composer-form" onSubmit={(event) => void handleSubmit(event)}>
                <textarea ref={composerRef} value={composerValue} onChange={(event) => setComposerValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSubmit(); } }} placeholder="Ask Aria anything…" rows={1} aria-label="Message Aria" />
                <div className="composer-footer">
                  <div className="composer-tools"><button type="button" aria-label="Attach a file"><Paperclip size={17} /></button><button type="button" aria-label="Voice input"><Headphones size={17} /></button><span className="composer-hint">Shift + Enter for a new line</span></div>
                  <div className="composer-send-wrap"><span className="composer-model"><span className="model-dot" /> Aria 1.0 <ChevronDown size={14} /></span><button className="send-button" type="submit" disabled={!composerValue.trim() || isStreaming} aria-label="Send message"><Send size={16} /></button></div>
                </div>
              </form>
            </div>
            <div className="composer-meta"><div className="tone-control"><span>Response tone</span><div className="tone-picker"><button className="tone-trigger" onClick={() => setIsToneOpen((current) => !current)}><span className="tone-dot" />{toneOptions.find((option) => option.value === tone)?.label}<ChevronDown size={13} /></button>{isToneOpen && <div className="tone-menu">{toneOptions.map((option) => <button key={option.value} className={option.value === tone ? 'tone-selected' : ''} onClick={() => { setTone(option.value); setIsToneOpen(false); if (!activeThread.id.startsWith('local-') && activeThread.id !== 'demo-aria') void supabase.from('chat_threads').update({ tone: option.value }).eq('id', activeThread.id); }}><span><strong>{option.label}</strong><small>{option.detail}</small></span>{option.value === tone && <Check size={15} />}</button>)}</div>}</div></div><span className="secure-note"><span className="secure-dot" /> Your thoughts stay yours</span></div>
          </div>
        </div>
      </main>
      {toastMessage && <div className="toast-message" role="status"><Check size={15} /> {toastMessage}</div>}
    </div>
  );
}

export default App;
