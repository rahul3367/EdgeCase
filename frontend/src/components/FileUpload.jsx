import { useRef, useState } from "react";
import { uploadDocument } from "../services/api";

export default function FileUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const document = await uploadDocument(file);
      onUploaded?.(document);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Is the backend running?");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors
          ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white hover:border-indigo-400"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {isUploading ? (
          <p className="text-indigo-600 font-medium">Uploading & processing…</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">
              Drag & drop a contract PDF here, or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">PDF only, up to 20MB</p>
          </>
        )}
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
