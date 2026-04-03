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

interface SendMessageRequest {
  channelId: string;
  message: string;
  type: "normal";
}

interface SendMessageResponse {
  success: boolean;
  data: {
    messageId: string;
    channelId: string;
    timestamp: number;
  };
}

interface ModerateUserRequest {
  userId: string;
  action: "ativar" | "suspender";
  nickname?: string;
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

interface RoleRequest {
  userId: string;
  roleType: "suporte" | "diretor";
  action: "assign" | "remove";
  nickname?: string;
}

interface RoleResponse {
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
async function getApiConfig(apiName: string): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from("api_configs")
    .select("url")
    .eq("nome", apiName)
    .single();

  if (error) {
    console.error(`Erro ao buscar configuração da ${apiName}:`, error);
    return null;
  }

  const url = data?.url || null;
  console.log(`🔗 ${apiName} URL completa:`, url);
  return url;
}

// Buscar token JWT do usuário logado
async function getJwtToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Buscar status do bot (API 1)
export async function fetchBotStatus(): Promise<BotStatusResponse | null> {
  try {
    const fullUrl = await getApiConfig("api1");
    
    if (!fullUrl) {
      console.error("API 1 não configurada");
      return null;
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      return null;
    }

    console.log(`📡 Chamando API 1: ${fullUrl}`);

    const response = await fetch(fullUrl, {
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
export async function sendMessage(channelId: string, message: string): Promise<SendMessageResponse | null> {
  try {
    const fullUrl = await getApiConfig("api2");
    
    if (!fullUrl) {
      console.error("API 2 não configurada");
      throw new Error("API 2 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const request: SendMessageRequest = {
      channelId,
      message,
      type: "normal"
    };

    console.log(`📡 Chamando API 2: ${fullUrl}`);
    console.log(`📦 Payload:`, request);

    const response = await fetch(fullUrl, {
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
    console.log("✅ API 2 - Mensagem enviada:", data);
    return data;
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    throw error;
  }
}

// Ativar mediador (API 3)
export async function ativarMediadorAPI(userId: string, nomeCompleto: string): Promise<ModerateUserResponse | null> {
  try {
    const fullUrl = await getApiConfig("api3");
    
    if (!fullUrl) {
      console.error("API 3 não configurada");
      throw new Error("API 3 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const request: ModerateUserRequest = {
      userId,
      action: "ativar",
      nickname: nomeCompleto.toUpperCase()
    };

    console.log(`📡 Chamando API 3 (Ativar Mediador): ${fullUrl}`);
    console.log(`📦 Payload:`, request);

    const response = await fetch(fullUrl, {
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
    console.log("✅ API 3 - Ativação bem sucedida:", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao ativar mediador:", error);
    throw error;
  }
}

// Suspender mediador (API 3)
export async function suspenderMediadorAPI(userId: string): Promise<ModerateUserResponse | null> {
  try {
    const fullUrl = await getApiConfig("api3");
    
    if (!fullUrl) {
      console.error("API 3 não configurada");
      throw new Error("API 3 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const request: ModerateUserRequest = {
      userId,
      action: "suspender"
    };

    console.log(`📡 Chamando API 3 (Suspender Mediador): ${fullUrl}`);
    console.log(`📦 Payload:`, request);

    const response = await fetch(fullUrl, {
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
    console.log("✅ API 3 - Suspensão bem sucedida:", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao suspender mediador:", error);
    throw error;
  }
}

// Atribuir cargo Suporte (API 4)
export async function atribuirCargoSuporte(userId: string, nomeCompleto: string): Promise<RoleResponse | null> {
  try {
    const fullUrl = await getApiConfig("api4");
    
    if (!fullUrl) {
      console.error("API 4 não configurada");
      throw new Error("API 4 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const request: RoleRequest = {
      userId,
      roleType: "suporte",
      action: "assign",
      nickname: nomeCompleto.toUpperCase()
    };

    console.log(`📡 Chamando API 4 (Atribuir Suporte): ${fullUrl}`);
    console.log(`📦 Payload:`, request);

    const response = await fetch(fullUrl, {
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
    console.log("✅ API 4 - Cargo Suporte atribuído:", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao atribuir cargo suporte:", error);
    throw error;
  }
}

// Atribuir cargo Diretor (API 4)
export async function atribuirCargoDiretor(userId: string, nomeCompleto: string): Promise<RoleResponse | null> {
  try {
    const fullUrl = await getApiConfig("api4");
    
    if (!fullUrl) {
      console.error("API 4 não configurada");
      throw new Error("API 4 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const request: RoleRequest = {
      userId,
      roleType: "diretor",
      action: "assign",
      nickname: nomeCompleto.toUpperCase()
    };

    console.log(`📡 Chamando API 4 (Atribuir Diretor): ${fullUrl}`);
    console.log(`📦 Payload:`, request);

    const response = await fetch(fullUrl, {
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
    console.log("✅ API 4 - Cargo Diretor atribuído:", data);
    return data;
  } catch (error) {
    console.error("❌ Erro ao atribuir cargo diretor:", error);
    throw error;
  }
}

// Remover cargo Suporte ou Diretor (API 4)
export async function removerCargo(userId: string, roleType: "suporte" | "diretor"): Promise<RoleResponse | null> {
  try {
    const fullUrl = await getApiConfig("api4");
    
    if (!fullUrl) {
      console.error("API 4 não configurada");
      throw new Error("API 4 não configurada. Configure a URL na página de Configurações.");
    }

    const token = await getJwtToken();
    
    if (!token) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado");
    }

    const request: RoleRequest = {
      userId,
      roleType,
      action: "remove"
    };

    console.log(`📡 Chamando API 4 (Remover Cargo ${roleType}): ${fullUrl}`);
    console.log(`📦 Payload:`, request);

    const response = await fetch(fullUrl, {
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
    console.log(`✅ API 4 - Cargo ${roleType} removido:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Erro ao remover cargo ${roleType}:`, error);
    throw error;
  }
}