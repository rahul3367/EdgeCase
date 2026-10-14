import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// react-pdf needs the pdf.js worker available — load it from a CDN that
// matches the installed pdfjs-dist version bundled with react-pdf.
// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/**
 * fileUrl should point at wherever the backend serves the uploaded PDF from.
 * If you don't expose a static file route yet, this component will simply
 * show an error state — wire up GET /uploads/:filename on the backend
 * (see README) and pass that URL in.
 */
export default function PDFViewer({ fileUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState(null);

  if (!fileUrl) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        Upload a document to preview it here.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-2">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) => setLoadError(err.message)}
          loading={<p className="text-sm text-gray-400 p-4">Loading PDF…</p>}
        >
          <Page pageNumber={pageNumber} width={480} />
        </Document>
        {loadError && (
          <p className="text-red-600 text-sm p-2">
            Could not load PDF: {loadError}
          </p>
        )}
      </div>

      {numPages && (
        <div className="flex items-center justify-center gap-4 py-3 text-sm">
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-40"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
