import axios from "axios";
import { useState, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  ts: string;
}

// Structured error we surface to the UI
interface ApiError {
  message: string;
  kind: "validation" | "rate_limit" | "server" | "network";
  retryAfter?: number; // seconds, present on 429
}

// ── API Layer ──────────────────────────────────────────────────────────────────
/**
 * Calls POST /api/ask
 * Request  → { prompt: string }          (your backend only needs the latest prompt)
 * Response → { response: string }        on success
 *          → { error:    string }        on 429 (rate-limited)
 *          → { message:  string }        on 400 (validation)
 *
 * Throws ApiError so the UI can show the right message for each case.
 */
const Backend_URL = import.meta.env.VITE_BACKEND_URL
async function callApi(prompt: string): Promise<string> {
  try {
    const res = await axios.post(
      `${Backend_URL}/api/ask`,
      { prompt }
    );

    // SUCCESS
    return res.data.response;
  } catch (err: any) {
    // Axios error with response
    if (err.response) {
      const { status, data, headers } = err.response;

      if (status === 400) {
        throw {
          message: data.message ?? "Invalid input.",
          kind: "validation",
        } satisfies ApiError;
      }

      if (status === 429) {
        throw {
          message: data.error ?? "Too many requests.",
          kind: "rate_limit",
          retryAfter: Number(headers["retry-after"] ?? 60),
        } satisfies ApiError;
      }

      throw {
        message: "Server error. Try again later.",
        kind: "server",
      } satisfies ApiError;
    }

    // Network / CORS / DNS failure
    throw {
      message: "Can't reach the server.",
      kind: "network",
    } satisfies ApiError;
  }
}


// ── Custom D Logo ──────────────────────────────────────────────────────────────
function DevMuseLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-[#161616] border border-[#252525] flex items-center justify-center shrink-0"
    >
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: size * 0.52,
          fontWeight: 700,
          background: "linear-gradient(140deg, #d0d0d0 0%, #666 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        D
      </span>
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────────
function Button({
  text,
  size = "default",
  onClick,
  icon,
  disabled,
}: {
  text?: string;
  size?: "default" | "full";
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl
        bg-[#242424] hover:bg-[#2e2e2e] active:scale-95
        disabled:opacity-35 disabled:cursor-not-allowed
        text-[#999] text-sm font-medium tracking-wide
        transition-all duration-150 outline-none border border-[#333]
        ${size === "full" ? "w-full justify-center" : ""}
      `}
    >
      {icon}
      {text && <span>{text}</span>}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────
function Input({
  placeholder,
  value,
  onChange,
  onKeyDown,
  size = "default",
  autoFocus,
  maxLength,
}: {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  size?: "default" | "full";
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`
        resize-none px-1 py-1
        ${size === "full" ? "w-full" : ""}
        bg-transparent text-[#e0e0e0] placeholder-[#383838]
        outline-none
        text-sm leading-relaxed
        transition-colors duration-150 overflow-hidden
      `}
    />
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === "ai";
  return (
    <div className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"} group`}>
      <div className={`flex flex-col gap-1 max-w-[74%] ${isAI ? "items-start" : "items-end"}`}>
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${isAI
              ? "bg-[#141414] border border-[#1e1e1e] text-[#bbb] rounded-tl-sm"
              : "bg-[#1e1e1e] border border-[#2a2a2a] text-[#d0d0d0] rounded-tr-sm"
            }
          `}
        >
          {msg.text}
        </div>
        <span
          className="text-[10px] text-[#2e2e2e] px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {msg.ts}
        </span>
      </div>
      {!isAI && (
        <div className="shrink-0 mt-1 w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#272727] flex items-center justify-center text-[9px] font-bold text-[#555]">
          U
        </div>
      )}
    </div>
  );
}

// ── Typing Indicator ───────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl rounded-tl-sm px-5 py-3.5 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#383838] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Error Banner ───────────────────────────────────────────────────────────────
function ErrorBanner({
  error,
  countdown,
}: {
  error: ApiError;
  countdown?: number;
}) {
  const icons: Record<ApiError["kind"], string> = {
    validation: "⚠",
    rate_limit: "⏱",
    server: "✕",
    network: "⚡",
  };

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-2 text-[11px] bg-[#150e0e] border border-[#2e1414] rounded-2xl px-4 py-2.5 max-w-sm text-center">
        <span className="text-[#7f3333] text-xs">{icons[error.kind]}</span>
        <span className="text-[#7f4444]">{error.message}</span>
        {error.kind === "rate_limit" && countdown !== undefined && countdown > 0 && (
          <span
            className="ml-1 text-[#5a2a2a] shrink-0"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {countdown}s
          </span>
        )}
      </div>
    </div>
  );
}

// ── Shared Input Box ───────────────────────────────────────────────────────────
function InputBox({
  input,
  isTyping,
  isRateLimited,
  onChange,
  onKeyDown,
  onSend,
  autoFocus,
}: {
  input: string;
  isTyping: boolean;
  isRateLimited: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  autoFocus?: boolean;
}) {
  const atLimit = input.length >= 50;

  return (
    <div className={`
      flex flex-col gap-2 bg-[#111] border rounded-2xl px-4 pt-3.5 pb-3
      focus-within:border-[#2a2a2a] transition-colors shadow-2xl shadow-black/70
      ${atLimit ? "border-[#3a1e1e]" : "border-[#1e1e1e]"}
    `}>
      <Input
        placeholder="Describe your tech stack…"
        value={input}
        onChange={onChange}
        onKeyDown={onKeyDown}
        size="full"
        autoFocus={autoFocus}
        maxLength={50}
      />
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Character counter — turns red when near limit */}
        <span
          className={`text-[10px] transition-colors ${
            atLimit
              ? "text-[#7f3333]"
              : input.length > 35
              ? "text-[#5a4020]"
              : "text-[#272727]"
          }`}
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {input.length}/50
        </span>

        <Button
          onClick={onSend}
          disabled={!input.trim() || isTyping || isRateLimited}
          icon={
            isTyping ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )
          }
          text={isTyping ? "Thinking…" : isRateLimited ? "Rate limited" : "Send"}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ChatDialog() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (started) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, started]);

  // Tick down the rate-limit countdown
  const startCountdown = (seconds: number) => {
    setRateLimitCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRateLimitCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          setError(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || rateLimitCountdown > 0) return;

    const userMsg: Message = { id: Date.now(), role: "user", text: trimmed, ts: now() };

    if (!started) setStarted(true);
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      const reply = await callApi(trimmed);
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: "ai", text: reply, ts: now() },
      ]);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr);
      if (apiErr.kind === "rate_limit") {
        startCountdown(apiErr.retryAfter ?? 60);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isRateLimited = rateLimitCountdown > 0;

  return (
    <div
      className="flex flex-col h-screen w-full bg-[#0a0a0a] text-[#e8e8e8] overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#141414] bg-[#0a0a0a]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <DevMuseLogo size={28} />
          <span className="text-[13px] font-semibold text-[#c0c0c0]" style={{ letterSpacing: "-0.02em" }}>
            DevMuse
          </span>
        </div>
        <span
          className="text-[10px] text-[#2e2e2e] bg-[#111] border border-[#1a1a1a] rounded-full px-3 py-1"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          v0.1 · beta
        </span>
      </header>

      {/* ── Hero (before first send) ── */}
      {!started && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-20 h-20 rounded-3xl bg-[#111] border border-[#1e1e1e] flex items-center justify-center"
              style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #1a1a1a" }}
            >
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 42,
                  fontWeight: 700,
                  background: "linear-gradient(150deg, #d8d8d8 0%, #484848 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                }}
              >
                D
              </span>
            </div>

            <div className="text-center flex flex-col gap-2">
              <h1
                className="text-[42px] font-semibold text-[#d8d8d8] leading-none"
                style={{ letterSpacing: "-0.04em" }}
              >
                DevMuse
              </h1>
              <p
                className="text-base text-[#383838] font-light leading-snug max-w-[280px]"
                style={{ fontStyle: "italic" }}
              >
                Describe your stack. Get project ideas worth building.
              </p>
            </div>
          </div>

          <div className="w-full max-w-lg flex flex-col gap-3">
            <InputBox
              input={input}
              isTyping={isTyping}
              isRateLimited={isRateLimited}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              onSend={send}
              autoFocus
            />
            {error && <ErrorBanner error={error} countdown={rateLimitCountdown} />}
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            {["React + Node.js", "Python + FastAPI", "Next.js + Supabase", "Flutter + Firebase", "Go + Postgres"].map((chip) => (
              <button
                key={chip}
                onClick={() => setInput(chip)}
                className="text-[11px] text-[#2e2e2e] border border-[#181818] bg-[#0e0e0e] rounded-full px-3 py-1 hover:border-[#272727] hover:text-[#484848] transition-all"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Chat view (after first send) ── */}
      {started && (
        <>
          <main
            className="flex-1 overflow-y-auto px-5 py-6 space-y-4"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#181818 transparent" }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            {error && <ErrorBanner error={error} countdown={rateLimitCountdown} />}
            <div ref={bottomRef} />
          </main>

          <footer className="shrink-0 px-4 pb-5 pt-3 border-t border-[#141414] bg-[#0a0a0a]">
            <InputBox
              input={input}
              isTyping={isTyping}
              isRateLimited={isRateLimited}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              onSend={send}
            />
            <p className="text-center text-[10px] text-[#1c1c1c] mt-2.5">
              DevMuse may produce inaccurate suggestions — verify before building.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}