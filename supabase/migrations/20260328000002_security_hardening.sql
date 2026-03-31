-- ─── Segurança extra no banco de dados ───────────────────────────────────────

-- 1. Tabela de log de eventos de segurança (auditoria)
CREATE TABLE IF NOT EXISTS public.security_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_log ENABLE ROW LEVEL SECURITY;

-- Apenas authenticated pode inserir, ninguém pode ler pelo client (apenas via service_role)
CREATE POLICY "Authenticated can insert security_log"
ON public.security_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Garantir que todas as tabelas têm RLS ativo
ALTER TABLE public.mediadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- 3. Remover política permissiva de leitura anônima de vendas e financeiro
--    (apenas autenticados devem ver dados financeiros)
DROP POLICY IF EXISTS "Anyone can read vendas" ON public.vendas;
DROP POLICY IF EXISTS "Anyone can read financeiro" ON public.financeiro;

CREATE POLICY "Authenticated can read vendas"
ON public.vendas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can read financeiro"
ON public.financeiro FOR SELECT
TO authenticated
USING (true);

-- 4. Índice para performance nas queries mais comuns
CREATE INDEX IF NOT EXISTS idx_mediadores_status ON public.mediadores(status);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_data ON public.financeiro(data_lancamento DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_tipo ON public.financeiro(tipo);
