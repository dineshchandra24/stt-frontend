// frontend/pages/History.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Download, Trash2 } from "lucide-react";

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const res = await axios.get("http://localhost:5000/api/history");
    setHistory(res.data);
  };

  const clearHistory = async () => {
    await axios.delete("http://localhost:5000/api/history");
    setHistory([]);
  };

  const deleteItem = async (id) => {
    await axios.delete(`http://localhost:5000/api/history/${id}`);
    setHistory(history.filter((item) => item._id !== id));
  };

  const handleDownload = (format) => {
    window.open(`http://localhost:5000/api/history/download?format=${format}`, "_blank");
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
            {/* Dropdown menu */}
            <div className="absolute hidden group-hover:block mt-2 bg-white shadow rounded-lg">
              <button
                className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
                onClick={() => handleDownload("txt")}
              >
                Download as .txt
              </button>
            </div>
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
