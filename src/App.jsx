import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Trash2, LogOut, Menu, X, Copy, Check, Lock, Mail, User, Eye, EyeOff, Upload, FileAudio, ChevronDown, Sparkles, Info } from 'lucide-react';

const API_BASE_URL = 'https://stt-backend-k837.onrender.com';

export default function EchoScribe() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentView, setCurrentView] = useState('home');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [transcriptionCount, setTranscriptionCount] = useState(0);
  const [transcriptionLimit] = useState(10);
  const [isPremium, setIsPremium] = useState(false);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
      loadHistory();
      checkPremiumStatus();
      checkTranscriptionCount();
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload = authMode === 'login' 
      ? { email: authData.email, password: authData.password }
      : { name: authData.name, email: authData.email, password: authData.password };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        setAuthData({ email: '', password: '', name: '' });
        setShowAuthModal(false);
        loadHistory();
        checkPremiumStatus();
        checkTranscriptionCount();
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Server error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setHistory([]);
    setTranscript('');
    setSelectedItem(null);
    setShowLogoutConfirm(false);
    setIsPremium(false);
    setTranscriptionCount(0);
  };

  const loadHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const checkPremiumStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/premium-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium || false);
      }
    } catch (err) {
      console.error('Error checking premium status:', err);
    }
  };

  const checkTranscriptionCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/transcription-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTranscriptionCount(data.count || 0);
      }
    } catch (err) {
      console.error('Error checking transcription count:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToDeepgram(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToDeepgram = async (audioBlob) => {
    if (!isPremium && transcriptionCount >= transcriptionLimit) {
      setShowPremiumModal(true);
      return;
    }

    setIsProcessing(true);
    const token = localStorage.getItem('token');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setTranscript(data.transcript);
        setSelectedItem(null);
        checkTranscriptionCount();
      } else {
        alert(data.error || 'Transcription failed');
      }
    } catch (err) {
      alert('Error transcribing audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/flac'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a|flac)$/i)) {
      alert('Please upload a valid audio file');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }

    setUploadingFile(true);
    await sendAudioToDeepgram(file);
    setUploadingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveTranscription = async () => {
    if (!transcript.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: transcript }),
      });

      if (response.ok) {
        showSuccess('Transcription saved successfully');
        setTranscript('');
        loadHistory();
      }
    } catch (err) {
      alert('Error saving transcription');
    }
  };

  const deleteTranscription = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadHistory();
        setSelectedItem(null);
        showSuccess('Transcription deleted');
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('Server error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {successMessage && (
        <div className="fixed top-6 right-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowPremiumModal(false)}>
          <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPremiumModal(false)} className="float-right p-2 hover:bg-slate-800 rounded-xl">
              <X size={20} className="text-slate-400" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-2xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                Upgrade to Premium
              </h2>
              <p className="text-slate-400 text-sm mb-2">Daily limit reached: {transcriptionCount}/{transcriptionLimit} used</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/80 rounded-2xl border border-purple-500/30 p-5 text-center">
                <h3 className="text-base font-bold text-white mb-2">Monthly</h3>
                <div className="text-2xl font-bold text-white mb-1">₹99</div>
                <p className="text-xs text-slate-500 mb-3">/month</p>
                <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl text-sm">
                  Get Started
                </button>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-blue-500/30 p-5 text-center relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  SAVE 33%
                </div>
                <h3 className="text-base font-bold text-white mb-2">6 Months</h3>
                <div className="text-2xl font-bold text-white mb-1">₹399</div>
                <p className="text-xs text-slate-500 mb-3">₹66.50/mo</p>
                <button className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold rounded-xl text-sm">
                  Get Started
                </button>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-emerald-500/30 p-5 text-center relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  SAVE 58%
                </div>
                <h3 className="text-base font-bold text-white mb-2">Yearly</h3>
                <div className="text-2xl font-bold text-white mb-1">₹999</div>
                <p className="text-xs text-slate-500 mb-3">₹83.25/mo</p>
                <button className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm">
                  Get Started
                </button>
              </div>

              <div className="bg-yellow-500/10 rounded-2xl border-2 border-yellow-500/50 p-5 text-center relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  BEST VALUE
                </div>
                <h3 className="text-base font-bold text-yellow-400 mb-2">Lifetime</h3>
                <div className="text-2xl font-bold text-yellow-400 mb-1">₹1,999</div>
                <p className="text-xs text-yellow-600 mb-3">One-time</p>
                <button className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl text-sm">
                  Get Lifetime
                </button>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
              <h3 className="text-lg font-bold text-white mb-3 text-center">Premium Features</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Unlimited Transcriptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Priority Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Export Options</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Premium Badge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAuthModal(false)}>
          <div className="bg-slate-900 border border-purple-500/20 rounded-3xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAuthModal(false)} className="float-right p-2 hover:bg-slate-800 rounded-xl">
              <X size={20} className="text-slate-400" />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-4">{authMode === 'signup' ? 'Create Account' : 'Sign In'}</h3>

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === 'signup' && (
                <input
                  type="text"
                  required
                  value={authData.name}
                  onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white"
                  placeholder="Full Name"
                />
              )}

              <input
                type="text"
                required
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                className="w-full px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white"
                placeholder="Email or Phone"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-50"
              >
                {authLoading ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="text-center mt-3">
              <button
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {authMode === 'login' ? 'New user? Sign up' : 'Have an account? Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900/40 backdrop-blur-xl border-b border-purple-500/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => navigateTo('home')} className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-10 h-10 rounded-2xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                EchoScribe
              </h1>
              {isAuthenticated && isPremium && (
                <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-0.5 rounded-lg">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span className="text-xs font-bold text-white">PRO</span>
                </div>
              )}
            </div>
          </button>
          
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigateTo('history')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                    currentView === 'history' ? 'bg-purple-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => navigateTo('profile')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                    currentView === 'profile' ? 'bg-purple-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Profile
                </button>
                {!isPremium && (
                  <button
                    onClick={() => setShowPremiumModal(true)}
                    className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl text-sm font-bold"
                  >
                    Premium
                  </button>
                )}
                <button onClick={handleLogout} className="px-3 py-2 text-red-400 hover:bg-red-950/50 rounded-xl text-sm font-semibold">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl text-sm font-semibold">
                Sign In
              </button>
            )}
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-300">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-500/10 p-4 space-y-2">
            {isAuthenticated ? (
              <>
                <button onClick={() => navigateTo('history')} className="w-full px-4 py-2 bg-slate-800 text-white rounded-xl text-sm">
                  History
                </button>
                <button onClick={() => navigateTo('profile')} className="w-full px-4 py-2 bg-slate-800 text-white rounded-xl text-sm">
                  Profile
                </button>
                {!isPremium && (
                  <button onClick={() => setShowPremiumModal(true)} className="w-full px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold">
                    Premium
                  </button>
                )}
                <button onClick={handleLogout} className="w-full px-4 py-2 bg-red-950/50 text-red-400 rounded-xl text-sm">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="w-full px-4 py-2 bg-purple-500 text-white rounded-xl text-sm">
                Sign In
              </button>
            )}
          </div>
        )}
      </header>

      {currentView === 'home' && (
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          {isAuthenticated && !isPremium && (
            <div className="bg-yellow-900/40 rounded-2xl border border-yellow-500/30 p-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Free Plan</p>
                    <p className="text-xs text-slate-300">{transcriptionCount}/{transcriptionLimit} used today</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl text-xs font-bold"
                >
                  Go Premium
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Transform Your Voice Into Text
              </h2>
              <p className="text-slate-400 text-sm">Click the button below to start recording</p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30"></div>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || uploadingFile}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${
                    isRecording 
                      ? 'bg-gradient-to-br from-red-500 to-pink-600' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-600'
                  }`}
                >
                  {isRecording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                </button>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-white mb-1">
                  {isRecording ? 'Recording...' : 'Ready to Record'}
                </p>
                {isRecording && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2">
                    <p className="text-xl font-mono text-red-400 font-bold">{formatTime(recordingTime)}</p>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  disabled={uploadingFile || isProcessing || isRecording}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-emerald-500/30 bg-emerald-900/40 rounded-xl cursor-pointer hover:border-emerald-500/50"
                >
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">
                    {uploadingFile ? 'Uploading...' : 'Upload Audio File'}
                  </span>
                </label>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-3 bg-blue-900/40 px-6 py-3 rounded-xl border border-blue-500/30">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <p className="text-blue-300 text-sm font-semibold">Processing...</p>
                </div>
              )}
            </div>

            {transcript && (
              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-white">Your Transcription</h3>
                  <button 
                    onClick={() => copyToClipboard(transcript)} 
                    className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
                  >
                    {copied ? <span className="flex items-center gap-2"><Check size={16} /> Copied!</span> : <span className="flex items-center gap-2"><Copy size={16} /> Copy</span>}
                  </button>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-5 text-slate-200 text-sm max-h-64 overflow-y-auto border border-purple-500/20">
                  {transcript}
                </div>
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={saveTranscription} 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-xl text-sm"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setTranscript('')} 
                    className="flex-1 bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'history' && (
        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">History</h2>

            {history.length === 0 ? (
              <div className="text-center py-16">
                <FileAudio className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Recordings Yet</h3>
                <button
                  onClick={() => navigateTo('home')}
                  className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl text-sm mt-4"
                >
                  Start Recording
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {history.map((item, idx) => (
                  <div key={item._id} className="bg-slate-800/50 rounded-2xl border border-purple-500/20 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center font-bold text-white text-sm">
                          {idx + 1}
                        </div>
                        <div className="text-xs text-slate-400">
                          <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTranscription(item._id)}
                        className="p-2 text-red-400 hover:bg-red-950/50 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-4 mb-4 max-h-32 overflow-y-auto">
                      <p className="text-slate-300 text-xs">{item.text}</p>
                    </div>

                    <button
                      onClick={() => copyToClipboard(item.text)}
                      className="w-full px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'profile' && (
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8">
            <h2 className="text-2xl font-bold text-white mb-8">Profile</h2>
            
            <div className="flex items-center justify-between mb-8 pb-8 border-b border-purple-500/20">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center relative">
                  <User className="w-10 h-10 text-white" />
                  {isPremium && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-1.5">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">{currentUser?.name}</h3>
                    {isPremium && (
                      <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-1 rounded-lg">
                        <Sparkles className="w-3 h-3 text-white" />
                        <span className="text-xs font-bold text-white">PRO</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{currentUser?.email}</p>
                </div>
              </div>
              
              {!isPremium && (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl text-sm font-bold"
                >
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  Upgrade
                </button>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-5">Change Password</h4>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                    placeholder="Current Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                    placeholder="New Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                  placeholder="Confirm New Password"
                />

                {passwordError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs">
                    {passwordError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 rounded-xl text-sm"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                    className="flex-1 bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl text-sm"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-500/20 rounded-3xl p-8 max-w-sm w-full">
            <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Confirm Logout</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">Are you sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
