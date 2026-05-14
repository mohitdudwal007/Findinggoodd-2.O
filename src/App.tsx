import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Star, Search, Menu, Play, X, Trash2, Plus, LogOut, Edit } from 'lucide-react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDocFromServer, query, orderBy } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- MOCK DATA ---
type Movie = {
  id: string | number;
  title: string;
  director: string;
  year: string;
  rating: number;
  poster: string;
  genre: string;
  size: string;
  downloadLink?: string;
};

const INITIAL_MOVIES: Movie[] = [
  {
    id: 1,
    title: 'ECHELON',
    director: 'Ridley V.',
    year: '2024',
    rating: 8.9,
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
    genre: 'Sci-Fi',
    size: '4.2 GB',
  },
  {
    id: 2,
    title: 'NIGHTRUN',
    director: 'Michael M.',
    year: '2025',
    rating: 7.5,
    poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=800&auto=format&fit=crop',
    genre: 'Action',
    size: '3.8 GB',
  },
  {
    id: 3,
    title: 'VOID',
    director: 'Christopher N.',
    year: '2023',
    rating: 9.2,
    poster: 'https://images.unsplash.com/photo-1535016120720-40c7467d5283?q=80&w=800&auto=format&fit=crop',
    genre: 'Thriller',
    size: '5.1 GB',
  },
  {
    id: 4,
    title: 'THE GRID',
    director: 'Denis V.',
    year: '2026',
    rating: 8.4,
    poster: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
    genre: 'Cyberpunk',
    size: '6.0 GB',
  },
  {
    id: 5,
    title: 'NEON TEARS',
    director: 'Wong K.',
    year: '2022',
    rating: 8.1,
    poster: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=800&auto=format&fit=crop',
    genre: 'Drama',
    size: '2.9 GB',
  },
  {
    id: 6,
    title: 'OBSCURA',
    director: 'David F.',
    year: '2024',
    rating: 7.8,
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop',
    genre: 'Mystery',
    size: '3.5 GB',
  },
];

// --- COMPONENTS ---

const Navbar = ({
  searchQuery,
  setSearchQuery,
  onBrandTripleClick,
  onRequestClick,
  siteName,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onBrandTripleClick: () => void;
  onRequestClick: () => void;
  siteName: string;
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const clickCount = useRef(0);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleBrandClick = () => {
    clickCount.current += 1;
    if (clickCount.current >= 3) {
      onBrandTripleClick();
      clickCount.current = 0;
    }
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      clickCount.current = 0;
    }, 500);
  };

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 w-full z-50 px-12 py-8 flex items-center justify-between border-b border-white/5 bg-[#050505]/80 backdrop-blur-md"
    >
      <div 
        onClick={handleBrandClick}
        className={`text-2xl font-black tracking-tighter uppercase italic transition-opacity cursor-pointer select-none ${isSearchOpen ? 'opacity-0 hidden md:block' : 'opacity-100'}`}
      >
        {siteName}
      </div>
      
      <div className="flex-1 flex justify-end">
        <motion.div 
          layout
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className={`flex items-center overflow-hidden ${isSearchOpen ? 'w-full md:w-96 bg-[#111] border border-white/10 rounded-none px-4 py-2' : 'w-auto h-auto'}`}
        >
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`${isSearchOpen ? 'text-white shrink-0' : 'text-white/50 hover:text-white shrink-0'} transition-colors mt-1`}
          >
            {isSearchOpen ? <X size={18} strokeWidth={2} /> : <Search size={20} strokeWidth={2} />}
          </button>
          
          <AnimatePresence>
            {isSearchOpen && (
              <motion.input
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                type="text"
                autoFocus
                placeholder="Search movies or genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-[0.2em] text-white placeholder:text-white/30 ml-4 w-full"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {!isSearchOpen && (
        <div className="flex gap-8 items-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 ml-8">
          <button onClick={onRequestClick} className="hover:text-white transition-colors border border-white/20 px-4 py-2 text-[8px] md:text-[10px]">
            Request Movie
          </button>
          <button className="hover:text-white transition-colors hidden md:block">
            <Menu size={20} strokeWidth={2} />
          </button>
        </div>
      )}
    </motion.nav>
  );
};

const Hero = () => (
  <section className="relative h-[70vh] min-h-[600px] flex items-center px-6 md:px-12 xl:px-24 overflow-hidden mb-12">
    <div className="absolute -left-4 top-24 text-[120px] lg:text-[180px] font-black text-white/5 select-none pointer-events-none z-0 tracking-tighter">FEATURED</div>
    
    <div className="max-w-5xl relative z-10 w-full mt-24">
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-6 flex items-center gap-4"
      >
        <span>Curated Cinema</span>
        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
        <span>High Quality</span>
      </motion.p>
      
      <motion.h1 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-6xl md:text-8xl lg:text-9xl font-light tracking-tight leading-none mb-8 italic"
      >
        Download <br /> 
        <span className="font-black not-italic text-white">
          The Void.
        </span>
      </motion.h1>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
      >
        <button className="px-10 py-5 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all flex items-center gap-4 group">
          <span>Explore Catalog</span>
          <Play size={14} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>

    {/* Abstract geometric decoration */}
    <motion.div 
      initial={{ opacity: 0, rotate: 10, scale: 0.9 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
      className="absolute right-[-10%] top-[20%] w-[50vw] h-[50vw] border-[1px] border-white/5 rounded-full mix-blend-screen opacity-30 pointer-events-none hidden lg:block"
    />
  </section>
);

const MovieRequestModal = ({ onClose }: { onClose: () => void }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newId = Date.now().toString();
      await setDoc(doc(db, 'movieRequests', newId), {
        title,
        message,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'movieRequests');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <button onClick={onClose} className="absolute top-8 right-12 text-white/50 hover:text-white transition-colors duration-300">
        <X size={24} />
      </button>

      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#111] border border-white/5 p-8 shadow-2xl relative overflow-hidden"
      >
        <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-8 relative z-10 text-white">Request a Movie</h2>
        
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
            <div className="text-white mb-2 text-lg font-bold">Request Submitted</div>
            <div className="text-white/50 text-[10px] tracking-widest uppercase font-bold">We will try to add it soon.</div>
            <button onClick={onClose} className="mt-8 px-6 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
            <div>
              <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 block mb-2">Movie Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-sm text-white outline-none focus:border-white/40 transition-colors"
                required 
              />
            </div>
            <div>
              <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 block mb-2">Message (Optional)</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-sm text-white outline-none focus:border-white/40 transition-colors resize-none h-24"
              />
            </div>
            
            <button type="submit" disabled={isSubmitting} className="mt-4 px-6 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};

const TermsModal = ({ onClose }: { onClose: () => void }) => {
  const [content, setContent] = useState('Loading...');
  const [title, setTitle] = useState('Terms & Conditions');

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const docRef = doc(db, 'pages', 'terms');
        const docSnap = await getDocFromServer(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data().content);
          setTitle(docSnap.data().title);
        } else {
          setContent('Terms and conditions not found.');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'pages/terms');
        setContent('Error loading terms.');
      }
    };
    fetchTerms();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <button onClick={onClose} className="absolute top-8 right-12 text-white/50 hover:text-white transition-colors duration-300">
        <X size={24} />
      </button>

      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl bg-[#111] border border-white/5 p-8 lg:p-12 shadow-2xl relative overflow-y-auto max-h-[85vh] thin-scrollbar"
      >
        <h2 className="text-2xl lg:text-4xl font-black tracking-tighter uppercase italic mb-8 relative z-10 text-white">{title}</h2>
        <div className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap font-medium">
          {content}
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdminLogin = ({ onLogin, onClose }: { onLogin: () => void, onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Invalid ID or Password');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <button onClick={onClose} className="absolute top-8 right-12 text-white/50 hover:text-white transition-colors duration-300">
        <X size={24} />
      </button>

      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#111] border border-white/5 p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Menu size={120} />
        </div>
        
        <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-8 relative z-10">Admin Access</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
          <div>
            <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 block mb-2">ID (Email)</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-sm text-white outline-none focus:border-white/40 transition-colors"
              required 
            />
          </div>
          <div>
            <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 block mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-sm text-white outline-none focus:border-white/40 transition-colors"
              required 
            />
          </div>
          
          {error && <div className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</div>}
          
          <button type="submit" className="mt-4 px-6 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center">
            Authenticate
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const AdminDashboard = ({ 
  movies, 
  setMovies, 
  requests,
  onLogout, 
  onClose,
  siteName,
  copyrightText
}: { 
  movies: Movie[]; 
  setMovies: (movies: Movie[]) => void; 
  requests: any[];
  onLogout: () => void; 
  onClose: () => void; 
  siteName: string;
  copyrightText: string;
}) => {
  const [newMovie, setNewMovie] = useState({
    title: '', director: '', year: '', rating: '', poster: '', genre: '', size: '', downloadLink: ''
  });
  const [editingId, setEditingId] = useState<number | string | null>(null);

  const [activeTab, setActiveTab] = useState<'movies' | 'requests' | 'pages' | 'ads' | 'settings'>('movies');
  const [termsContent, setTermsContent] = useState('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  const [adminSiteName, setAdminSiteName] = useState(siteName);
  const [adminCopyrightText, setAdminCopyrightText] = useState(copyrightText || '');
  const [isSavingSiteName, setIsSavingSiteName] = useState(false);

  useEffect(() => {
    setAdminSiteName(siteName);
    setAdminCopyrightText(copyrightText || '');
  }, [siteName, copyrightText]);

  const [adContent, setAdContent] = useState('');
  const [adPosterUrl, setAdPosterUrl] = useState('');
  const [adIsActive, setAdIsActive] = useState(false);
  const [adTimerSeconds, setAdTimerSeconds] = useState(10);
  const [isSavingAd, setIsSavingAd] = useState(false);

  useEffect(() => {
    if (activeTab === 'pages') {
      const fetchTerms = async () => {
        try {
          const docSnap = await getDocFromServer(doc(db, 'pages', 'terms'));
          if (docSnap.exists()) {
             setTermsContent(docSnap.data().content);
          }
        } catch(err) {
           handleFirestoreError(err, OperationType.GET, 'pages/terms');
        }
      };
      fetchTerms();
    } else if (activeTab === 'ads') {
      const fetchAd = async () => {
        try {
          const docSnap = await getDocFromServer(doc(db, 'settings', 'adBanner'));
          if (docSnap.exists()) {
             setAdContent(docSnap.data().content);
             setAdPosterUrl(docSnap.data().posterUrl || '');
             setAdIsActive(docSnap.data().isActive);
             setAdTimerSeconds(docSnap.data().timerSeconds);
          }
        } catch(err) {
           handleFirestoreError(err, OperationType.GET, 'settings/adBanner');
        }
      };
      fetchAd();
    }
  }, [activeTab]);

  const handleSaveTerms = async () => {
    setIsSavingTerms(true);
    try {
      await setDoc(doc(db, 'pages', 'terms'), {
        title: 'Terms & Conditions',
        content: termsContent,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'pages/terms');
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleSaveAd = async () => {
    setIsSavingAd(true);
    try {
      await setDoc(doc(db, 'settings', 'adBanner'), {
        content: adContent,
        posterUrl: adPosterUrl,
        isActive: adIsActive,
        timerSeconds: Number(adTimerSeconds),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/adBanner');
    } finally {
      setIsSavingAd(false);
    }
  };

  const handleSaveSiteName = async () => {
    setIsSavingSiteName(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        siteName: adminSiteName,
        copyrightText: adminCopyrightText,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/site');
    } finally {
      setIsSavingSiteName(false);
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const docRef = doc(db, 'movies', editingId.toString());
        await setDoc(docRef, { ...newMovie, rating: Number(newMovie.rating), updatedAt: serverTimestamp() }, { merge: true });
        setEditingId(null);
      } else {
        const newId = Date.now().toString();
        const docRef = doc(db, 'movies', newId);
        await setDoc(docRef, { 
          ...newMovie, 
          rating: Number(newMovie.rating), 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        });
      }
      setNewMovie({ title: '', director: '', year: '', rating: '', poster: '', genre: '', size: '', downloadLink: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'movies');
    }
  };

  const handleEdit = (movie: Movie) => {
    setNewMovie({
      title: movie.title,
      director: movie.director,
      year: movie.year,
      rating: movie.rating.toString(),
      poster: movie.poster,
      genre: movie.genre,
      size: movie.size,
      downloadLink: movie.downloadLink || ''
    });
    setEditingId(movie.id);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteDoc(doc(db, 'movies', id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'movies');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-[#050505] overflow-y-auto"
    >
      <nav className="sticky top-0 z-50 px-6 lg:px-12 py-6 flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 bg-[#050505]/80 backdrop-blur-md gap-6 lg:gap-4">
        <div className="text-2xl font-black tracking-tighter uppercase italic flex items-center justify-between w-full lg:w-auto">
          <div>{siteName} <span className="text-white/30 text-sm hidden sm:inline">| ADMIN</span></div>
          <div className="flex gap-4 lg:hidden">
            <button onClick={onLogout} className="text-white/50 hover:text-white">
              <LogOut size={20} />
            </button>
            <button onClick={onClose} className="text-white/50 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex bg-[#111] border border-white/10 rounded-sm overflow-x-auto text-[10px] w-full lg:w-auto order-last lg:order-none snap-x">
          <button onClick={() => setActiveTab('movies')} className={`flex-1 lg:flex-none px-4 py-3 uppercase font-bold tracking-widest whitespace-nowrap snap-center ${activeTab === 'movies' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}>Movies</button>
          <button onClick={() => setActiveTab('requests')} className={`flex-1 lg:flex-none px-4 py-3 uppercase font-bold tracking-widest whitespace-nowrap snap-center ${activeTab === 'requests' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}>Requests</button>
          <button onClick={() => setActiveTab('pages')} className={`flex-1 lg:flex-none px-4 py-3 uppercase font-bold tracking-widest whitespace-nowrap snap-center ${activeTab === 'pages' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}>Terms</button>
          <button onClick={() => setActiveTab('ads')} className={`flex-1 lg:flex-none px-4 py-3 uppercase font-bold tracking-widest whitespace-nowrap snap-center ${activeTab === 'ads' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}>Ad Banner</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 lg:flex-none px-4 py-3 uppercase font-bold tracking-widest whitespace-nowrap snap-center ${activeTab === 'settings' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5'}`}>Settings</button>
        </div>

        <div className="hidden lg:flex gap-6">
          <button onClick={onLogout} className="text-[10px] tracking-widest uppercase font-bold text-white/50 hover:text-white flex items-center gap-2">
            <LogOut size={14} /> Logout
          </button>
          <button onClick={onClose} className="text-[10px] tracking-widest uppercase font-bold text-white/50 hover:text-white flex items-center gap-2">
             <X size={14} /> Close
          </button>
        </div>
      </nav>

      {activeTab === 'movies' && (
        <div className="px-12 py-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* ADD MOVIE FORM */}
          <div className="lg:col-span-1">
          <div className="bg-[#111] border border-white/5 p-8 shadow-2xl lg:sticky lg:top-32">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white border-b border-white/5 pb-4">
              {editingId ? 'Edit Title' : 'Add New Title'}
            </h3>
            <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-4">
              <input placeholder="Title" required value={newMovie.title} onChange={e => setNewMovie({...newMovie, title: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Director" required value={newMovie.director} onChange={e => setNewMovie({...newMovie, director: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Year" required value={newMovie.year} onChange={e => setNewMovie({...newMovie, year: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Rating (0-10)" required type="number" step="0.1" value={newMovie.rating} onChange={e => setNewMovie({...newMovie, rating: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Poster URL" required value={newMovie.poster} onChange={e => setNewMovie({...newMovie, poster: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Genre" required value={newMovie.genre} onChange={e => setNewMovie({...newMovie, genre: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Size (e.g. 2.4 GB)" required value={newMovie.size} onChange={e => setNewMovie({...newMovie, size: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              <input placeholder="Download Link (URL)" required value={newMovie.downloadLink} onChange={e => setNewMovie({...newMovie, downloadLink: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-xs text-white outline-none focus:border-white/40" />
              
              <button type="submit" className="mt-2 px-6 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                {editingId ? (
                  <>
                    <Edit size={16} /> Update Movie
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Add Movie
                  </>
                )}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setNewMovie({ title: '', director: '', year: '', rating: '', poster: '', genre: '', size: '', downloadLink: '' }); }} className="px-6 py-3 border border-white/20 text-white font-bold uppercase text-xs tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>

        {/* MOVIE LIST */}
        <div className="lg:col-span-2">
           <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white border-b border-white/5 pb-4">Manage Library</h3>
           <div className="flex flex-col gap-4">
             <AnimatePresence>
             {movies.map((m) => (
                <motion.div 
                  key={m.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#111] border border-white/5 p-4 flex items-center gap-4 group hover:bg-[#151515] transition-colors"
                >
                  <img src={m.poster} alt={m.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-16 h-24 object-cover transition-all duration-500" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-1">{m.title}</h4>
                    <p className="text-[10px] text-white/40 tracking-wide font-bold">{m.year} • {m.genre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(m)} className="p-3 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/20">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20">
                       <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
             ))}
             </AnimatePresence>
           </div>
        </div>
      </div>
      )}

      {/* ADD MOVIE REQUESTS HERE */}
      {activeTab === 'requests' && (
      <div className="px-12 py-12 max-w-7xl mx-auto w-full">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white border-b border-white/5 pb-4">User Movie Requests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {requests.map(req => (
               <motion.div 
                 key={req.id}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="bg-[#111] border border-white/5 p-6 flex flex-col gap-4 relative"
               >
                 <div className="flex-1">
                   <div className="flex justify-between items-start mb-2">
                     <h4 className="text-sm font-bold uppercase tracking-wider text-white">{req.title}</h4>
                     <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 ${req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : req.status === 'fulfilled' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                       {req.status}
                     </span>
                   </div>
                   <p className="text-[11px] text-white/50">{req.message || 'No message provided.'}</p>
                 </div>
                 <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5">
                   {req.status === 'pending' && (
                     <>
                       <button onClick={async () => {
                         try {
                           await setDoc(doc(db, 'movieRequests', req.id), { status: 'fulfilled', updatedAt: serverTimestamp() }, { merge: true });
                         } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'movieRequests'); }
                       }} className="flex-1 py-2 bg-green-500/10 text-green-500 text-[10px] uppercase font-bold hover:bg-green-500/20 border border-transparent transition-colors">Fulfill</button>
                       <button onClick={async () => {
                         try {
                           await setDoc(doc(db, 'movieRequests', req.id), { status: 'rejected', updatedAt: serverTimestamp() }, { merge: true });
                         } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'movieRequests'); }
                       }} className="flex-1 py-2 bg-red-500/10 text-red-500 text-[10px] uppercase font-bold hover:bg-red-500/20 border border-transparent transition-colors">Reject</button>
                     </>
                   )}
                   <button onClick={async () => {
                     try {
                        await deleteDoc(doc(db, 'movieRequests', req.id));
                     } catch(err) { handleFirestoreError(err, OperationType.DELETE, 'movieRequests'); }
                   }} className={`p-2 text-white/30 hover:text-white transition-colors border border-transparent ${req.status !== 'pending' ? 'w-full flex items-center justify-center gap-2' : ''}`}>
                     <Trash2 size={16}/> {req.status !== 'pending' ? 'Delete' : ''}
                   </button>
                 </div>
               </motion.div>
            ))}
          </AnimatePresence>
          {requests.length === 0 && (
            <div className="col-span-full py-12 text-center border border-white/5 bg-[#111]">
              <span className="text-[10px] tracking-widest uppercase font-bold text-white/40">No pending requests</span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* MANAGE PAGES HERE */}
      {activeTab === 'pages' && (
      <div className="px-12 py-12 max-w-5xl mx-auto w-full">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white border-b border-white/5 pb-4">Terms & Conditions Settings</h3>
        <div className="bg-[#111] border border-white/5 p-8 flex flex-col gap-6">
          <textarea 
            value={termsContent}
            onChange={(e) => setTermsContent(e.target.value)}
            placeholder="Enter Terms and Conditions... (Formatting is preserved)"
            className="w-full bg-[#1a1a1a] border border-white/10 p-6 text-sm text-white outline-none focus:border-white/40 transition-colors resize-y h-96 font-medium leading-relaxed"
          ></textarea>
          <div className="flex justify-end">
            <button 
              onClick={handleSaveTerms} 
              disabled={isSavingTerms}
              className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center disabled:opacity-50"
            >
              {isSavingTerms ? 'Saving...' : 'Save Terms'}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* MANAGE ADS HERE */}
      {activeTab === 'ads' && (
      <div className="px-12 py-12 max-w-5xl mx-auto w-full">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white border-b border-white/5 pb-4">Download Ad Banner Settings</h3>
        <div className="bg-[#111] border border-white/5 p-8 flex flex-col gap-6">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 flex-1 flex items-center justify-between">
              Enable Ad Banner Before Download
              <input 
                 type="checkbox" 
                 checked={adIsActive} 
                 onChange={(e) => setAdIsActive(e.target.checked)} 
                 className="w-5 h-5 accent-white ml-auto"
              />
            </label>
          </div>
          
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 block mb-3">Timer Duration (Seconds)</label>
            <input 
              type="number" 
              value={adTimerSeconds}
              onChange={(e) => setAdTimerSeconds(Number(e.target.value))}
              min={0}
              max={60}
              className="w-full bg-[#1a1a1a] border border-white/10 p-4 text-sm text-white outline-none focus:border-white/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 block mb-3">Ad Poster URL (Optional background image)</label>
            <input 
              type="text"
              value={adPosterUrl}
              onChange={(e) => setAdPosterUrl(e.target.value)}
              placeholder="https://example.com/poster.jpg"
              className="w-full bg-[#1a1a1a] border border-white/10 p-4 text-sm text-white outline-none focus:border-white/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 block mb-3">Ad Content (HTML/Text)</label>
            <textarea 
              value={adContent}
              onChange={(e) => setAdContent(e.target.value)}
              placeholder="<img src='ad.jpg' /> or Just text..."
              className="w-full bg-[#1a1a1a] border border-white/10 p-6 text-sm text-white outline-none focus:border-white/40 transition-colors resize-y h-64 font-mono text-xs leading-relaxed"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveAd} 
              disabled={isSavingAd}
              className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center disabled:opacity-50"
            >
              {isSavingAd ? 'Saving...' : 'Save Setting'}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* MANAGE SETTINGS HERE */}
      {activeTab === 'settings' && (
      <div className="px-12 py-12 max-w-5xl mx-auto w-full">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white border-b border-white/5 pb-4">General Website Settings</h3>
        <div className="bg-[#111] border border-white/5 p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 block mb-3">Website Name</label>
              <input 
                type="text" 
                value={adminSiteName}
                onChange={(e) => setAdminSiteName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 p-4 text-sm text-white outline-none focus:border-white/40 transition-colors"
                placeholder="Ex. Findinggoodd"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 block mb-3">Copyright Text</label>
              <input 
                type="text" 
                value={adminCopyrightText}
                onChange={(e) => setAdminCopyrightText(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 p-4 text-sm text-white outline-none focus:border-white/40 transition-colors"
                placeholder="Ex. Copyright 2026 Admin"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveSiteName} 
              disabled={isSavingSiteName}
              className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center disabled:opacity-50"
            >
              {isSavingSiteName ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
      )}
    </motion.div>
  );
};

const AdBannerModal = ({ movie, settings, onClose }: { movie: Movie, settings: any, onClose: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(settings?.timerSeconds || 10);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#050505]/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm"
    >
      <button onClick={onClose} className="absolute top-8 right-12 text-white/50 hover:text-white transition-colors duration-300 z-10">
        <X size={24} />
      </button>

      <div 
        className="w-full max-w-4xl bg-[#111] border border-white/10 p-4 md:p-8 relative flex flex-col h-[70vh] items-center justify-center text-center shadow-2xl bg-cover bg-center"
        style={settings?.posterUrl ? { backgroundImage: `url(${settings.posterUrl})` } : {}}
      >
         {settings?.posterUrl && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>}
         
         <div className="z-10 flex flex-col w-full h-full items-center justify-center">
           {/* Render Ad Content */}
           <div 
             className="flex-1 w-full overflow-auto mb-8 text-white/70 ad-content-container flex flex-col items-center justify-center" 
             dangerouslySetInnerHTML={{ __html: settings?.content || '<h3 class="text-2xl font-bold uppercase tracking-widest text-white/40">Advertisement</h3>' }} 
           />
           
           <div className="mt-auto flex flex-col items-center gap-4 w-full">
             {timeLeft > 0 ? (
               <div className="w-full px-6 py-4 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/20 text-white/50 text-xs font-bold uppercase tracking-widest">
                 Please wait {timeLeft} seconds to download...
               </div>
             ) : (
               <a 
                 href={movie.downloadLink} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 onClick={onClose}
                 className="w-full px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
               >
                 <Download size={16} /> Download
               </a>
             )}
           </div>
         </div>
      </div>
    </motion.div>
  );
};

const MovieCard: React.FC<{ movie: Movie, index: number, onDownloadClick: (movie: Movie) => void }> = React.memo(({ movie, index, onDownloadClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden bg-[#111] border border-white/5 rounded-sm flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-80 lg:h-96 bg-[#1a1a1a] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-black/20 to-transparent z-10"></div>
        <img 
          src={movie.poster} 
          alt={movie.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-0 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-bold border border-white/10 flex items-center gap-1 text-[#FFD700]">
          ★ <span className="text-white">{movie.rating}</span>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1 relative z-20 bg-[#111]">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-1 text-white">
          {movie.title}
        </h3>
        <p className="text-[10px] text-white/40 mb-4 tracking-wide font-bold">
          {movie.year} <span className="mx-1">•</span> {movie.genre}
        </p>
        
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-white/30 uppercase">{movie.size}</span>
          </div>
          
          <AnimatePresence>
            {isHovered && (
              <motion.button
                onClick={() => onDownloadClick(movie)}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full border border-white/20 hover:bg-white hover:text-black transition-colors duration-300 py-2 text-[10px] tracking-widest uppercase font-bold flex items-center justify-center gap-2 overflow-hidden text-white"
              >
                <Download size={14} />
                <span>Download</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [adSettings, setAdSettings] = useState<any>(null);
  const [siteName, setSiteName] = useState('Findinggoodd');
  const [copyrightText, setCopyrightText] = useState(`Copyright ${new Date().getFullYear()} Findinggoodd`);
  const [downloadingMovie, setDownloadingMovie] = useState<Movie | null>(null);

  useEffect(() => {
    const unsubAd = onSnapshot(doc(db, 'settings', 'adBanner'), (docSnap) => {
        if (docSnap.exists()) {
            setAdSettings(docSnap.data());
        }
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'settings/adBanner');
    });

    const unsubSite = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.siteName) {
                setSiteName(data.siteName);
                document.title = data.siteName;
            }
            if (data.copyrightText !== undefined) {
                setCopyrightText(data.copyrightText);
            }
        }
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'settings/site');
    });

    return () => {
      unsubAd();
      unsubSite();
    };
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    checkConnection();

    // Only subscribe to movies if it's public (we decided anyone can read)
    const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMovies: Movie[] = [];
      snapshot.forEach((doc) => {
        fetchedMovies.push({ id: doc.id as any, ...doc.data() } as Movie);
      });
      setMovies(fetchedMovies);
      setIsLoadingMovies(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'movies');
      setIsLoadingMovies(false);
    });

    // Check pre-existing auth for admin
    const authSub = auth.onAuthStateChanged((user) => {
      if (user && user.email === 'mohitdudwal007@gmail.com') {
        setIsAdminAuthenticated(true);
      } else {
        setIsAdminAuthenticated(false);
      }
    });

    return () => {
      unsubscribe();
      authSub();
    };
  }, []);

  useEffect(() => {
    let unsubscribeReq: (() => void) | undefined;
    if (isAdminAuthenticated) {
      const qReq = query(collection(db, 'movieRequests'), orderBy('createdAt', 'desc'));
      unsubscribeReq = onSnapshot(qReq, (snapshot) => {
        const fetchedReqs: any[] = [];
        snapshot.forEach((doc) => {
          fetchedReqs.push({ id: doc.id, ...doc.data() });
        });
        setRequests(fetchedReqs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'movieRequests');
      });
    }

    return () => {
      if (unsubscribeReq) unsubscribeReq();
    };
  }, [isAdminAuthenticated]);

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdminAuthenticated(false);
    setShowAdmin(false);
  };

  const filteredMovies = movies.filter(movie => {
    const q = searchQuery.toLowerCase();
    return movie.title.toLowerCase().includes(q) || movie.genre.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans overflow-x-hidden relative selection:bg-white selection:text-black">
      <Navbar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        onBrandTripleClick={() => setShowAdmin(true)} 
        onRequestClick={() => setShowRequestModal(true)}
        siteName={siteName}
      />

      <AnimatePresence>
        {downloadingMovie && (
          <AdBannerModal movie={downloadingMovie} settings={adSettings} onClose={() => setDownloadingMovie(null)} />
        )}
        {showTermsModal && (
          <TermsModal onClose={() => setShowTermsModal(false)} />
        )}
        {showRequestModal && (
          <MovieRequestModal onClose={() => setShowRequestModal(false)} />
        )}
        {showAdmin && !isAdminAuthenticated && (
           <AdminLogin 
             onLogin={() => setIsAdminAuthenticated(true)} 
             onClose={() => setShowAdmin(false)} 
           />
        )}
        {showAdmin && isAdminAuthenticated && (
           <AdminDashboard 
             movies={movies} 
             setMovies={setMovies} 
             requests={requests}
             onLogout={handleLogout}
             onClose={() => setShowAdmin(false)} 
             siteName={siteName}
             copyrightText={copyrightText}
           />
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col mt-24">
        <Hero />
        
        <section className="px-6 md:px-12 xl:px-24 pb-24">
          <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic">
              Latest Additions
            </h2>
            <button className="hidden md:flex text-white/40 hover:text-white transition-colors items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold group">
              View All <span className="text-lg leading-none transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
            {isLoadingMovies ? (
              // Loading Skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-80 lg:h-96 bg-[#111] animate-pulse relative overflow-hidden border border-white/5">
                  <div className="absolute top-4 right-4 bg-[#1a1a1a] w-12 h-4"></div>
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="h-6 w-3/4 bg-[#1a1a1a] mb-2"></div>
                    <div className="h-4 w-1/2 bg-[#1a1a1a]"></div>
                  </div>
                </div>
              ))
            ) : filteredMovies.length > 0 ? (
              filteredMovies.map((movie, idx) => (
                <MovieCard 
                   key={movie.id} 
                   movie={movie} 
                   index={idx} 
                   onDownloadClick={(m) => {
                     if (adSettings && adSettings.isActive) {
                       setDownloadingMovie(m);
                     } else {
                       window.open(m.downloadLink, '_blank');
                     }
                   }} 
                 />
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center border border-white/5 bg-[#111]">
                <div className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-2">
                  {searchQuery ? 'No Results Found' : 'No Movies'}
                </div>
                <div className="text-xl font-light tracking-tight italic text-white/70 text-center">
                  {searchQuery ? `We couldn't find anything matching "${searchQuery}"` : "No movies have been added yet."}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Footer Area */}
        <footer className="flex items-center justify-between px-12 py-6 border-t border-white/5 text-[9px] tracking-widest uppercase font-bold text-white/20 mt-12 flex-col md:flex-row gap-6">
          <div className="flex gap-8">
            <span>{copyrightText}</span>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors cursor-pointer uppercase">Terms & Conditions</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/40">Sorted by: Relevance</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-white/40 uppercase">Network Status: High Speed</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
