// frontend/src/App.jsx
import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Mic, Upload, Save, Circle } from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";
import History from "./History";

function Header() {
  const location = useLocation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="sticky top-0 z-50 flex items-center justify-between px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Mic className="w-7 h-7 text-white animate-pulse" />
        <h1 className="text-2xl font-extrabold tracking-wide text-white drop-shadow-lg">
          Echo<span className="text-yellow-300">Scribe</span>
        </h1>
      </div>

      {/* Navigation beside logo */}
      <nav className="flex gap-6">
        {location.pathname === "/" && (
          <Link
            to="/history"
            className="px-4 py-2 rounded-xl font-semibold text-white hover:bg-white/20 transition"
          >
            History
          </Link>
        )}
        {location.pathname === "/history" && (
          <Link
            to="/"
            className="px-4 py-2 rounded-xl font-semibold text-white hover:bg-white/20 transition"
          >
            Home
          </Link>
        )}
      </nav>
    </motion.header>
  );
}

// 🔥 Stylish thin footer
function Footer() {
  return (
    <footer className="text-center py-2 mt-8 text-xs font-light tracking-widest text-gray-500 italic select-none">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="font-serif"
      >
        ✨ Made with ❤️ by <span className="text-indigo-600 font-semibold">Dinesh Chandra Mishra</span> ✨
      </motion.p>
    </footer>
  );
}

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [loading, setLoading] = useState(false);

  // recording refs & state
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // typing interval ref
  const typingIntervalRef = useRef(null);

  const animateTranscript = (text, speedMs = 30) => {
    if (!text || typeof text !== "string") return;
    const cleanText = text.replace(/\bundefined\b/gi, "").replace(/\s+/g, " ").trim();
    if (!cleanText) {
      setDisplayedText("");
      return;
    }
    const words = cleanText.split(" ").map((w) => w.trim()).filter(Boolean);
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setDisplayedText("");
    let i = 0;
    typingIntervalRef.current = setInterval(() => {
      if (!words || i >= words.length) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        return;
      }
      const w = words[i];
      if (!w) {
        i += 1;
        return;
      }
      setDisplayedText((prev) => (prev ? prev + " " + w : w));
      i += 1;
    }, Math.max(10, speedMs));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await axios.post("https://stt-backend-k837.onrender.com/api/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      const text = res?.data?.transcript ?? "";
      setTranscript(text);
      animateTranscript(text, 30);
    } catch (err) {
      console.error("Upload/transcribe error:", err);
      alert("❌ Upload or transcription failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) return alert("⚠️ Nothing to save!");
    try {
      await axios.post("https://stt-backend-k837.onrender.com/api/history", { text: transcript });
      alert("✅ Saved to history!");
      setTranscript("");
      setDisplayedText("");
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Error saving transcription");
    }
  };

  const handleRecord = async () => {
    if (recording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recorder:", e);
        }
      }
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: chunksRef.current.length ? chunksRef.current[0].type || "audio/webm" : "audio/webm",
          });
          chunksRef.current = [];
          try {
            streamRef.current?.getTracks()?.forEach((t) => t.stop());
          } catch (e) {}
          setLoading(true);
          try {
            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");
            const res = await axios.post("https://stt-backend-k837.onrender.com/api/transcribe", formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 120000,
            });
            const text = res?.data?.transcript ?? "";
            setTranscript(text);
            animateTranscript(text, 30);
          } catch (err) {
            console.error("Recording -> transcribe error:", err);
            alert("❌ Recording transcription failed. Check console.");
          } finally {
            setLoading(false);
          }
        } catch (err) {
          console.error("onstop processing error:", err);
        } finally {
          setRecording(false);
          mediaRecorderRef.current = null;
          streamRef.current = null;
        }
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("⚠️ Cannot access microphone. Make sure your browser has permission.");
    }
  };

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      try {
        streamRef.current?.getTracks()?.forEach((t) => t.stop());
      } catch {}
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-pink-50 to-purple-100 animate-gradient" />
          <div className="absolute -top-32 -left-32 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-1/2 -right-32 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

          {/* Content */}
          <div className="relative p-6">
            <Routes>
              <Route
                path="/"
                element={
                  <div className="flex flex-col items-center justify-center space-y-6 py-12">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleRecord}
                      className={`w-20 h-20 flex items-center justify-center rounded-full shadow-lg hover:shadow-2xl transition ${
                        recording
                          ? "bg-red-600 text-white"
                          : "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                      }`}
                    >
                      {recording ? <Circle className="w-10 h-10 animate-pulse" /> : <Mic className="w-10 h-10" />}
                    </motion.button>
                    <label className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 cursor-pointer transition">
                      <Upload className="w-5 h-5" />
                      Upload Audio
                      <input type="file" accept="audio/*" hidden onChange={handleUpload} />
                    </label>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSave}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold shadow-md hover:bg-green-700 transition"
                    >
                      <Save className="w-5 h-5" />
                      Save Transcription
                    </motion.button>
                    {loading ? (
                      <p className="text-gray-600 mt-4 font-medium animate-pulse">⏳ Transcribing...</p>
                    ) : (
                      displayedText && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6 }}
                          className="mt-6 p-6 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl"
                        >
                          <p className="font-serif text-base text-gray-800 leading-relaxed tracking-wide italic selection:bg-yellow-200/70 animate-fadeIn">
                            {displayedText}
                          </p>
                        </motion.div>
                      )
                    )}
                  </div>
                }
              />
              <Route path="/history" element={<History />} />
            </Routes>
          </div>
        </main>
        <Footer /> {/* ✅ Added stylish thin footer */}
      </div>
    </Router>
  );
}
