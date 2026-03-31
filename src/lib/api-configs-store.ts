import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  id: string;
  nome: string;
  url: string;
  created_at: string;
  updated_at: string;
}

// Buscar todas as configurações
export async function getApiConfigs(): Promise<ApiConfig[]> {
  const { data, error } = await (supabase as any)
    .from("api_configs")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao buscar configurações:", error);
    return [];
  }

  return data || [];
}

// Buscar uma configuração específica
export async function getApiConfig(nome: string): Promise<ApiConfig | null> {
  const { data, error } = await (supabase as any)
    .from("api_configs")
    .select("*")
    .eq("nome", nome)
    .single();

  if (error) {
    console.error(`Erro ao buscar configuração ${nome}:`, error);
    return null;
  }

  return data;
}

// Atualizar uma configuração
export async function updateApiConfig(nome: string, url: string): Promise<ApiConfig> {
  const { data, error } = await (supabase as any)
    .from("api_configs")
    .update({ url, updated_at: new Date().toISOString() })
    .eq("nome", nome)
    .select()
    .single();

  if (error) {
    console.error(`Erro ao atualizar configuração ${nome}:`, error);
    throw error;
  }

  return data;
}

// Criar uma nova configuração (se não existir)
export async function createApiConfig(nome: string, url: string): Promise<ApiConfig> {
  const { data, error } = await (supabase as any)
    .from("api_configs")
    .insert({ nome, url })
    .select()
    .single();

  if (error) {
    console.error(`Erro ao criar configuração ${nome}:`, error);
    throw error;
  }

  return data;
}