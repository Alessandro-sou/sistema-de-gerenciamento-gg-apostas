import { useState, useEffect, useCallback } from "react";
import { Users, Bot, RefreshCw, Server, Clock, XCircle, Gamepad2, AlertTriangle } from "lucide-react";
import { getMediadores, type Mediador } from "@/lib/mediadores-store";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { fetchBotStatus } from "@/lib/api-service";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Match {
  id: string;
  valor_centavos: number;
  modo: string;
  tipo_de_jogo: string;
  plataforma: string;
  player1_id: string;
  player1_status: string;
  player2_id: string | null;
  player2_status: string | null;
  mediador_id: string | null;
  status: string;
  tipo_botao: string | null;
  created_at: string;
  updated_at: string;
  thread_id: string | null;
  fila_message_id: string | null;
  fila_channel_id: string | null;
}

interface ServerData {
  totalUsers: number;
  onlineUsers: number;
  botStatus: "Online" | "Offline";
  serverName: string;
}

function horasPassadas(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
}

function formatarTempo(dateStr: string): string {
  const h = Math.floor(horasPassadas(dateStr));
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h atrás`;
}

function formatarValor(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2)}`;
}

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [mediadores, setMediadores] = useState<Mediador[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverData, setServerData] = useState<ServerData>({
    totalUsers: 0,
    onlineUsers: 0,
    botStatus: "Offline",
    serverName: "Carregando...",
  });

  // Buscar status do bot da API 1
  const loadBotStatus = useCallback(async () => {
    try {
      console.log("📡 Buscando status do bot na API 1...");
      const result = await fetchBotStatus();
      
      if (result && result.success) {
        setServerData({
          totalUsers: result.data.total_usuarios,
          onlineUsers: result.data.usuarios_online,
          botStatus: result.data.bot_online ? "Online" : "Offline",
          serverName: result.data.servidor,
        });
        console.log("✅ Dados do bot atualizados:", result.data);
      } else {
        console.error("❌ Erro ao buscar status do bot");
        setServerData(prev => ({
          ...prev,
          botStatus: "Offline",
        }));
      }
    } catch (error) {
      console.error("❌ Erro ao carregar status do bot:", error);
      toast.error("Erro ao buscar status do bot");
    }
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await (supabase as any)
        .from("matches")
        .select("*")
        .lt("created_at", umDiaAtras)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar matches:", error);
        setMatches([]);
        return;
      }
      
      setMatches(data as Match[] ?? []);
    } catch (error) {
      console.error("Erro ao carregar matches:", error);
      setMatches([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        getMediadores().then(setMediadores),
        loadMatches(),
        loadBotStatus(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadBotStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Dados atualizados!");
  };

  const handleFecharFila = async (match: Match) => {
    setClosingId(match.id);
    try {
      const { error } = await (supabase as any)
        .from("matches")
        .delete()
        .eq("id", match.id);
      
      if (error) {
        toast.error("Erro ao fechar fila");
        return;
      }
      
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
      toast.success(`Fila #${match.id.slice(0, 8)} fechada e removida!`);
    } catch (error) {
      toast.error("Erro ao fechar fila");
    } finally {
      setClosingId(null);
    }
  };

  const ativos = mediadores.filter((m) => m.status === "ativo").length;
  const suspensos = mediadores.filter((m) => m.status === "suspenso").length;

  const pieData = [
    { name: "Ativos", value: ativos || 1, color: "hsl(142, 70%, 45%)" },
    { name: "Suspensos", value: suspensos || 0, color: "hsl(0, 75%, 50%)" },
  ];

  const growthMap = new Map<string, number>();
  mediadores.forEach((m) => {
    const d = new Date(m.data_criacao);
    const key = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    growthMap.set(key, (growthMap.get(key) || 0) + 1);
  });
  let cumulative = 0;
  const lineData = Array.from(growthMap.entries()).map(([date, count]) => {
    cumulative += count;
    return { date, total: cumulative };
  });
  if (lineData.length === 0) lineData.push({ date: "Hoje", total: 0 });

  const stats = [
    { label: "Total Usuários", value: serverData.totalUsers, icon: Users, color: "text-primary" },
    { label: "Usuários Online", value: serverData.onlineUsers, icon: Users, color: "text-chart-4" },
    { label: "Servidor", value: serverData.serverName, icon: Server, color: "text-accent", isText: true },
    { label: "Bot Status", value: serverData.botStatus, icon: Bot, color: serverData.botStatus === "Online" ? "text-success" : "text-destructive", isStatus: true },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="page-glow" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading} className="border-border glow-red">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <motion.div key={s.label} variants={item} className="stat-card">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <s.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${s.color}`} />
              {s.isStatus && (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-success font-medium">
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${serverData.botStatus === "Online" ? "bg-success animate-pulse-glow" : "bg-destructive"}`} />
                  {serverData.botStatus}
                </span>
              )}
            </div>
            <p className="text-lg sm:text-2xl font-bold">{s.isStatus ? "" : s.value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Gamepad2 className="h-5 w-5 text-warning" />
              {matches.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-[10px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {matches.length > 9 ? "9+" : matches.length}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-semibold">Filas Antigas</h2>
            <span className="text-xs text-muted-foreground">(mais de 1 dia)</span>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Gamepad2 className="h-8 w-8 opacity-20" />
            <p className="text-sm">Nenhuma fila antiga encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/20">
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs">ID</th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs">Valor</th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs hidden sm:table-cell">Modo</th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs hidden md:table-cell">Plataforma</th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs">Player 1</th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs hidden lg:table-cell">Status</th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Tempo
                    </div>
                  </th>
                  <th className="text-left p-3 sm:p-4 text-muted-foreground font-medium text-xs">Ação</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {matches.map((m) => {
                    const muitoAntigo = horasPassadas(m.created_at) > 48;
                    return (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="border-b border-border/20 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="p-3 sm:p-4">
                          <span className="font-mono text-xs text-muted-foreground">{m.id.slice(0, 8)}…</span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className="font-semibold text-primary">{formatarValor(m.valor_centavos)}</span>
                        </td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">
                          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{m.modo ?? "—"}</span>
                        </td>
                        <td className="p-3 sm:p-4 hidden md:table-cell text-muted-foreground text-xs">
                          {m.plataforma ?? "—"}
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className="font-mono text-xs">{m.player1_id?.slice(0, 10)}…</span>
                        </td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell">
                          <span className="text-xs bg-warning/15 text-warning px-2 py-0.5 rounded-full border border-warning/20">
                            {m.status ?? "—"}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className={`flex items-center gap-1 text-xs font-medium ${muitoAntigo ? "text-destructive" : "text-warning"}`}>
                            {muitoAntigo && <AlertTriangle className="h-3 w-3" />}
                            {formatarTempo(m.created_at)}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFecharFila(m)}
                            disabled={closingId === m.id}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/60 text-xs h-7 px-2 gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {closingId === m.id ? "Fechando…" : "Fechar Fila"}
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div variants={item} className="glass-card p-4 sm:p-6 lg:col-span-2 glow-red">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Crescimento de Mediadores</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
              <XAxis dataKey="date" stroke="hsl(220,10%,55%)" fontSize={11} />
              <YAxis stroke="hsl(220,10%,55%)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "hsl(220,18%,13%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8 }}
                labelStyle={{ color: "hsl(220,10%,92%)" }}
              />
              <Line type="monotone" dataKey="total" stroke="hsl(0,75%,50%)" strokeWidth={2} dot={{ fill: "hsl(0,75%,50%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} className="glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Status dos Mediadores</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(value) => <span className="text-xs sm:text-sm text-muted-foreground">{value}</span>} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,13%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </motion.div>
  );
}