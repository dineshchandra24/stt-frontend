import { useState } from "react";

export default function AudioUploader() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("⚠️ Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setMessage("✅ " + data.message);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("❌ Upload failed!");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🎤 Upload Audio</h2>
      <input type="file" onChange={handleChange} />
      <button
        onClick={handleUpload}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        Upload
      </button>
      <p className="mt-4">{message}</p>
    </div>
  );
}
