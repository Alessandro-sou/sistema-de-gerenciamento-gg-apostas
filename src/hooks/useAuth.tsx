import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  validateSessionFingerprint,
  isSessionIdle,
  updateActivityTimestamp,
  clearActivityTimestamp,
  storeSessionFingerprint,
  logSecurityEvent,
} from "@/lib/security";

const EVENTS_TO_TRACK = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const forceLogout = useCallback(async (reason: string) => {
    logSecurityEvent("FORCED_LOGOUT", { reason });
    clearActivityTimestamp();
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  // Atualiza timestamp de atividade ao interagir
  useEffect(() => {
    const onActivity = () => updateActivityTimestamp();
    EVENTS_TO_TRACK.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => EVENTS_TO_TRACK.forEach((e) => window.removeEventListener(e, onActivity));
  }, []);

  // Verifica idle timeout a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (session && isSessionIdle()) {
        forceLogout("IDLE_TIMEOUT");
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [session, forceLogout]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess) {
        // Valida fingerprint ao receber nova sessão
        if (!validateSessionFingerprint()) {
          logSecurityEvent("SESSION_HIJACK_ATTEMPT", { email: sess.user.email });
          forceLogout("FINGERPRINT_MISMATCH");
          return;
        }
        storeSessionFingerprint();
        updateActivityTimestamp();
      } else {
        clearActivityTimestamp();
      }
      setSession(sess);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (sess) {
        updateActivityTimestamp();
        storeSessionFingerprint();
      }
      setSession(sess);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [forceLogout]);

  return { session, loading, user: session?.user ?? null };
}
