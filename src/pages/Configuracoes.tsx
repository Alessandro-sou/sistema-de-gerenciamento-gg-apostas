import { useState, useEffect } from "react";
import { Globe, Edit2, Check, X, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface ApiConfig {
  id: string;
  nome: string;
  url: string;
  created_at: string;
  updated_at: string;
}

const CONFIG_NAMES = [
  { nome: "api1", label: "API 1 - URL Principal", description: "URL da API principal do sistema" },
  { nome: "api2", label: "API 2 - URL Secundária", description: "URL da API secundária" },
  { nome: "api3", label: "API 3 - Cargos e Mediadores", description: "URL da API para cargos e mediadores" },
  { nome: "api4", label: "API 4 - Cargos", description: "URL da API específica para cargos" }
];

export default function Configuracoes() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("api_configs")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const startEdit = (config: ApiConfig) => {
    setEditing(config.nome);
    setEditValue(config.url);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  const saveEdit = async (nome: string) => {
    if (!editValue.trim()) {
      toast.error("URL não pode estar vazia");
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("api_configs")
        .update({ url: editValue.trim(), updated_at: new Date().toISOString() })
        .eq("nome", nome);

      if (error) throw error;
      
      toast.success(`Configuração ${nome.toUpperCase()} atualizada!`);
      await loadConfigs();
      setEditing(null);
      setEditValue("");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setLoading(false);
    }
  };

  const getConfigValue = (nome: string): string => {
    const config = configs.find(c => c.nome === nome);
    return config?.url || "";
  };

  const hasUrl = (nome: string): boolean => {
    const url = getConfigValue(nome);
    return url && url.trim() !== "";
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="page-glow" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Configurações de API</h1>
        </div>
        <p className="text-muted-foreground">Gerencie as URLs das APIs utilizadas pelo sistema</p>
      </div>

      <div className="space-y-4">
        {CONFIG_NAMES.map((config) => {
          const currentUrl = getConfigValue(config.nome);
          const isEditing = editing === config.nome;
          const hasUrlConfig = hasUrl(config.nome);
          const configData = configs.find(c => c.nome === config.nome);

          return (
            <motion.div key={config.nome} variants={item}>
              <Card className="glass-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit({ nome: config.nome, url: currentUrl, id: "", created_at: "", updated_at: "" } as ApiConfig)}
                        disabled={loading}
                        className="border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        {hasUrlConfig ? "Editar" : "Adicionar"}
                      </Button>
                    )}
                  </div>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        type="url"
                        placeholder="https://api.exemplo.com/v1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-secondary border-border"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={cancelEdit} disabled={loading}>
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => saveEdit(config.nome)} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hasUrlConfig ? (
                        <>
                          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                            <code className="text-sm text-primary break-all">{currentUrl}</code>
                          </div>
                          {configData?.updated_at && (
                            <p className="text-xs text-muted-foreground">
                              Última atualização: {new Date(configData.updated_at).toLocaleString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                          <p className="text-sm text-muted-foreground">
                            Nenhuma URL configurada. Clique em "Adicionar" para configurar.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}