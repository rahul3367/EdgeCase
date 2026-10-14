import { useEffect, useState } from "react";
import FileUpload from "./components/FileUpload";
import PDFViewer from "./components/PDFViewer";
import ChatPanel from "./components/ChatPanel";
import RiskCards from "./components/RiskCards";
import { getDocument } from "./services/api";

export default function App() {
  const [activeDocument, setActiveDocument] = useState(null);

  // Poll while the document is still processing so status/riskSummary
  // update once the Python service finishes.
  useEffect(() => {
    if (!activeDocument || activeDocument.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const updated = await getDocument(activeDocument._id);
        setActiveDocument(updated);
      } catch {
        // ignore transient polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeDocument]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">
          Contract / Policy Loophole Finder
        </h1>
        <p className="text-sm text-gray-500">
          Upload a contract or policy PDF to surface hidden risks and chat with the document.
        </p>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {!activeDocument ? (
          <div className="max-w-xl mx-auto mt-16">
            <FileUpload onUploaded={setActiveDocument} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "75vh" }}>
            {/* Left: PDF preview */}
            <section className="bg-white rounded-xl shadow-sm border p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="font-medium text-gray-700 truncate">
                  {activeDocument.originalName}
                </h2>
                <button
                  onClick={() => setActiveDocument(null)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  New upload
                </button>
              </div>
              <PDFViewer
                fileUrl={
                  activeDocument.filename
                    ? `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"}/uploads/${activeDocument.filename}`
                    : null
                }
              />
            </section>

            {/* Middle: chat */}
            <section className="bg-white rounded-xl shadow-sm border flex flex-col">
              <div className="border-b px-4 py-3">
                <h2 className="font-medium text-gray-700">Ask about this document</h2>
                <StatusBadge status={activeDocument.status} />
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel documentId={activeDocument._id} documentStatus={activeDocument.status} />
              </div>
            </section>

            {/* Right: risk cards */}
            <section className="bg-white rounded-xl shadow-sm border overflow-y-auto p-3">
              <RiskCards riskSummary={activeDocument.riskSummary} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    uploaded: "bg-gray-100 text-gray-600",
    processing: "bg-amber-100 text-amber-700",
    ready: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${styles[status] || ""}`}>
      {status}
    </span>
  );
}
