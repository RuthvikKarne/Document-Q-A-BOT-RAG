import { useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fileInputRef = useRef(null);

  async function uploadDocument(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Select a PDF before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setStatus("Extracting text and creating embeddings...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "PDF processing failed.");
      }

      setDocuments((previous) => {
        const existing = previous.filter(
          (item) => item.filename !== data.filename
        );

        return [
          ...existing,
          {
            filename: data.filename,
            pages: data.pages_extracted,
            chunks: data.chunks_stored,
          },
        ];
      });

      setStatus(
        `DOCUMENT INDEXED // ${data.pages_extracted} PAGES // ` +
        `${data.chunks_stored} CHUNKS`
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err.message || "Could not upload the document.");
      setStatus("");
    } finally {
      setUploading(false);
    }
  }

  async function askQuestion(event) {
    event.preventDefault();

    const cleanQuestion = question.trim();
    const cleanKey = apiKey.trim();

    if (!cleanKey) {
      setError("Enter your Gemini API key first.");
      return;
    }

    if (!cleanQuestion) {
      setError("Enter a question.");
      return;
    }

    if (documents.length === 0) {
      setError("Upload a PDF before asking questions.");
      return;
    }

    setError("");
    setStatus("");
    setAsking(true);
    setQuestion("");

    setMessages((previous) => [
      ...previous,
      { role: "user", text: cleanQuestion },
    ]);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanQuestion,
          api_key: cleanKey,
          top_k: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Question answering failed.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: data.answer },
      ]);
    } catch (err) {
      const message =
        err.message || "Could not connect to the backend.";

      setError(message);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `Request failed: ${message}`,
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function askSuggestion(text) {
    setQuestion(text);
    setError("");

    document.getElementById("question-input")?.focus();
  }

  return (
    <div className="pm-app">
      <div className="pm-grain" />

      <header className="pm-topbar">
        <a className="pm-brand" href="/">
          <span className="pm-logo">P<span>M</span></span>

          <span className="pm-brand-text">
            <strong>PAPER<span>MIND</span></strong>
            <small>DOCUMENT INTELLIGENCE SYSTEM</small>
          </span>
        </a>

        <div className="pm-top-center">
          <span className="pm-live-dot" />
          SYSTEM OPERATIONAL
        </div>

        <div className="pm-version">
          <span>RAG ENGINE</span>
          <strong>V 1.0.0</strong>
        </div>
      </header>

      <main className="pm-layout">
        <aside className="pm-sidebar">
          <div className="pm-side-title">
            <span className="pm-index">01 / WORKSPACE</span>
            <h2>YOUR<br />DATABASE<span>.</span></h2>
            <p>YOUR KNOWLEDGE. ONE PLACE.</p>
          </div>

          <section className="pm-upload-card">
            <div className="pm-card-top">
              <span>INGEST DOCUMENT</span>
              <span className="pm-card-number">[ 01 ]</span>
            </div>

            <div
              className="pm-drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();

                const file = event.dataTransfer.files?.[0];

                if (file) {
                  if (file.name.toLowerCase().endsWith(".pdf")) {
                    setSelectedFile(file);
                    setError("");
                  } else {
                    setError("Only PDF files are supported.");
                  }
                }
              }}
            >
              <div className="pm-upload-symbol">
                <span>↑</span>
              </div>

              <strong>DROP YOUR FILE</strong>
              <p>PDF DOCUMENTS ONLY</p>

              <input
                ref={fileInputRef}
                id="pm-file-input"
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    setSelectedFile(file);
                    setError("");
                  }
                }}
              />

              <label
                htmlFor="pm-file-input"
                className="pm-browse-button"
              >
                SELECT FILE ↗
              </label>
            </div>

            {selectedFile && (
              <div className="pm-selected-file">
                <span className="pm-file-tag">PDF</span>

                <div>
                  <strong>{selectedFile.name}</strong>
                  <small>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>

                <button
                  type="button"
                  aria-label="Remove selected file"
                  onClick={() => {
                    setSelectedFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <button
              className="pm-primary-button"
              onClick={uploadDocument}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <span className="pm-spinner" />
                  PROCESSING...
                </>
              ) : (
                <>INITIALIZE UPLOAD <span>↗</span></>
              )}
            </button>

            {uploading && (
              <div className="pm-progress">
                <span />
              </div>
            )}
          </section>

          <section className="pm-documents">
            <div className="pm-section-heading">
              <span>INDEXED FILES</span>
              <span className="pm-count">
                {String(documents.length).padStart(2, "0")}
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="pm-empty-docs">
                <span>▤</span>
                <p>NO DOCUMENTS INDEXED</p>
                <small>UPLOAD A PDF TO BEGIN</small>
              </div>
            ) : (
              documents.map((document) => (
                <div
                  className="pm-document"
                  key={document.filename}
                >
                  <div className="pm-document-icon">PDF</div>

                  <div className="pm-document-info">
                    <strong title={document.filename}>
                      {document.filename}
                    </strong>
                    <small>
                      {document.pages} PAGES · {document.chunks} CHUNKS
                    </small>
                  </div>

                  <span className="pm-document-check">✓</span>
                </div>
              ))
            )}
          </section>

          <div className="pm-sidebar-footer">
            <span className="pm-footer-mark">PM_</span>

            <div>
              <strong>LOCAL WORKSPACE</strong>
              <small>POWERED BY RETRIEVAL + GENERATION</small>
            </div>
          </div>
        </aside>

        <section className="pm-main-panel">
          <div className="pm-hero">
            <div className="pm-hero-content">
              <span className="pm-index">02 / INTELLIGENCE TERMINAL</span>

              <h1>
                YOUR DOCS.
                <br />
                <span>YOUR ANSWERS.</span>
              </h1>

              <p>
                Ask questions. Extract insights.
                Get answers grounded in your documents.
              </p>
            </div>

            <div className="pm-hero-art" aria-hidden="true">
              <div className="pm-art-ring pm-ring-one" />
              <div className="pm-art-ring pm-ring-two" />
              <div className="pm-art-center">
                <span>PM</span>
              </div>
              <span className="pm-art-cross pm-cross-one">+</span>
              <span className="pm-art-cross pm-cross-two">+</span>
              <span className="pm-art-label">NEURAL<br />SEARCH_</span>
            </div>

            <div className="pm-hero-bottom">
              <span>SEMANTIC RETRIEVAL ENABLED</span>
              <span>● GEMINI INTEGRATION</span>
            </div>
          </div>

          <section className="pm-key-panel">
            <div className="pm-key-label">
              <span className="pm-key-icon">⌘</span>

              <div>
                <strong>GEMINI API CREDENTIAL</strong>
                <small>ENTER YOUR OWN API KEY</small>
              </div>
            </div>

            <div className="pm-key-input-wrap">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setError("");
                }}
                placeholder="Paste Gemini API key..."
                autoComplete="off"
                spellCheck="false"
                aria-label="Gemini API key"
              />

              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? "HIDE" : "REVEAL"}
              </button>
            </div>

            <span className="pm-key-status">
              <span /> SESSION ONLY
            </span>
          </section>

          {status && (
            <div className="pm-status-message">
              <span>✓</span>
              {status}
            </div>
          )}

          {error && (
            <div className="pm-error-message" role="alert">
              <span>!</span>
              <div>
                <strong>REQUEST INTERRUPTED</strong>
                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <div className="pm-chat">
            {messages.length === 0 ? (
              <div className="pm-welcome">
                <div className="pm-welcome-label">
                  <span>●</span> READY FOR INPUT
                </div>

                <div className="pm-big-number">01</div>

                <h2>
                  WHAT DO YOU
                  <br />
                  <span>WANT TO KNOW?</span>
                </h2>

                <p>
                  Your documents are the source.
                  Ask a question and let PaperMind find the evidence.
                </p>

                <div className="pm-suggestions">
                  <button
                    type="button"
                    onClick={() =>
                      askSuggestion("What is the candidate name?")
                    }
                  >
                    <span>01</span>
                    <span>WHAT IS THE CANDIDATE NAME?</span>
                    <b>↗</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      askSuggestion("Summarize this document")
                    }
                  >
                    <span>02</span>
                    <span>SUMMARIZE THE DOCUMENT</span>
                    <b>↗</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      askSuggestion("What skills are mentioned?")
                    }
                  >
                    <span>03</span>
                    <span>FIND SKILLS & QUALIFICATIONS</span>
                    <b>↗</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      askSuggestion("What are the key points?")
                    }
                  >
                    <span>04</span>
                    <span>EXTRACT KEY POINTS</span>
                    <b>↗</b>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pm-message-list">
                {messages.map((message, index) => (
                  <article
                    key={`${message.role}-${index}`}
                    className={`pm-message ${
                      message.role === "user"
                        ? "pm-user-message"
                        : "pm-assistant-message"
                    }`}
                  >
                    <div className="pm-message-avatar">
                      {message.role === "user" ? "YOU" : "PM"}
                    </div>

                    <div className="pm-message-body">
                      <div className="pm-message-meta">
                        <strong>
                          {message.role === "user"
                            ? "USER INPUT"
                            : "PAPERMIND AI"}
                        </strong>

                        <span>
                          {message.role === "user"
                            ? "QUERY"
                            : "GENERATED RESPONSE"}
                        </span>
                      </div>

                      <div className="pm-message-text">
                        {message.text}
                      </div>
                    </div>
                  </article>
                ))}

                {asking && (
                  <article className="pm-message pm-assistant-message">
                    <div className="pm-message-avatar">PM</div>

                    <div className="pm-message-body">
                      <div className="pm-message-meta">
                        <strong>PAPERMIND AI</strong>
                        <span>RETRIEVING CONTEXT</span>
                      </div>

                      <div className="pm-loading">
                        <div className="pm-loader-orbit">
                          <span />
                          <span />
                          <span />
                        </div>

                        <div>
                          <strong>ANALYZING DOCUMENTS</strong>
                          <small>RETRIEVING RELEVANT CHUNKS...</small>
                        </div>
                      </div>
                    </div>
                  </article>
                )}
              </div>
            )}
          </div>

          <div className="pm-composer-area">
            <form
              className="pm-composer"
              onSubmit={askQuestion}
            >
              <div className="pm-composer-indicator">
                <span />
                QUERY INPUT
              </div>

              <textarea
                id="question-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything about your documents..."
                maxLength={2000}
                rows={2}
                disabled={asking}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    if (!asking) {
                      event.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
              />

              <div className="pm-composer-bottom">
                <span>ENTER ↵ TO SEND</span>

                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                >
                  {asking ? (
                    <span className="pm-spinner" />
                  ) : (
                    <>TRANSMIT <span>↗</span></>
                  )}
                </button>
              </div>
            </form>

            <div className="pm-bottom-note">
              <span>PM / AI DOCUMENT INTELLIGENCE</span>
              <span>VERIFY IMPORTANT FACTS AGAINST THE SOURCE</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
