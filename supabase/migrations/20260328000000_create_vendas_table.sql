-- Tabela de vendas: registrada ao cadastrar ou reativar um mediador
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mediador_id UUID NOT NULL REFERENCES public.mediadores(id) ON DELETE CASCADE,
  mediador_nome TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'cadastro' CHECK (tipo IN ('cadastro', 'reativacao')),
  data_venda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendas"
ON public.vendas FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated can insert vendas"
ON public.vendas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can delete vendas"
ON public.vendas FOR DELETE
TO authenticated
USING (true);
