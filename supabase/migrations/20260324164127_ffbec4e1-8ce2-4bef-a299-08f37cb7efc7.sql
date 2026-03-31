
CREATE TABLE public.mediadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  chave_pix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso')),
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_ultima_ativacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mediadores ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read
CREATE POLICY "Anyone can read mediadores"
ON public.mediadores
FOR SELECT
TO anon, authenticated
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated can insert mediadores"
ON public.mediadores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Authenticated can update mediadores"
ON public.mediadores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Authenticated can delete mediadores"
ON public.mediadores
FOR DELETE
TO authenticated
USING (true);
