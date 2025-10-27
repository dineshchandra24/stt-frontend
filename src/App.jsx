import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Trash2, LogOut, Menu, X, Copy, Check, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = 'https://stt-backend-k837.onrender.com';

export default function EchoScribe() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentView, setCurrentView] = useState('home');

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
      loadHistory();
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
    return () => clearInterval(recordingIntervalRef.current);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setHistory([]);
    setTranscript('');
    setSelectedItem(null);
  };

  const loadHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    if (mediaRecorderRef.current) {
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
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
        setSuccessMessage('✅ Transcription saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setTranscript('');
        loadHistory();
      }
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error saving transcription');
    }
  };

  const deleteTranscription = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transcription?')) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        loadHistory();
        setSelectedItem(null);
        setSuccessMessage('✅ Transcription deleted');
        setTimeout(() => setSuccessMessage(''), 2000);
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const downloadPDF = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/download?format=pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const clearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transcriptions? This cannot be undone.')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        loadHistory();
        setSelectedItem(null);
        setSuccessMessage('✅ All transcriptions deleted');
        setTimeout(() => setSuccessMessage(''), 2000);
      }
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse top-10 left-10"></div>
          <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse bottom-10 right-10"></div>
          <div className="absolute w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-600 rounded-full mb-6 shadow-2xl shadow-purple-500/50">
              <Mic className="w-12 h-12 text-white animate-pulse" />
            </div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-3">
              EchoScribe
            </h1>
            <p className="text-gray-400 text-lg">Transform voice to text with AI precision ✨</p>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border-2 border-purple-500/30">
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 transform ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                    : 'bg-slate-700/30 text-gray-400 hover:bg-slate-700/50'
                }`}
              >
                🔑 Login
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 transform ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                    : 'bg-slate-700/30 text-gray-400 hover:bg-slate-700/50'
                }`}
              >
                ✨ Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-3">👤 Your Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-purple-400 transition-colors" size={22} />
                    <input
                      type="text"
                      required
                      value={authData.name}
                      onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-slate-700/30 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/30 transition-all duration-300 hover:border-purple-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">📧 Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-purple-400 transition-colors" size={22} />
                  <input
                    type="email"
                    required
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-700/30 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/30 transition-all duration-300 hover:border-purple-500/50"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">🔒 Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-purple-400 transition-colors" size={22} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    className="w-full pl-12 pr-14 py-4 bg-slate-700/30 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/30 transition-all duration-300 hover:border-purple-500/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-all duration-300 hover:scale-110"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="bg-red-500/20 border-2 border-red-500/50 text-red-400 px-5 py-4 rounded-xl text-sm font-semibold">
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 text-lg"
              >
                {authMode === 'login' ? '🚀 Login to EchoScribe' : '✨ Create Your Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            🔐 Secure authentication • 🛡️ Your data is encrypted • 🌟 AI-Powered
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse top-20 left-20"></div>
        <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse bottom-20 right-20"></div>
      </div>

      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500/20 border-2 border-green-500/50 text-green-400 px-6 py-4 rounded-xl font-bold z-50 animate-bounce shadow-lg shadow-green-500/30">
          {successMessage}
        </div>
      )}

      <header className="bg-slate-800/80 backdrop-blur-2xl sticky top-0 z-50 border-b-2 border-purple-500/30 shadow-2xl relative">
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/50">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">EchoScribe</h1>
              <p className="text-sm text-gray-400">👋 Welcome, <span className="font-bold text-purple-400">{currentUser?.name}</span></p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setCurrentView('home')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                currentView === 'home'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
              }`}
            >
              <Mic size={20} /> Home
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-300 font-bold border-2 border-red-500/30 hover:border-red-500/50 transform hover:scale-105"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-3 hover:bg-purple-500/20 rounded-xl transition-all duration-300 transform hover:scale-110"
          >
            {mobileMenuOpen ? <X className="text-white" size={28} /> : <Menu className="text-white" size={28} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-purple-500/30 p-4 space-y-3 bg-slate-800/90">
            <button onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition ${currentView === 'home' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-slate-700/50 text-gray-300'}`}>
              <Mic size={20} /> Home
            </button>
            <button onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition ${currentView === 'dashboard' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-slate-700/50 text-gray-300'}`}>
              📊 Dashboard
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition font-bold border-2 border-red-500/30">
              <LogOut size={20} /> Logout
            </button>
          </div>
        )}
      </header>

      {currentView === 'home' ? (
        <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">
          <div className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
            <h2 className="text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-12">🎙️ Record Your Voice</h2>
            
            <div className="flex flex-col items-center gap-10">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isRecording ? 'animate-ping bg-red-500/40' : 'bg-purple-500/20'}`} />
                <div className={`absolute inset-4 rounded-full transition-all duration-500 ${isRecording ? 'bg-red-500/30 animate-pulse' : 'bg-purple-500/30'}`} />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-2xl ${
                    isRecording ? 'bg-gradient-to-br from-red-500 to-red-700 hover:shadow-red-500/50' : 'bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 hover:shadow-purple-500/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRecording ? <MicOff className="w-16 h-16 text-white animate-pulse" /> : <Mic className="w-16 h-16 text-white" />}
                </button>
              </div>

              <div className="text-center space-y-3">
                <div className="flex items-center gap-3 justify-center">
                  <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <p className="text-2xl font-black text-white">{isRecording ? '🔴 Recording in Progress' : '🎙️ Ready to Record'}</p>
                </div>
                {isRecording && <p className="text-4xl font-black text-red-400 animate-pulse">{formatTime(recordingTime)}</p>}
                <p className="text-lg text-gray-400">{isRecording ? 'Click the button to stop recording' : 'Click the button to start recording'}</p>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-3 bg-blue-500/20 px-6 py-4 rounded-xl border-2 border-blue-500/50 animate-pulse">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                  <p className="text-blue-400 font-bold text-xl">⏳ Processing with Deepgram AI...</p>
                </div>
              )}
            </div>

            {transcript && (
              <div className="mt-12 pt-10 border-t-2 border-purple-500/30">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-white">📝 Your Transcription</h3>
                  <button onClick={() => copyToClipboard(transcript)} className="flex items-center gap-2 px-5 py-3 text-sm bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-300 font-bold text-gray-300 border-2 border-slate-600 hover:border-purple-500/50 transform hover:scale-105">
                    {copied ? <><Check size={20} className="text-green-400" /> Copied!</> : <><Copy size={20} /> Copy</>}
                  </button>
                </div>
                <div className="bg-slate-700/40 rounded-2xl p-6 text-gray-200 leading-relaxed max-h-80 overflow-y-auto border-2 border-purple-500/20 text-lg">
                  {transcript}
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={saveTranscription} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 text-lg">
                    ✅ Save Transcription
                  </button>
                  <button onClick={() => setTranscript('')} className="flex-1 bg-slate-700/50 text-gray-300 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all duration-300 border-2 border-slate-600 hover:border-purple-500/50 transform hover:scale-105 active:scale-95 text-lg">
                    🗑️ Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-2">📊 Your Dashboard</h2>
              <p className="text-gray-400 text-lg">Total Recordings: <span className="font-bold text-purple-400">{history.length}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-5 py-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all duration-300 font-bold border-2 border-blue-500/30 hover:border-blue-500/50 transform hover:scale-105"
              >
                <Download size={20} /> Download PDF
              </button>
              <button
                onClick={downloadTxt}
                className="flex items-center gap-2 px-5 py-3 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all duration-300 font-bold border-2 border-green-500/30 hover:border-green-500/50 transform hover:scale-105"
              >
                <Download size={20} /> Download TXT
              </button>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-300 font-bold border-2 border-red-500/30 hover:border-red-500/50 transform hover:scale-105"
                >
                  <Trash2 size={20} /> Clear All
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl shadow-2xl p-20 border-2 border-purple-500/30 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="w-16 h-16 text-purple-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">No Recordings Yet</h3>
              <p className="text-gray-400 text-lg mb-8">Start recording your voice to see your transcriptions here!</p>
              <button
                onClick={() => setCurrentView('home')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
              >
                🎙️ Start Recording
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((item, idx) => (
                <div
                  key={item._id}
                  className="bg-slate-800/40 backdrop-blur-2xl rounded-2xl shadow-xl p-6 border-2 border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">📅 {new Date(item.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500 font-semibold">⏰ {new Date(item.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTranscription(item._id)}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 border border-red-500/30 transform hover:scale-110"
                      title="Delete this transcription"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="bg-slate-700/40 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto border border-purple-500/20">
                    <p className="text-gray-300 leading-relaxed text-sm">{item.text}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(item.text)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-all duration-300 font-semibold text-sm border border-slate-600 hover:border-purple-500/50 transform hover:scale-105"
                    >
                      <Copy size={16} /> Copy
                    </button>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all duration-300 font-semibold text-sm border border-purple-500/30 hover:border-purple-500/50 transform hover:scale-105"
                    >
                      👁️ View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedItem && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedItem(null)}>
              <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-3xl w-full border-2 border-purple-500/50" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">📄 Full Transcription</h3>
                    <p className="text-gray-400">
                      📅 {new Date(selectedItem.createdAt).toLocaleDateString()} • 
                      ⏰ {new Date(selectedItem.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-300 transform hover:scale-110"
                  >
                    <X className="text-white" size={24} />
                  </button>
                </div>

                <div className="bg-slate-700/40 rounded-2xl p-6 text-gray-200 leading-relaxed max-h-96 overflow-y-auto border-2 border-purple-500/20 mb-6 text-lg">
                  {selectedItem.text}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(selectedItem.text)}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all duration-300 font-bold border-2 border-blue-500/30 hover:border-blue-500/50 transform hover:scale-105"
                  >
                    {copied ? <><Check size={20} /> Copied!</> : <><Copy size={20} /> Copy Text</>}
                  </button>
                  <button
                    onClick={() => {
                      deleteTranscription(selectedItem._id);
                      setSelectedItem(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-300 font-bold border-2 border-red-500/30 hover:border-red-500/50 transform hover:scale-105"
                  >
                    <Trash2 size={20} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
