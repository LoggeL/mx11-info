"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type AnnType = "info" | "warning" | "error";
interface Announcement { message: string; type: AnnType; createdAt: number; }

export function AdminPanel() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<AnnType>("info");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const refresh = () =>
    fetch("/api/admin").then(r => r.json()).then(d => { setAuthed(d.authed); setAnn(d.announcement); });

  useEffect(() => { if (open) refresh(); }, [open]);

  const login = async () => {
    setLoginError("");
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password: pw }) });
    if (r.ok) { setPw(""); refresh(); } else setLoginError("Wrong password");
  };

  const logout = async () => {
    await fetch("/api/admin?action=logout", { method: "DELETE" });
    setAuthed(false); setAnn(null);
  };

  const saveAnn = async () => {
    setSaving(true);
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "announcement", message: msg, type }) });
    await refresh();
    setMsg(""); setFeedback("✓ saved"); setSaving(false);
    setTimeout(() => setFeedback(""), 2000);
  };

  const clearAnn = async () => {
    await fetch("/api/admin", { method: "DELETE" });
    await refresh(); setFeedback("✓ cleared"); setTimeout(() => setFeedback(""), 2000);
  };

  const typeColors: Record<AnnType, string> = {
    info: "text-blue-400 border-blue-500/40",
    warning: "text-yellow-400 border-yellow-500/40",
    error: "text-red-400 border-red-500/40",
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-white/20 hover:text-white/40 text-xs font-mono transition-colors">
        admin
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0f0f0f] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-semibold text-base">Admin</h2>
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">✕</button>
              </div>

              {!authed ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Password"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && login()}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-white/20 transition-colors"
                  />
                  {loginError && <p className="text-red-400 text-xs font-mono">{loginError}</p>}
                  <button onClick={login} className="w-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg py-2.5 text-white text-sm font-mono transition-colors">
                    Login
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current announcement */}
                  {ann && (
                    <div className={`rounded-lg border p-3 ${typeColors[ann.type]}`}>
                      <p className="text-xs font-mono mb-1 opacity-60">Active announcement</p>
                      <p className="text-sm">{ann.message}</p>
                      <button onClick={clearAnn} className="mt-2 text-xs font-mono opacity-40 hover:opacity-80 transition-opacity">
                        clear →
                      </button>
                    </div>
                  )}

                  {/* New announcement */}
                  <div className="space-y-2">
                    <p className="text-white/40 text-xs font-mono uppercase tracking-wider">New announcement</p>
                    <textarea
                      placeholder="Message..."
                      value={msg}
                      onChange={e => setMsg(e.target.value)}
                      rows={3}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-white/20 transition-colors resize-none"
                    />
                    <div className="flex gap-2">
                      {(["info", "warning", "error"] as AnnType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => setType(t)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-mono transition-colors ${
                            type === t ? typeColors[t] + " bg-white/[0.05]" : "border-white/[0.08] text-white/30 hover:text-white/50"
                          }`}
                        >{t}</button>
                      ))}
                    </div>
                    <button
                      onClick={saveAnn}
                      disabled={!msg.trim() || saving}
                      className="w-full bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-30 border border-white/[0.08] rounded-lg py-2.5 text-white text-sm font-mono transition-colors"
                    >
                      {feedback || (saving ? "Saving..." : "Publish")}
                    </button>
                  </div>

                  <button onClick={logout} className="w-full text-white/20 hover:text-white/40 text-xs font-mono transition-colors py-1">
                    logout
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
