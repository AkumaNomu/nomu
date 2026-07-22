"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Account = { id: string; username: string };

type AccountState = {
  user: Account | null;
  loading: boolean;
  setUser: (user: Account | null) => void;
  refresh: () => void;
};

const AccountContext = createContext<AccountState | null>(null);

/**
 * Fetches /api/account once for the whole app and shares the result, so the
 * header settings panel, comments, and post reactions don't each issue their
 * own duplicate request for the same session.
 */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/account", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ user: Account | null }>)
      .then((payload) => { if (!cancelled) setUser(payload.user); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = useCallback(() => setTick((value) => value + 1), []);
  const value = useMemo(() => ({ user, loading, setUser, refresh }), [user, loading, refresh]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used within AccountProvider");
  return value;
}
