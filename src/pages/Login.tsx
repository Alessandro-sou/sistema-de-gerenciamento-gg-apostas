import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  checkRateLimit,
  resetRateLimit,
  storeSessionFingerprint,
  checkFrameProtection,
  updateActivityTimestamp,
  logSecurityEvent,
} from "@/lib/security";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockUntil, setBlockUntil] = useState<Date | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [timeLeft, setTimeLeft] = useState("");
  const navigate = useNavigate();

  // Proteção anti-clickjacking
  useEffect(() => {
    if (!checkFrameProtection()) {
      logSecurityEvent("CLICKJACKING_ATTEMPT", {});
      document.body.innerHTML = "<p style='color:red;text-align:center;margin-top:40vh'>Acesso negado.</p>";
    }
  }, []);

  // Countdown do bloqueio
  useEffect(() => {
    if (!blockUntil) return;
    const interval = setInterval(() => {
      const diff = blockUntil.getTime() - Date.now();
      if (diff <= 0) {
        setBlocked(false);
        setBlockUntil(null);
        setRemainingAttempts(5);
        clearInterval(interval);
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${min}:${sec.toString().padStart(2, "0")}`);
    }, 500);
    return () => clearInterval(interval);
  }, [blockUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (email.length > 254 || password.length > 128) {
      toast.error("Dados inválidos");
      logSecurityEvent("OVERSIZED_INPUT_ATTEMPT", { emailLen: email.length, passLen: password.length });
      return;
    }

    // Rate limiting
    const rl = checkRateLimit("login", email.toLowerCase());
    if (!rl.allowed) {
      setBlocked(true);
      setBlockUntil(rl.blockedUntil);
      return;
    }
    setRemainingAttempts(rl.remainingAttempts);

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      logSecurityEvent("LOGIN_FAILED", { email: email.substring(0, 30), code: error.message });

      if (rl.remainingAttempts <= 2) {
        toast.error(`Credenciais inválidas. ${rl.remainingAttempts} tentativa${rl.remainingAttempts !== 1 ? "s" : ""} restante${rl.remainingAttempts !== 1 ? "s" : ""}.`);
      } else {
        toast.error("Credenciais inválidas");
      }
      return;
    }

    // Login bem-sucedido
    resetRateLimit("login", email.toLowerCase());
    storeSessionFingerprint();
    updateActivityTimestamp();
    logSecurityEvent("LOGIN_SUCCESS", { email: email.substring(0, 30) });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="page-glow" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card glow-red p-6 sm:p-8 w-full max-w-sm space-y-6 relative z-10"
      >
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-[0_0_12px_hsl(0,75%,50%,0.4)]" />
          <h1 className="text-lg sm:text-xl font-bold">GGapostas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Faça login para continuar</p>
        </div>

        {/* Aviso de bloqueio */}
        {blocked && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/15 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-destructive">Acesso temporariamente bloqueado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Muitas tentativas. Tente novamente em{" "}
                <span className="font-mono font-bold text-destructive">{timeLeft}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Aviso de tentativas restantes */}
        {!blocked && remainingAttempts <= 3 && remainingAttempts < 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs text-warning">
              {remainingAttempts} tentativa{remainingAttempts !== 1 ? "s" : ""} restante{remainingAttempts !== 1 ? "s" : ""} antes do bloqueio
            </p>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" spellCheck={false}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-secondary border-border"
            required
            disabled={blocked || loading}
            maxLength={254}
            autoComplete="username"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-secondary border-border"
            required
            disabled={blocked || loading}
            maxLength={128}
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full glow-red" disabled={loading || blocked}>
            {loading ? (
              <span className="flex items-center gap-2"><Lock className="h-4 w-4 animate-pulse" /> Verificando...</span>
            ) : blocked ? (
              <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Bloqueado ({timeLeft})</span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
