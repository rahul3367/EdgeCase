import { useEffect, useRef, useState } from "react";
import { getChatHistory, sendChatMessage } from "../services/api";

export default function ChatPanel({ documentId, documentStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!documentId) return;
    getChatHistory(documentId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !documentId || isSending) return;

    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);
    setInput("");
    setIsSending(true);

    try {
      const result = await sendChatMessage(documentId, text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, sources: result.sources, timestamp: Date.now() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${err.response?.data?.message || err.message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const canChat = documentId && documentStatus === "ready";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">
            {canChat
              ? "Ask a question about this document — e.g. 'What happens if I cancel early?'"
              : "Upload and wait for a document to finish processing before chatting."}
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-auto bg-indigo-600 text-white"
                : "mr-auto bg-gray-100 text-gray-800"
            }`}
          >
            <p>{msg.content}</p>
            {msg.sources?.length > 0 && (
              <p className="mt-1 text-xs opacity-70">
                Sources: {msg.sources.map((s) => `p.${s.page ?? "?"}`).join(", ")}
              </p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <input
          type="text"
          value={input}
          disabled={!canChat || isSending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={canChat ? "Ask about this document…" : "Waiting for document…"}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
        <button
          onClick={handleSend}
          disabled={!canChat || isSending || !input.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isSending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
