import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Trash2, LogOut, Menu, X, Copy, Check, Lock, Mail, User, Eye, EyeOff, Upload, FileAudio, ChevronDown, Sparkles, Shield, Info, Send, Phone, KeyRound } from 'lucide-react';

const API_BASE_URL = 'https://stt-backend-k837.onrender.com';

export default function EchoScribe() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '', phone: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  
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
  const [showFooterModal, setShowFooterModal] = useState(null);

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

    // Handle phone authentication
    if (authMode === 'phone') {
      if (!otpSent) {
        // Send OTP
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: authData.phone }),
          });

          const data = await response.json();

          if (response.ok) {
            setOtpSent(true);
            showSuccess('OTP sent to your phone');
          } else {
            setAuthError(data.error || 'Failed to send OTP');
          }
        } catch (err) {
          setAuthError('Server error. Please try again.');
          console.error('OTP send error:', err);
        }
      } else {
        // Verify OTP
        setOtpVerifying(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: authData.phone, otp }),
          });

          const data = await response.json();

          if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setIsAuthenticated(true);
            setCurrentUser(data.user);
            setAuthData({ email: '', password: '', name: '', phone: '' });
            setOtp('');
            setOtpSent(false);
            setShowAuthModal(false);
            loadHistory();
          } else {
            setAuthError(data.error || 'Invalid OTP');
          }
        } catch (err) {
          setAuthError('Server error. Please try again.');
          console.error('OTP verify error:', err);
        } finally {
          setOtpVerifying(false);
        }
      }
      return;
    }

    // Handle email/password authentication
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
        setAuthData({ email: '', password: '', name: '', phone: '' });
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

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        `${API_BASE_URL}/api/auth/google`,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        setAuthError('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Handle message from popup
      const messageHandler = (event) => {
        // Verify origin for security
        const allowedOrigins = [
          API_BASE_URL,
          'https://stt-backend-k837.onrender.com',
          'http://localhost:5000'
        ];
        
        if (!allowedOrigins.some(origin => event.origin.includes(origin.replace('https://', '').replace('http://', '')))) {
          return;
        }
        
        if (event.data && event.data.token) {
          localStorage.setItem('token', event.data.token);
          localStorage.setItem('user', JSON.stringify(event.data.user));
          setIsAuthenticated(true);
          setCurrentUser(event.data.user);
          setShowAuthModal(false);
          loadHistory();
          showSuccess('Successfully signed in with Google!');
          window.removeEventListener('message', messageHandler);
          clearInterval(pollTimer);
        }
      };

      window.addEventListener('message', messageHandler);

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          
          // Check if authentication succeeded
          const token = localStorage.getItem('token');
          if (!token) {
            setAuthError('Google sign-in was cancelled or failed. Please try again.');
          }
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);
        if (popup && !popup.closed) {
          popup.close();
        }
      }, 300000);
    } catch (err) {
      setAuthError('Google sign-in failed. Please try email/password or phone authentication.');
      console.error('Google auth error:', err);
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
                onClick={() => { setAuthMode('login'); setAuthError(''); setOtpSent(false); setOtp(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); setOtpSent(false); setOtp(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setAuthMode('phone'); setAuthError(''); setOtpSent(false); setOtp(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  authMode === 'phone'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Phone
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'phone' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="tel"
                        required
                        disabled={otpSent}
                        value={authData.phone}
                        onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300 disabled:opacity-50"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Enter OTP</label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                        <input
                          type="text"
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 text-sm bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all duration-300"
                          placeholder="123456"
                          maxLength={6}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                        className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                      >
                        Change phone number
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}

              {authError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={otpVerifying}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-sm shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {otpVerifying ? 'Verifying...' : 
                 authMode === 'phone' ? (otpSent ? 'Verify OTP' : 'Send OTP') :
                 authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {authMode !== 'phone' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-slate-900 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all duration-300 text-sm border border-gray-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </>
            )}

            <p className="text-center text-slate-500 text-xs mt-6 flex items-center justify-center gap-2">
              <Lock size={12} /> Secure authentication • Encrypted data
            </p>
          </div>
        </div>
      )}

      <header className="bg-slate-900/40 backdrop-blur-xl border-b border-purple-500/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
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
          <div className="md:hidden border-t border-purple-500/10 p-4 bg-slate-900/60 backdrop-blur-xl space-y-2">
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
      
      {/* Footer Modals */}
      {showFooterModal === 'terms' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowFooterModal(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Terms of Use</h3>
              </div>
              <button
                onClick={() => setShowFooterModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h4>
                <p>By accessing and using EchoScribe, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our service.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">2. Service Description</h4>
                <p>EchoScribe provides voice-to-text transcription services. We use advanced AI technology to convert your audio recordings into text format.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">3. User Responsibilities</h4>
                <p>You are responsible for maintaining the confidentiality of your account credentials. You agree not to use the service for any unlawful purposes or to upload content that infringes on others' rights.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">4. Privacy & Data</h4>
                <p>We respect your privacy. Your audio recordings and transcriptions are stored securely and are only accessible by you. We do not share your data with third parties without your consent.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">5. Service Limitations</h4>
                <p>While we strive for accuracy, transcription results may vary based on audio quality, accents, and background noise. We do not guarantee 100% accuracy.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">6. Modifications</h4>
                <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of any changes.</p>
              </div>
              
              <p className="text-xs text-slate-500 pt-4 border-t border-slate-700">Last updated: October 2025</p>
            </div>
          </div>
        </div>
      )}

      {showFooterModal === 'privacy' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowFooterModal(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Privacy Policy</h3>
              </div>
              <button
                onClick={() => setShowFooterModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Information We Collect</h4>
                <p>We collect information you provide directly, including your name, email address, and the audio recordings you upload for transcription.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">How We Use Your Information</h4>
                <p>Your information is used to provide and improve our transcription services, maintain your account, and communicate with you about service updates.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Data Security</h4>
                <p>We implement industry-standard security measures to protect your data. All communications are encrypted, and your recordings are stored securely on our servers.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Data Retention</h4>
                <p>Your transcriptions are stored until you choose to delete them. You have full control over your data and can delete any transcription at any time.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Third-Party Services</h4>
                <p>We use Deepgram API for transcription services. Your audio data is processed through their secure servers. We do not sell or share your personal information with advertisers.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Your Rights</h4>
                <p>You have the right to access, modify, or delete your personal data at any time through your profile settings.</p>
              </div>
              
              <p className="text-xs text-slate-500 pt-4 border-t border-slate-700">Last updated: October 2025</p>
            </div>
          </div>
        </div>
      )}

      {showFooterModal === 'about' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowFooterModal(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">About EchoScribe</h3>
              </div>
              <button
                onClick={() => setShowFooterModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Our Mission</h4>
                <p>EchoScribe is dedicated to making voice transcription accessible, accurate, and effortless. We believe in the power of AI to transform how people capture and preserve their spoken words.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">What We Offer</h4>
                <p>Our platform provides high-quality speech-to-text transcription powered by advanced AI technology. Whether you're recording meetings, interviews, lectures, or personal notes, EchoScribe delivers accurate transcriptions in seconds.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Key Features</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Real-time voice recording and transcription</li>
                  <li>Audio file upload support (MP3, WAV, OGG, M4A, FLAC)</li>
                  <li>Secure cloud storage for your transcriptions</li>
                  <li>Download transcriptions as PDF or TXT</li>
                  <li>User-friendly interface with modern design</li>
                  <li>Cross-device compatibility</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Technology</h4>
                <p>We leverage cutting-edge AI transcription technology to ensure high accuracy across various accents, languages, and audio qualities. Our infrastructure is built for speed, reliability, and security.</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Our Commitment</h4>
                <p>We're committed to protecting your privacy, maintaining the highest security standards, and continuously improving our service based on user feedback.</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 mt-6">
                <p className="text-center text-white font-semibold">Transform Your Voice Into Magical Text</p>
                <p className="text-center text-slate-400 text-xs mt-1">Powered by AI • Built with ❤️</p>
                <p className="text-center text-slate-500 text-xs mt-2">Made by Dinesh Chandra Mishra</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFooterModal === 'support' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowFooterModal(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Help & Support</h3>
              </div>
              <button
                onClick={() => setShowFooterModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6 text-slate-300 text-sm">
              <p className="text-base">Need help? We're here to assist you with any questions or issues.</p>
              
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-5">
                <h4 className="text-lg font-semibold text-white mb-3">📚 Knowledge Base</h4>
                <p className="mb-3">Find answers to common questions and learn how to get the most out of EchoScribe.</p>
                <button 
                  onClick={() => setShowFooterModal('faq')}
                  className="text-blue-400 hover:text-blue-300 font-semibold text-sm transition-colors"
                >
                  Browse FAQ →
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-purple-400" />
                    Getting Started
                  </h4>
                  <p className="text-xs text-slate-400">Learn the basics of using EchoScribe for transcription.</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Account & Security
                  </h4>
                  <p className="text-xs text-slate-400">Manage your account settings and security preferences.</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-orange-400" />
                    File Uploads
                  </h4>
                  <p className="text-xs text-slate-400">Supported formats, file size limits, and upload tips.</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-400" />
                    Exports & Downloads
                  </h4>
                  <p className="text-xs text-slate-400">Download your transcriptions in PDF or TXT format.</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-700">
                <h4 className="text-base font-semibold text-white mb-3">Still need help?</h4>
                <p className="text-slate-400 mb-3">Can't find what you're looking for? Our support team is ready to help.</p>
                <button 
                  onClick={() => setShowFooterModal('contact')}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg shadow-blue-500/30"
                >
                  Contact Support Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFooterModal === 'contact' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowFooterModal(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Contact Us</h3>
              </div>
              <button
                onClick={() => setShowFooterModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6 text-slate-300 text-sm">
              <p>We'd love to hear from you! Whether you have questions, feedback, or need support, feel free to reach out.</p>
              
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-400" />
                  Email Support
                </h4>
                <a 
                  href="mailto:dcm77040@gmail.com"
                  className="text-purple-400 hover:text-purple-300 font-semibold text-base transition-colors flex items-center gap-2"
                >
                  dcm77040@gmail.com
                </a>
                <p className="text-xs text-slate-400 mt-2">We typically respond within 24-48 hours</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Get Support For:</h4>
                <ul className="space-y-2 ml-2">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Technical issues or bugs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Account and billing questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Feature requests and suggestions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>General inquiries about EchoScribe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Partnership opportunities</span>
                  </li>
                </ul>
              </div>
              

            </div>
          </div>
        </div>
      )}

      {showFooterModal === 'faq' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setShowFooterModal(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">FAQ</h3>
              </div>
              <button
                onClick={() => setShowFooterModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5 text-slate-300 text-sm">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">What audio formats are supported?</h4>
                <p>EchoScribe supports MP3, WAV, OGG, WEBM, M4A, and FLAC audio formats. Maximum file size is 25MB.</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">How accurate is the transcription?</h4>
                <p>Our AI-powered transcription typically achieves 90-95% accuracy depending on audio quality, clarity, and accent. Clear audio with minimal background noise produces the best results.</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">Is my data secure?</h4>
                <p>Yes! All data is encrypted in transit and at rest. Your recordings and transcriptions are private and only accessible by you.</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">Can I download my transcriptions?</h4>
                <p>Absolutely! You can download your transcriptions in both PDF and TXT formats from the History page.</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">How long are transcriptions stored?</h4>
                <p>Your transcriptions are stored indefinitely until you choose to delete them. You have full control over your data.</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">Can I use EchoScribe offline?</h4>
                <p>Currently, EchoScribe requires an internet connection for transcription as we use cloud-based AI processing for the best accuracy.</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-base font-semibold text-white mb-2">What languages are supported?</h4>
                <p>EchoScribe currently supports English transcription. We're working on adding more languages in future updates.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900/40 backdrop-blur-xl border-t border-purple-500/10 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-5">
            {/* Brand Section */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">EchoScribe</h3>
              </div>
              <p className="text-slate-400 text-xs max-w-xs">
                Transform your voice into magical text with our AI-powered transcription service. Fast, accurate, and secure.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setShowFooterModal('about')} className="text-slate-400 hover:text-purple-400 text-xs transition-colors">
                    About Us
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFooterModal('faq')} className="text-slate-400 hover:text-purple-400 text-xs transition-colors">
                    FAQ
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFooterModal('support')} className="text-slate-400 hover:text-purple-400 text-xs transition-colors">
                    Support
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setShowFooterModal('terms')} className="text-slate-400 hover:text-purple-400 text-xs transition-colors">
                    Terms of Use
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFooterModal('privacy')} className="text-slate-400 hover:text-purple-400 text-xs transition-colors">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFooterModal('contact')} className="text-slate-400 hover:text-purple-400 text-xs transition-colors">
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-3 border-t border-purple-500/10 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-slate-500 text-xs">
              © 2025 EchoScribe. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-3 h-3" />
              <span>Secure & Encrypted</span>
              <span className="mx-2">•</span>
              <Mail className="w-3 h-3" />
              <a href="mailto:dcm77040@gmail.com" className="hover:text-purple-400 transition-colors">
                dcm77040@gmail.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
