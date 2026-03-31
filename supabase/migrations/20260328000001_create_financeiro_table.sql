-- Tabela de lançamentos financeiros manuais (ganhos e gastos)
CREATE TABLE public.financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ganho', 'gasto')),
  valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  descricao TEXT,
  data_lancamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read financeiro"
ON public.financeiro FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated can insert financeiro"
ON public.financeiro FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can delete financeiro"
ON public.financeiro FOR DELETE
TO authenticated
USING (true);
