import { supabase } from "@/integrations/supabase/client";

// Interface para resposta da API
interface BotStatusResponse {
  success: boolean;
  data: {
    total_usuarios: number;
    usuarios_online: number;
    bot_online: boolean;
    servidor: string;
  };
}

// Interface para mensagem embed
interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedData {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  thumbnail?: string;
  image?: string;
  footer?: string;
  timestamp?: string;
}

interface SendMessageRequest {
  channelId: string;
  message?: string;
  type: "normal" | "embed";
  embedData?: EmbedData;
}

interface SendMessageResponse {
  success: boolean;
  data: {
    messageId: string;
    channelId: string;
    timestamp: number;
  };
}

// Interface para moderação de usuário
interface ModerateUserRequest {
  userId: string;
  action: "ativar" | "suspender";
}

interface ModerateUserResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
    action: string;
    user: {
      id: string;
      username: string;
      nickname: string;
      role: string;
    };
  };
}

// Buscar configuração da API
async function getApiConfig(apiName: string) {
  const { data, error } = await (supabase as any)
    .from("api_configs")
    .select("url")
    .eq("nome", apiName)
    .single();

  if (error) {
    console.error(`Erro ao buscar configuração da ${apiName}:`, error);
    return null;
  }

  return data?.url || null;
}

// Buscar token JWT do usuário logado
async function getJwtToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Buscar status do bot (API 1)
export async function fetchBotStatus(): Promise<BotStatusResponse | null> {
  try {
    const apiUrl = await getApiConfig("api1");
    
    if (!apiUrl) {
      console.error("API 1 não configurada");
      return null;
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      return null;
    }

    const response = await fetch(`${apiUrl}/bot-status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Erro na requisição:", response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar status do bot:", error);
    return null;
  }
}

// Enviar mensagem (API 2)
export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse | null> {
  try {
    const apiUrl = await getApiConfig("api2");
    
    if (!apiUrl) {
      console.error("API 2 não configurada");
      throw new Error("API 2 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const response = await fetch(`${apiUrl}/send-message`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na requisição:", response.status, errorData);
      throw new Error(`Erro ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    throw error;
  }
}

// Moderar usuário (API 3)
export async function moderateUser(userId: string, action: "ativar" | "suspender"): Promise<ModerateUserResponse | null> {
  try {
    const apiUrl = await getApiConfig("api3");
    
    if (!apiUrl) {
      console.error("API 3 não configurada");
      throw new Error("API 3 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    console.log(`Chamando API 3: ${apiUrl}/moderate-user`);
    console.log(`Ação: ${action} para usuário: ${userId}`);

    const response = await fetch(`${apiUrl}/moderate-user`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        action,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na requisição:", response.status, errorData);
      throw new Error(`Erro ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log("Resposta da API 3:", data);
    return data;
  } catch (error) {
    console.error("Erro ao moderar usuário:", error);
    throw error;
  }
}