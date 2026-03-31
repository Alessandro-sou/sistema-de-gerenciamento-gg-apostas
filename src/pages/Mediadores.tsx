import { useState, useEffect } from "react";
import { Search, Plus, UserCheck, Users, UserX, Trash2, Pencil, Ban } from "lucide-react";
import { getMediadores, addMediador, ativarMediador, suspenderMediador, excluirMediador, editarMediador, type Mediador } from "@/lib/mediadores-store";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Mediadores() {
  const [mediadores, setMediadores] = useState<Mediador[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ discord_id: "", nome_completo: "", chave_pix: "", data: "", valor_venda: "" });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Mediador | null>(null);
  const [editForm, setEditForm] = useState({ discord_id: "", nome_completo: "", chave_pix: "" });

  const [ativarOpen, setAtivarOpen] = useState(false);
  const [ativarTarget, setAtivarTarget] = useState<Mediador | null>(null);
  const [ativarValor, setAtivarValor] = useState("");

  const [loading, setLoading] = useState(false);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Usuário não autenticado!');
        toast.error('Você precisa estar logado para gerenciar mediadores');
      } else {
        console.log('Usuário autenticado:', session.user.email);
      }
    };
    checkAuth();
  }, []);

  const refresh = async () => {
    try {
      console.log('Atualizando lista de mediadores...');
      const data = await getMediadores();
      console.log('Mediadores carregados:', data.length);
      setMediadores(data);
    } catch (error) {
      console.error('Erro ao atualizar mediadores:', error);
      toast.error('Erro ao carregar mediadores');
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = mediadores.filter(
    (m) =>
      m.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(search.toLowerCase())
  );

  const ativos = mediadores.filter((m) => m.status === "ativo").length;
  const suspensos = mediadores.filter((m) => m.status === "suspenso").length;

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

  const handleAdd = async () => {
    if (!form.discord_id || !form.nome_completo || !form.chave_pix) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    setLoading(true);
    const valor = parseFloat(form.valor_venda.replace(",", ".")) || 0;
    
    try {
      console.log('Adicionando mediador:', form);
      await addMediador({
        discord_id: form.discord_id,
        nome_completo: form.nome_completo,
        chave_pix: form.chave_pix,
        data_criacao: form.data ? new Date(form.data).toISOString() : undefined,
        valor_venda: valor,
      });
      setForm({ discord_id: "", nome_completo: "", chave_pix: "", data: "", valor_venda: "" });
      setOpen(false);
      await refresh();
      toast.success("Mediador adicionado e venda registrada!");
    } catch (error: any) {
      console.error('Erro ao adicionar mediador:', error);
      toast.error(`Erro ao adicionar mediador: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const openAtivar = (m: Mediador) => {
    setAtivarTarget(m);
    setAtivarValor("");
    setAtivarOpen(true);
  };

  const handleAtivar = async () => {
    if (!ativarTarget) return;
    
    setLoading(true);
    const valor = parseFloat(ativarValor.replace(",", ".")) || 0;
    
    try {
      console.log('Ativando mediador:', ativarTarget.id, ativarTarget.nome_completo, valor);
      await ativarMediador(ativarTarget.id, ativarTarget.nome_completo, valor);
      setAtivarOpen(false);
      await refresh();
      toast.success("Mediador reativado e venda registrada!");
    } catch (error: any) {
      console.error('Erro detalhado ao ativar:', error);
      toast.error(`Erro ao ativar mediador: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // CORRIGIDO: id agora é string
  const handleSuspender = async (id: string) => {
    console.log('Tentando suspender mediador ID:', id);
    setLoading(true);
    
    try { 
      await suspenderMediador(id);
      console.log('Mediador suspenso com sucesso:', id);
      await refresh(); 
      toast.success("Mediador suspenso!"); 
    } catch (error: any) {
      console.error('Erro detalhado ao suspender:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error: error
      });
      toast.error(`Erro ao suspender mediador: ${error.message || 'Erro desconhecido'}`); 
    } finally {
      setLoading(false);
    }
  };

  // CORRIGIDO: id agora é string
  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mediador?')) return;
    
    setLoading(true);
    try { 
      await excluirMediador(id);
      console.log('Mediador excluído:', id);
      await refresh(); 
      toast.success("Mediador excluído!"); 
    } catch (error: any) {
      console.error('Erro ao excluir mediador:', error);
      toast.error(`Erro ao excluir mediador: ${error.message || 'Erro desconhecido'}`); 
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (m: Mediador) => {
    setEditTarget(m);
    setEditForm({ discord_id: m.discord_id, nome_completo: m.nome_completo, chave_pix: m.chave_pix });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    
    setLoading(true);
    try {
      console.log('Editando mediador:', editTarget.id, editForm);
      await editarMediador(editTarget.id, editForm);
      setEditOpen(false);
      await refresh();
      toast.success("Mediador atualizado!");
    } catch (error: any) {
      console.error('Erro ao editar mediador:', error);
      toast.error(`Erro ao atualizar mediador: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 relative">
      <div className="page-glow" />

      <div className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Mediadores</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-red" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-[90vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Mediador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input 
                  placeholder="Discord ID" 
                  value={form.discord_id} 
                  onChange={(e) => setForm({ ...form, discord_id: e.target.value })} 
                  className="bg-secondary border-border" 
                />
                <Input 
                  placeholder="Nome Completo" 
                  value={form.nome_completo} 
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} 
                  className="bg-secondary border-border" 
                />
                <Input 
                  placeholder="Chave Pix" 
                  value={form.chave_pix} 
                  onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} 
                  className="bg-secondary border-border" 
                />
                <Input 
                  type="date" 
                  value={form.data} 
                  onChange={(e) => setForm({ ...form, data: e.target.value })} 
                  className="bg-secondary border-border" 
                />
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Valor da Venda (R$)</label>
                  <Input
                    placeholder="0,00"
                    value={form.valor_venda}
                    onChange={(e) => setForm({ ...form, valor_venda: e.target.value })}
                    className="bg-secondary border-border"
                    inputMode="decimal"
                  />
                  <p className="text-[11px] text-muted-foreground">Digite 0 para registrar venda sem valor</p>
                </div>
                <Button onClick={handleAdd} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                  {loading ? "Processando..." : "Criar Mediador"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <motion.div variants={item} className="stat-card">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary mb-2" />
          <p className="text-lg sm:text-2xl font-bold">{mediadores.length}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Total</p>
        </motion.div>
        <motion.div variants={item} className="stat-card">
          <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-success mb-2" />
          <p className="text-lg sm:text-2xl font-bold">{ativos}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Ativos</p>
        </motion.div>
        <motion.div variants={item} className="stat-card">
          <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-destructive mb-2" />
          <p className="text-lg sm:text-2xl font-bold">{suspensos}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Suspensos</p>
        </motion.div>
      </div>

      {/* Growth chart */}
      <motion.div variants={item} className="glass-card p-4 sm:p-6 glow-red">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Crescimento de Mediadores</h2>
        <ResponsiveContainer width="100%" height={200}>
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

      {/* Mobile card list */}
      <div className="block sm:hidden space-y-3">
        <AnimatePresence>
          {filtered.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{m.nome_completo}</p>
                  <p className="text-xs text-muted-foreground font-mono">{m.discord_id}</p>
                </div>
                <Badge variant={m.status === "ativo" ? "default" : "destructive"} className={m.status === "ativo" ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                  {m.status === "ativo" ? "Ativo" : "Suspenso"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Pix: {m.chave_pix}</p>
              <div className="flex gap-2">
                {m.status === "ativo" ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleSuspender(m.id)} 
                    className="flex-1 border-warning/30 text-warning hover:bg-warning/10 text-xs"
                    disabled={loading}
                  >
                    <Ban className="h-3 w-3 mr-1" /> Suspender
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => openAtivar(m)} 
                    className="flex-1 border-success/30 text-success hover:bg-success/10 text-xs"
                    disabled={loading}
                  >
                    <UserCheck className="h-3 w-3 mr-1" /> Ativar
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => openEdit(m)} 
                  className="border-chart-4/30 text-chart-4 hover:bg-chart-4/10"
                  disabled={loading}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleExcluir(m.id)} 
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={loading}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum mediador encontrado</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-muted-foreground font-medium">Discord ID</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Chave Pix</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden lg:table-cell">Data Criação</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Ações</th>
               </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((m) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs">{m.discord_id}</td>
                    <td className="p-4 font-medium">{m.nome_completo}</td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{m.chave_pix}</td>
                    <td className="p-4">
                      <Badge variant={m.status === "ativo" ? "default" : "destructive"} className={m.status === "ativo" ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {m.status === "ativo" ? "Ativo" : "Suspenso"}
                      </Badge>
                    </td>
                    <td className="p-4 hidden lg:table-cell text-muted-foreground">
                      {new Date(m.data_criacao).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {m.status === "suspenso" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openAtivar(m)} 
                            className="border-success/30 text-success hover:bg-success/10"
                            disabled={loading}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Ativar
                          </Button>
                        )}
                        {m.status === "ativo" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleSuspender(m.id)} 
                            className="border-warning/30 text-warning hover:bg-warning/10"
                            disabled={loading}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Suspender
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openEdit(m)} 
                          className="border-chart-4/30 text-chart-4 hover:bg-chart-4/10"
                          disabled={loading}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleExcluir(m.id)} 
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={loading}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum mediador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Ativar com valor */}
      <Dialog open={ativarOpen} onOpenChange={setAtivarOpen}>
        <DialogContent className="bg-card border-border max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reativar Mediador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Reativando: <span className="text-foreground font-medium">{ativarTarget?.nome_completo}</span>
            </p>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Valor da Venda (R$)</label>
              <Input
                placeholder="0,00"
                value={ativarValor}
                onChange={(e) => setAtivarValor(e.target.value)}
                className="bg-secondary border-border"
                inputMode="decimal"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Digite 0 para registrar sem valor</p>
            </div>
            <Button onClick={handleAtivar} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red" disabled={loading}>
              <UserCheck className="h-4 w-4 mr-2" /> {loading ? "Processando..." : "Confirmar Ativação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Mediador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input 
              placeholder="Discord ID" 
              value={editForm.discord_id} 
              onChange={(e) => setEditForm({ ...editForm, discord_id: e.target.value })} 
              className="bg-secondary border-border" 
            />
            <Input 
              placeholder="Nome Completo" 
              value={editForm.nome_completo} 
              onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })} 
              className="bg-secondary border-border" 
            />
            <Input 
              placeholder="Chave Pix" 
              value={editForm.chave_pix} 
              onChange={(e) => setEditForm({ ...editForm, chave_pix: e.target.value })} 
              className="bg-secondary border-border" 
            />
            <Button onClick={handleEdit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}