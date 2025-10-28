import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Trash2, LogOut, Menu, X, Copy, Check, Lock, Mail, User, Eye, EyeOff, Upload, FileAudio, ChevronDown, Sparkles } from 'lucide-react';

const API_BASE_URL = 'https://stt-backend-k837.onrender.com';

export default function EchoScribe() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
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
  const [displayedText, setDisplayedText] = useState('');

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDisplayedText("Transform Your Voice Into Magical Text");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
      loadHistory();
    }
    setCurrentView('home');
    window.history.replaceState(null, '', '#home');
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.hash.slice(1) || 'home';
      setCurrentView(path);
    };

    const handleClickOutside = (e) => {
      if (showDownloadMenu && !e.target.closest('.download-menu-container')) {
        setShowDownloadMenu(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('mousedown', handleClickOutside);
    
    const path = window.location.hash.slice(1) || 'home';
    setCurrentView(path);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  const navigateTo = (view) => {
    setCurrentView(view);
    window.history.pushState(null, '', `#${view}`);
    setMobileMenuOpen(false);
  };

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

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

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
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Server error. Please try again.');
      console.error('Auth error:', err);
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
      console.error('Error accessing microphone:', err);
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
      } else {
        alert(data.error || 'Transcription failed');
      }
    } catch (err) {
      console.error('Error transcribing:', err);
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
      console.error('Error saving:', err);
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

  const downloadPDF = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/download?format=pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EchoScribe_${new Date().getTime()}.pdf`;
      a.click();
    } catch (err) {
      console.error('Error downloading:', err);
      alert('Error downloading PDF');
    }
  };

  const downloadTxt = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/download?format=txt`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EchoScribe_${new Date().getTime()}.txt`;
      a.click();
    } catch (err) {
      console.error('Error downloading:', err);
      alert('Error downloading TXT');
    }
  };

  const clearAllHistory = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAll = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadHistory();
        setSelectedItem(null);
        showSuccess('All transcriptions deleted');
        setShowClearAllConfirm(false);
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      setShowClearAllConfirm(false);
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
      console.error('Password change error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {successMessage && (
        <div className="fixed top-6 right-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-medium backdrop-blur-sm animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/20 rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Confirm Logout</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg shadow-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/20 rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Clear All History</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">This action cannot be undone. All transcriptions will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAll}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg shadow-orange-500/30"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowAuthModal(false)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/20 rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Welcome to EchoScribe</h3>
                  <p className="text-xs text-slate-400">Sign in to access all features</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-2xl">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      required
                      value={authData.name}
                      onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-sm shadow-lg shadow-purple-500/30"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-slate-500 text-xs mt-6 flex items-center justify-center gap-2">
              <Lock size={12} /> Secure authentication • Encrypted data
            </p>
          </div>
        </div>
      )}

      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-40 shadow-lg shadow-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button 
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">EchoScribe</h1>
              {isAuthenticated && <p className="text-xs text-slate-400 hidden sm:block">Welcome, {currentUser?.name}</p>}
            </div>
          </button>
          
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <React.Fragment>
                <button
                  onClick={() => navigateTo('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    currentView === 'history'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileAudio size={16} /> History
                </button>
                <button
                  onClick={() => navigateTo('profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    currentView === 'profile'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <User size={16} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-xl text-sm font-semibold transition-all duration-300"
                >
                  <LogOut size={16} /> Logout
                </button>
              </React.Fragment>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-purple-500/30"
              >
                <User size={16} /> Sign In
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-300"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-500/20 p-4 bg-slate-900/95 backdrop-blur-xl space-y-2">
            {isAuthenticated ? (
              <React.Fragment>
                <button 
                  onClick={() => navigateTo('history')}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    currentView === 'history' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <FileAudio size={16} /> History
                </button>
                <button 
                  onClick={() => navigateTo('profile')}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    currentView === 'profile' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <User size={16} /> Profile
                </button>
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-950/50 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all duration-300"
                >
                  <LogOut size={16} /> Logout
                </button>
              </React.Fragment>
            ) : (
              <button 
                onClick={() => {
                  setShowAuthModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/30"
              >
                <User size={16} /> Sign In
              </button>
            )}
          </div>
        )}
      </header>

      {currentView === 'home' && (
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          {!isAuthenticated && (
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-4 mb-6 shadow-lg shadow-purple-500/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Welcome to EchoScribe</p>
                    <p className="text-xs text-slate-300">Sign in to save and manage your transcriptions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl transition-all duration-300 text-xs font-semibold flex-shrink-0 shadow-lg shadow-purple-500/30"
                >
                  <User size={14} /> Sign In
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl shadow-purple-500/10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {displayedText}
              </h2>
              <p className="text-slate-400 text-sm">Click the button below to start recording</p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-pink-500 animate-ping opacity-30"></div>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || uploadingFile}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording 
                      ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/50' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-purple-500/50'
                  }`}
                >
                  {isRecording ? <MicOff className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                </button>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-white mb-1">
                  {isRecording ? 'Recording in Progress...' : 'Ready to Record'}
                </p>
                {isRecording && (
                  <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl px-4 py-2 mb-2">
                    <p className="text-2xl font-mono text-red-400 font-bold">{formatTime(recordingTime)}</p>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  {isRecording ? 'Click to stop and transcribe' : 'Press the microphone to start'}
                </p>
              </div>

              <div className="w-full max-w-sm">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.flac"
                  onChange={handleFileUpload}
                  disabled={uploadingFile || isProcessing || isRecording}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className={`flex items-center justify-center gap-3 px-6 py-3 border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 backdrop-blur-sm rounded-xl transition-all duration-300 cursor-pointer shadow-lg shadow-emerald-500/10 ${
                    uploadingFile || isProcessing || isRecording
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-emerald-500/50 hover:shadow-emerald-500/20'
                  }`}
                >
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">
                    {uploadingFile ? 'Uploading Audio...' : 'Upload Audio File'}
                  </span>
                </label>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-sm px-6 py-3 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/20">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <p className="text-blue-300 text-sm font-semibold">Processing your audio...</p>
                </div>
              )}
            </div>

            {transcript && (
              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Your Transcription
                  </h3>
                  <button 
                    onClick={() => copyToClipboard(transcript)} 
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-xl transition-all duration-300 font-semibold text-slate-300 hover:text-white border border-slate-700"
                  >
                    {copied ? (
                      <span className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-400" /> Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Copy size={16} /> Copy
                      </span>
                    )}
                  </button>
                </div>
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-5 text-slate-200 text-sm leading-relaxed max-h-64 overflow-y-auto border border-purple-500/20 shadow-inner">
                  {transcript}
                </div>
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={saveTranscription} 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-sm shadow-lg shadow-emerald-500/30"
                  >
                    Save Transcription
                  </button>
                  <button 
                    onClick={() => setTranscript('')} 
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-sm border border-slate-700"
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
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl shadow-purple-500/10">
            <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">Transcription History</h2>
                <p className="text-sm text-slate-400">You have {history.length} saved recordings</p>
              </div>
              <div className="flex gap-3">
                <div className="relative download-menu-container">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg shadow-blue-500/30"
                  >
                    <Download size={16} /> Download <ChevronDown size={16} />
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30 z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          downloadPDF();
                          setShowDownloadMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-300 flex items-center gap-2"
                      >
                        <Download size={14} /> PDF Format
                      </button>
                      <button
                        onClick={() => {
                          downloadTxt();
                          setShowDownloadMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-300 flex items-center gap-2"
                      >
                        <Download size={14} /> TXT Format
                      </button>
                    </div>
                  )}
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg shadow-orange-500/30"
                  >
                    <Trash2 size={16} /> Clear All
                  </button>
                )}
              </div>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileAudio className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Recordings Yet</h3>
                <p className="text-sm text-slate-400 mb-6">Start recording to see your transcriptions here</p>
                <button
                  onClick={() => navigateTo('home')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 text-sm shadow-lg shadow-purple-500/30"
                >
                  Start Recording Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {history.map((item, idx) => (
                  <div
                    key={item._id}
                    className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-5 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:border-purple-500/40"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-purple-500/30">
                          {idx + 1}
                        </div>
                        <div className="text-xs text-slate-400">
                          <p className="font-semibold">{new Date(item.createdAt).toLocaleDateString()}</p>
                          <p>{new Date(item.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTranscription(item._id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-xl transition-all duration-300"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-4 mb-4 max-h-32 overflow-y-auto border border-slate-700">
                      <p className="text-slate-300 text-xs leading-relaxed">{item.text}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(item.text)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all duration-300 text-xs font-semibold border border-slate-700"
                      >
                        <Copy size={14} /> Copy
                      </button>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-300 hover:text-purple-200 rounded-xl transition-all duration-300 text-xs font-semibold border border-purple-500/30"
                      >
                        View Full
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setSelectedItem(null)}>
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Full Transcription
                    </h3>
                    <p className="text-sm text-slate-400">
                      {new Date(selectedItem.createdAt).toLocaleDateString()} • {new Date(selectedItem.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-6 text-slate-200 text-sm leading-relaxed max-h-96 overflow-y-auto border border-purple-500/20 mb-6 shadow-inner">
                  {selectedItem.text}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(selectedItem.text)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-lg shadow-blue-500/30"
                  >
                    {copied ? (
                      <span className="flex items-center gap-2">
                        <Check size={18} /> Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Copy size={18} /> Copy Text
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      deleteTranscription(selectedItem._id);
                      setSelectedItem(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-lg shadow-red-500/30"
                  >
                    <Trash2 size={18} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === 'profile' && (
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl shadow-purple-500/10">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-8">Profile Settings</h2>
            
            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-purple-500/20">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{currentUser?.name}</h3>
                <p className="text-sm text-slate-400">{currentUser?.email}</p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Change Password
              </h4>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs font-medium">
                    {passwordError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-sm shadow-lg shadow-purple-500/30"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-sm border border-slate-700"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
