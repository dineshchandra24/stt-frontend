import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Trash2, LogOut, Menu, X, Copy, Check, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000';

export default function EchoScribe() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
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

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Check if user is already logged in
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

  // Authentication Functions
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

  // Authentication Page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-4 shadow-2xl">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
              EchoScribe
            </h1>
            <p className="text-gray-400">Transform voice to text with AI precision</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-purple-500/20">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-3 rounded-lg font-bold transition ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-3 rounded-lg font-bold transition ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      required
                      value={authData.name}
                      onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    required
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    className="w-full pl-11 pr-11 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-105"
              >
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Secure authentication • Your data is encrypted
          </p>
        </div>
      </div>
    );
  }

  // Main App (After Authentication)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500/20 border-2 border-green-500/50 text-green-400 px-6 py-3 rounded-lg font-semibold z-50 animate-pulse">
          {successMessage}
        </div>
      )}

      <header className="bg-slate-800/80 backdrop-blur-xl sticky top-0 z-50 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 w-11 h-11 rounded-full flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">EchoScribe</h1>
              <p className="text-xs text-gray-400">Welcome, {currentUser?.name}</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-semibold">{history.length} recordings</span>
            </div>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition font-semibold border border-blue-500/30"
            >
              <Download size={20} /> PDF
            </button>
            <button
              onClick={downloadTxt}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition font-semibold border border-green-500/30"
            >
              <Download size={20} /> TXT
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-semibold border border-red-500/30"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-purple-500/20 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="text-white" /> : <Menu className="text-white" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-500/20 p-4 space-y-3 bg-slate-800/50">
            <p className="text-gray-300 font-semibold">{history.length} recordings</p>
            <button onClick={downloadPDF} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition font-semibold border border-blue-500/30">
              <Download size={20} /> Download PDF
            </button>
            <button onClick={downloadTxt} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition font-semibold border border-green-500/30">
              <Download size={20} /> Download TXT
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-semibold border border-red-500/30">
              <LogOut size={20} /> Logout
            </button>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-8 border border-purple-500/20">
              <h2 className="text-3xl font-bold text-white mb-8">Record Your Voice</h2>
              
              <div className="flex flex-col items-center gap-8">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full transition-all ${isRecording ? 'animate-pulse bg-red-500/30' : 'bg-purple-500/20'}`} />
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`relative w-28 h-28 rounded-full flex items-center justify-center transition transform hover:scale-110 shadow-lg ${
                      isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:shadow-2xl hover:shadow-purple-500/50'
                    } disabled:opacity-50`}
                  >
                    {isRecording ? <MicOff className="w-14 h-14 text-white animate-pulse" /> : <Mic className="w-14 h-14 text-white" />}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xl font-bold text-white">{isRecording ? '🔴 Recording' : '🎙️ Ready'}</p>
                  {isRecording && <p className="text-2xl font-bold text-red-400 mt-2">{formatTime(recordingTime)}</p>}
                  <p className="text-sm text-gray-400 mt-1">{isRecording ? 'Click to stop recording' : 'Click to start recording'}</p>
                </div>
                {isProcessing && <p className="text-blue-400 font-bold text-lg animate-pulse">⏳ Processing audio with Deepgram...</p>}
              </div>

              {transcript && (
                <div className="mt-8 pt-8 border-t border-purple-500/30">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">📝 Transcription</h3>
                    <button onClick={() => copyToClipboard(transcript)} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition font-semibold text-gray-300 border border-slate-600">
                      {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-5 text-gray-200 leading-relaxed max-h-64 overflow-y-auto border border-purple-500/20">
                    {transcript}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={saveTranscription} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition">
                      ✅ Save Transcription
                    </button>
                    <button onClick={() => setTranscript('')} className="flex-1 bg-slate-700 text-gray-300 font-bold py-3 rounded-lg hover:bg-slate-600 transition border border-slate-600">
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-lg p-6 sticky top-24 border border-purple-500/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">📚 History</h2>
                {history.length > 0 && (
                  <button onClick={clearAllHistory} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition" title="Delete all transcriptions">
                    Clear All
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No transcriptions yet. Start recording!</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((item, idx) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-lg cursor-pointer transition duration-200 ${
                        selectedItem?._id === item._id ? 'bg-purple-500/30 border-2 border-purple-500' : 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs bg-purple-500/50 text-purple-300 px-2 py-1 rounded font-bold flex-shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-200 text-sm truncate">{item.text.substring(0, 30)}...</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedItem && (
                <div className="mt-6 pt-6 border-t border-purple-500/30">
                  <p className="text-sm font-semibold text-gray-300 mb-3">📖 Full Text</p>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-gray-300 mb-4 max-h-40 overflow-y-auto border border-slate-600">
                    {selectedItem.text}
                  </div>
                  <button onClick={() => deleteTranscription(selectedItem._id)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-bold border border-red-500/30">
                    <Trash2 size={18} /> Delete This
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
