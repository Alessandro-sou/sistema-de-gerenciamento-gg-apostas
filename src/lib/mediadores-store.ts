import { supabase } from "@/integrations/supabase/client";
import { validateAndSanitize, validators, logSecurityEvent } from "@/lib/security";

export interface Mediador {
  id: string;
  discord_id: string;
  nome_completo: string;
  chave_pix: string;
  status: "ativo" | "suspenso";
  data_criacao: string;
  data_ultima_ativacao: string;
}

export interface Venda {
  id: string;
  mediador_id: string;
  mediador_nome: string;
  valor: number;
  tipo: "cadastro" | "reativacao";
  data_venda: string;
}

export interface Lancamento {
  id: string;
  tipo: "ganho" | "gasto";
  valor: number;
  categoria: string;
  descricao: string | null;
  data_lancamento: string;
}

function sanitizeField(value: string, field: string): string {
  const result = validateAndSanitize(value, field);
  if (!result.safe) throw new Error(`Campo "${field}" contém conteúdo inválido (${result.threat})`);
  return result.value;
}

export async function getMediadores(): Promise<Mediador[]> {
  // Usando as any para contornar os tipos desatualizados
  const { data, error } = await (supabase as any)
    .from("mediadores")
    .select("*")
    .order("data_criacao", { ascending: false });

  if (error) { 
    console.error("Erro ao buscar mediadores:", error); 
    return []; 
  }

  const now = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  const toUpdate: Mediador[] = [];

  const result = (data as Mediador[]).map((m) => {
    if (m.status === "ativo") {
      const ativacao = new Date(m.data_ultima_ativacao).getTime();
      if (now - ativacao >= seteDias) {
        toUpdate.push(m);
        return { ...m, status: "suspenso" as const };
      }
    }
    return m;
  });

  for (const m of toUpdate) {
    await (supabase as any)
      .from("mediadores")
      .update({ status: "suspenso" })
      .eq("id", m.id);
  }

  return result;
}

export async function addMediador(m: {
  discord_id: string;
  nome_completo: string;
  chave_pix: string;
  data_criacao?: string;
  valor_venda: number;
}) {
  if (!validators.discordId(m.discord_id)) throw new Error("Discord ID inválido. Deve conter 17-20 dígitos.");
  if (!validators.name(m.nome_completo)) throw new Error("Nome inválido.");
  if (!validators.pixKey(m.chave_pix)) throw new Error("Chave Pix inválida.");
  if (m.valor_venda < 0 || m.valor_venda > 9_999_999) throw new Error("Valor inválido.");

  const discord_id = sanitizeField(m.discord_id, "discord_id");
  const nome_completo = sanitizeField(m.nome_completo, "nome_completo");
  const chave_pix = sanitizeField(m.chave_pix, "chave_pix");

  const { data, error } = await (supabase as any)
    .from("mediadores")
    .insert({
      discord_id, 
      nome_completo, 
      chave_pix,
      status: "ativo",
      data_criacao: m.data_criacao || new Date().toISOString(),
      data_ultima_ativacao: m.data_criacao || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) { 
    logSecurityEvent("DB_ERROR", { operation: "addMediador", code: error.code }); 
    throw error; 
  }

  if (m.valor_venda > 0) {
    await registrarVenda(data.id, nome_completo, m.valor_venda, "cadastro");
  }
  
  return data;
}

export async function ativarMediador(id: string, nome: string, valor_venda: number) {
  if (valor_venda < 0 || valor_venda > 9_999_999) throw new Error("Valor inválido.");
  
  const { error } = await (supabase as any)
    .from("mediadores")
    .update({ 
      status: "ativo", 
      data_ultima_ativacao: new Date().toISOString() 
    })
    .eq("id", id);
  
  if (error) throw error;
  
  if (valor_venda > 0) {
    await registrarVenda(id, sanitizeField(nome, "nome"), valor_venda, "reativacao");
  }
}

export async function suspenderMediador(id: string) {
  console.log('Suspending mediador - ID:', id);
  
  const { data, error } = await (supabase as any)
    .from("mediadores")
    .update({ status: "suspenso" })
    .eq("id", id)
    .select();
  
  if (error) {
    console.error('Erro ao suspender:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    throw new Error(`Mediador com ID ${id} não encontrado`);
  }
  
  console.log('Mediador suspenso com sucesso:', data);
  return data;
}

export async function excluirMediador(id: string) {
  const { error } = await (supabase as any)
    .from("mediadores")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

export async function editarMediador(id: string, data: { discord_id?: string; nome_completo?: string; chave_pix?: string }) {
  const sanitized: any = {};
  
  if (data.discord_id !== undefined) {
    if (!validators.discordId(data.discord_id)) throw new Error("Discord ID inválido.");
    sanitized.discord_id = sanitizeField(data.discord_id, "discord_id");
  }
  if (data.nome_completo !== undefined) {
    if (!validators.name(data.nome_completo)) throw new Error("Nome inválido.");
    sanitized.nome_completo = sanitizeField(data.nome_completo, "nome_completo");
  }
  if (data.chave_pix !== undefined) {
    if (!validators.pixKey(data.chave_pix)) throw new Error("Chave Pix inválida.");
    sanitized.chave_pix = sanitizeField(data.chave_pix, "chave_pix");
  }
  
  const { error } = await (supabase as any)
    .from("mediadores")
    .update(sanitized)
    .eq("id", id);
  
  if (error) throw error;
}

async function registrarVenda(mediadorId: string, mediadorNome: string, valor: number, tipo: "cadastro" | "reativacao") {
  const { error } = await (supabase as any)
    .from("vendas")
    .insert({
      mediador_id: mediadorId, 
      mediador_nome: mediadorNome,
      valor: Math.round(valor * 100) / 100, 
      tipo,
      data_venda: new Date().toISOString()
    });
  
  if (error) { 
    console.error("Erro ao registrar venda:", error);
    logSecurityEvent("DB_ERROR", { operation: "registrarVenda", code: error.code }); 
    throw error; 
  }
}

export async function getVendas(): Promise<Venda[]> {
  const { data, error } = await (supabase as any)
    .from("vendas")
    .select("*")
    .order("data_venda", { ascending: false });
  
  if (error) { 
    console.error("Erro ao buscar vendas:", error); 
    return []; 
  }
  return data as Venda[];
}

export async function getLancamentos(): Promise<Lancamento[]> {
  const { data, error } = await (supabase as any)
    .from("financeiro")
    .select("*")
    .order("data_lancamento", { ascending: false });
  
  if (error) { 
    console.error("Erro ao buscar lançamentos:", error); 
    return []; 
  }
  return data as Lancamento[];
}

export async function addLancamento(l: { tipo: "ganho" | "gasto"; valor: number; categoria: string; descricao?: string }) {
  if (l.valor <= 0 || l.valor > 9_999_999) throw new Error("Valor inválido.");
  if (!l.categoria || l.categoria.length > 80) throw new Error("Categoria inválida.");
  
  const categoria = sanitizeField(l.categoria, "categoria");
  const descricao = l.descricao ? sanitizeField(l.descricao, "descricao") : null;
  
  const { error } = await (supabase as any)
    .from("financeiro")
    .insert({
      tipo: l.tipo, 
      valor: Math.round(l.valor * 100) / 100, 
      categoria, 
      descricao,
      data_lancamento: new Date().toISOString()
    });
  
  if (error) { 
    logSecurityEvent("DB_ERROR", { operation: "addLancamento", code: error.code }); 
    throw error; 
  }
}

export async function deleteLancamento(id: string) {
  const { error } = await (supabase as any)
    .from("financeiro")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}