"use client";

import { useState } from "react";
import { useAccount, type Account } from "./AccountProvider";
import { useToasts } from "@/components/ToastProvider";
import styles from "./AccountPanel.module.css";

/** Login/signup/logout UI, shared by the header settings panel and the comments section. */
export function AccountPanel({ kind = "default" }: { kind?: "default" | "settings" }) {
  const { user, setUser } = useAccount();
  const { showToast } = useToasts();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, username, password }) });
    const payload = await response.json() as { user?: Account; error?: string };
    if (!response.ok || !payload.user) return setError(payload.error ?? "Unable to update account.");
    setUser(payload.user); setOpen(false); setError(null); setPassword(""); showToast(mode === "login" ? `Welcome back, @${payload.user.username}.` : `Account created. Welcome, @${payload.user.username}.`);
  }

  async function logout() {
    await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setUser(null); showToast("Logged out.");
  }

  if (user) return <div className={`${styles.account} ${kind === "settings" ? styles.accountSettings : ""}`}><span className={styles.avatar}>{user.username[0].toUpperCase()}</span><strong>@{user.username}</strong><button className={kind === "settings" ? styles.accountAction : styles.accountLink} type="button" onClick={logout}>Log out</button></div>;

  if (kind === "settings") return <form className={`${styles.accountPanel} ${styles.accountPanelSettings}`} aria-label="Account" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <div className={styles.accountTabs} role="tablist" aria-label="Account action"><button className={mode === "login" ? styles.activeTab : ""} type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>Log in</button><button className={mode === "signup" ? styles.activeTab : ""} type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>Sign up</button></div>
    <div className={styles.formGrid}>
      <label htmlFor="settings-account-username">Username</label><input id="settings-account-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
      <label htmlFor="settings-account-password">Password</label><input id="settings-account-password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <button className={styles.accountAction} type="submit">{mode === "login" ? "Log in" : "Create account"}</button>
  </form>;

  return <div className={styles.account}>
    <span className={styles.avatar}>?</span>
    <button className={styles.accountLink} type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Log in"}</button>
    {open ? <form className={styles.accountPanel} aria-label="Account" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className={styles.accountPanelHeader}><div><p>Account</p><h3>{mode === "login" ? "Welcome back" : "Create your account"}</h3></div><button className={styles.modalClose} type="button" aria-label="Close account form" onClick={() => setOpen(false)}>Close</button></div>
      <div className={styles.accountTabs} role="tablist" aria-label="Account action"><button className={mode === "login" ? styles.activeTab : ""} type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>Log in</button><button className={mode === "signup" ? styles.activeTab : ""} type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>Sign up</button></div>
      <label htmlFor="account-username">Username</label><input id="account-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
      <label htmlFor="account-password">Password</label><input id="account-password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}<button className={styles.primaryAction} type="submit">{mode === "login" ? "Log in" : "Create account"}</button>
    </form> : null}
  </div>;
}
