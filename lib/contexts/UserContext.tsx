"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

interface UserContextValue {
  user: UserProfile | null;
  plan: string;
  actionsUsed: number;
  actionsLimit: number | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  plan: "free",
  actionsUsed: 0,
  actionsLimit: null,
  loading: true,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState("free");
  const [actionsUsed, setActionsUsed] = useState(0);
  const [actionsLimit, setActionsLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user);
      setPlan(data.plan || "free");
      setActionsUsed(data.actions_used || 0);
      setActionsLimit(data.actions_limit ?? null);
    } catch {
      // Silent failure — user may not be logged in
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UserContext.Provider value={{ user, plan, actionsUsed, actionsLimit, loading, refresh }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
