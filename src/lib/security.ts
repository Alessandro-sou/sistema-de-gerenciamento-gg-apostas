/**
 * security.ts
 * Camada de segurança do frontend:
 *  - Rate limiting de tentativas de login (brute-force)
 *  - Sanitização e validação de inputs (XSS / injection)
 *  - Detecção de sessão suspeita / token hijacking
 *  - Content Security helpers
 *  - Logging de eventos de segurança
 */

// ─── Rate Limiter ──────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 }, // 5 tentativas / 15min, bloqueia 30min
  api: { maxAttempts: 100, windowMs: 60 * 1000, blockMs: 5 * 60 * 1000 },       // 100 req/min
};

export type RateLimitAction = keyof typeof RATE_LIMIT_CONFIG;

export function checkRateLimit(action: RateLimitAction, identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil: Date | null;
  waitMs: number;
} {
  const key = `${action}:${identifier}`;
  const config = RATE_LIMIT_CONFIG[action];
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Se está bloqueado
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const waitMs = entry.blockedUntil - now;
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(entry.blockedUntil),
      waitMs,
    };
  }

  // Janela expirou — resetar
  if (!entry || now - entry.firstAttempt > config.windowMs) {
    entry = { count: 0, firstAttempt: now, blockedUntil: null };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  if (entry.count > config.maxAttempts) {
    entry.blockedUntil = now + config.blockMs;
    rateLimitStore.set(key, entry);
    logSecurityEvent("RATE_LIMIT_BLOCKED", { action, identifier });
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(entry.blockedUntil),
      waitMs: config.blockMs,
    };
  }

  return {
    allowed: true,
    remainingAttempts: config.maxAttempts - entry.count,
    blockedUntil: null,
    waitMs: 0,
  };
}

export function resetRateLimit(action: RateLimitAction, identifier: string) {
  rateLimitStore.delete(`${action}:${identifier}`);
}

// ─── Sanitização de Input ──────────────────────────────────────────────────────

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /expression\s*\(/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE)\b)/gi,
  /(-{2}|\/\*|\*\/)/g,         // comentários SQL
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi, // OR 1=1
  /['"]\s*;\s*/g,              // ; para encadear queries
];

export function sanitizeInput(value: string): string {
  if (!value) return "";
  let sanitized = value;

  // Remove tags HTML perigosas
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  // Escapa caracteres especiais HTML
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  sanitized = sanitized.replace(/[&<>"'/]/g, (c) => htmlEscapes[c] ?? c);

  return sanitized.trim();
}

export function detectXSS(value: string): boolean {
  return XSS_PATTERNS.some((p) => p.test(value));
}

export function detectSQLInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((p) => p.test(value));
}

export function validateAndSanitize(
  value: string,
  fieldName: string
): { safe: boolean; value: string; threat?: string } {
  if (detectXSS(value)) {
    logSecurityEvent("XSS_ATTEMPT", { field: fieldName, value: value.substring(0, 100) });
    return { safe: false, value: "", threat: "XSS" };
  }
  if (detectSQLInjection(value)) {
    logSecurityEvent("SQL_INJECTION_ATTEMPT", { field: fieldName, value: value.substring(0, 100) });
    return { safe: false, value: "", threat: "SQL_INJECTION" };
  }
  return { safe: true, value: sanitizeInput(value) };
}

// ─── Validadores de campo ──────────────────────────────────────────────────────

export const validators = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  discordId: (v: string) => /^\d{17,20}$/.test(v),           // IDs Discord são numéricos 17-20 dígitos
  pixKey: (v: string) => v.length >= 5 && v.length <= 150,
  name: (v: string) => v.length >= 2 && v.length <= 120 && !/[<>{}]/.test(v),
  currency: (v: string) => /^\d+([.,]\d{0,2})?$/.test(v),
  uuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
};

// ─── Hardening de sessão ───────────────────────────────────────────────────────

const SESSION_FINGERPRINT_KEY = "sg_fp";

function generateFingerprint(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  // Hash simples (djb2)
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) ^ data.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function storeSessionFingerprint() {
  try {
    sessionStorage.setItem(SESSION_FINGERPRINT_KEY, generateFingerprint());
  } catch {
    // sessionStorage pode estar indisponível
  }
}

export function validateSessionFingerprint(): boolean {
  try {
    const stored = sessionStorage.getItem(SESSION_FINGERPRINT_KEY);
    if (!stored) return true; // Primeira visita — ainda não tem fingerprint
    return stored === generateFingerprint();
  } catch {
    return true;
  }
}

// ─── Proteção contra clickjacking (verificação de frame) ──────────────────────

export function checkFrameProtection(): boolean {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

// ─── Token de expiração de sessão inativa ─────────────────────────────────────

const IDLE_TIMEOUT_KEY = "sg_last_activity";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

export function updateActivityTimestamp() {
  try {
    localStorage.setItem(IDLE_TIMEOUT_KEY, Date.now().toString());
  } catch { /* ignore */ }
}

export function isSessionIdle(): boolean {
  try {
    const last = parseInt(localStorage.getItem(IDLE_TIMEOUT_KEY) ?? "0", 10);
    return last > 0 && Date.now() - last > IDLE_TIMEOUT_MS;
  } catch {
    return false;
  }
}

export function clearActivityTimestamp() {
  try {
    localStorage.removeItem(IDLE_TIMEOUT_KEY);
  } catch { /* ignore */ }
}

// ─── Logging de eventos de segurança ──────────────────────────────────────────

interface SecurityEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  userAgent: string;
}

const securityLog: SecurityEvent[] = [];
const MAX_LOG_SIZE = 200;

export function logSecurityEvent(type: string, data: Record<string, unknown> = {}) {
  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    data,
    userAgent: navigator.userAgent.substring(0, 100),
  };
  securityLog.push(event);
  if (securityLog.length > MAX_LOG_SIZE) securityLog.shift();

  // Em produção, logar apenas eventos críticos no console
  if (["XSS_ATTEMPT", "SQL_INJECTION_ATTEMPT", "RATE_LIMIT_BLOCKED", "SESSION_HIJACK_ATTEMPT"].includes(type)) {
    console.warn(`[SECURITY] ${type}`, event.timestamp, data);
  }
}

export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}

// ─── Formatação segura de valores monetários ──────────────────────────────────

export function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0 || parsed > 9_999_999) return null;
  return Math.round(parsed * 100) / 100; // Arredonda para 2 casas
}
