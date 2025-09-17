// frontend/pages/History.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Download, Trash2 } from "lucide-react";

export default function History() {
  const [history, setHistory] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL; // ✅ Use env variable

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("❌ Error fetching history:", err);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API_URL}/api/history`);
      setHistory([]);
    } catch (err) {
      console.error("❌ Error clearing history:", err);
    }
  };

  const deleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/history/${id}`);
      setHistory(history.filter((item) => item._id !== id));
    } catch (err) {
      console.error("❌ Error deleting item:", err);
    }
  };

  const handleDownload = (format) => {
    window.open(`${API_URL}/api/history/download?format=${format}`, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Heading + Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📜 Transcription History</h2>
        <div className="flex gap-3">
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
              onClick={() => handleDownload("pdf")}
            >
              <Download className="inline w-4 h-4 mr-2" />
              Download
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clearHistory}
            className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
          >
            <Trash2 className="inline w-4 h-4 mr-2" />
            Clear All
          </motion.button>
        </div>
      </div>

      {/* History Cards */}
      <div className="space-y-4">
        {history.map((item) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white shadow-md rounded-xl hover:shadow-lg transition"
          >
            <p className="text-gray-700">{item.text}</p>
            <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
              <span>{new Date(item.createdAt).toLocaleString()}</span>
              <button
                onClick={() => deleteItem(item._id)}
                className="text-red-500 hover:text-red-700 transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
