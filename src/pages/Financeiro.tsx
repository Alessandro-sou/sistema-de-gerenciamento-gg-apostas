import { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Trash2, Calendar,
} from "lucide-react";
import { getVendas, getLancamentos, addLancamento, deleteLancamento, type Venda, type Lancamento } from "@/lib/mediadores-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

type Filtro = "7d" | "30d" | "1a" | "todos";
const filtros: { label: string; value: Filtro }[] = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "Este ano", value: "1a" },
  { label: "Todos", value: "todos" },
];

const CATS_GANHO = ["Mediadores", "Eventos", "Patrocínio", "Doação", "Outro"];
const CATS_GASTO = ["Infraestrutura", "Eventos", "Marketing", "Equipe", "Ferramentas", "Outro"];

const COLORS_GANHO = ["hsl(0,75%,50%)", "hsl(142,70%,45%)", "hsl(200,70%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,55%)", "hsl(160,60%,45%)"];
const COLORS_GASTO = ["hsl(0,75%,50%)", "hsl(25,90%,55%)", "hsl(280,60%,55%)", "hsl(200,70%,50%)", "hsl(38,92%,50%)", "hsl(160,60%,45%)"];

function aplicarFiltro<T extends { data_venda?: string; data_lancamento?: string }>(items: T[], filtro: Filtro): T[] {
  if (filtro === "todos") return items;
  const now = new Date();
  const limite = new Date();
  if (filtro === "7d") limite.setDate(now.getDate() - 7);
  if (filtro === "30d") limite.setDate(now.getDate() - 30);
  if (filtro === "1a") limite.setFullYear(now.getFullYear(), 0, 1);
  return items.filter((i) => {
    const d = new Date((i.data_venda || i.data_lancamento)!);
    return d >= limite;
  });
}

function agruparPorData(vendas: Venda[], lancamentos: Lancamento[], filtro: Filtro) {
  const map = new Map<string, { ganhoMediador: number; ganhoOutros: number; gastos: number }>();

  const toKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  const vendasFilt = aplicarFiltro(vendas, filtro);
  const lancFilt = aplicarFiltro(lancamentos, filtro);

  for (const v of vendasFilt) {
    const k = toKey(v.data_venda);
    const prev = map.get(k) || { ganhoMediador: 0, ganhoOutros: 0, gastos: 0 };
    map.set(k, { ...prev, ganhoMediador: prev.ganhoMediador + v.valor });
  }

  for (const l of lancFilt) {
    const k = toKey(l.data_lancamento);
    const prev = map.get(k) || { ganhoMediador: 0, ganhoOutros: 0, gastos: 0 };
    if (l.tipo === "ganho") {
      map.set(k, { ...prev, ganhoOutros: prev.ganhoOutros + l.valor });
    } else {
      map.set(k, { ...prev, gastos: prev.gastos + l.valor });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const [da, ma] = a.split("/").map(Number);
      const [db, mb] = b.split("/").map(Number);
      return ma !== mb ? ma - mb : da - db;
    })
    .map(([data, val]) => ({ data, ...val }));
}

function agruparPorCategoria(items: Lancamento[], tipo: "ganho" | "gasto") {
  const map = new Map<string, number>();
  for (const l of items.filter((l) => l.tipo === tipo)) {
    map.set(l.categoria, (map.get(l.categoria) || 0) + l.valor);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export default function Financeiro() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("30d");
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState<"ganho" | "gasto">("ganho");
  const [form, setForm] = useState({ valor: "", categoria: "", categoriaCustom: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [v, l] = await Promise.all([getVendas(), getLancamentos()]);
    setVendas(v);
    setLancamentos(l);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const openDialog = (tipo: "ganho" | "gasto") => {
    setDialogTipo(tipo);
    setForm({ valor: "", categoria: "", categoriaCustom: "", descricao: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!valor || valor <= 0) { toast.error("Informe um valor válido"); return; }
    const categoria = form.categoria === "Outro" || form.categoria === ""
      ? form.categoriaCustom.trim() || "Outro"
      : form.categoria;
    if (!categoria) { toast.error("Informe a categoria"); return; }
    setSaving(true);
    try {
      await addLancamento({ tipo: dialogTipo, valor, categoria, descricao: form.descricao });
      toast.success(dialogTipo === "ganho" ? "Ganho registrado!" : "Gasto registrado!");
      setDialogOpen(false);
      await refresh();
    } catch {
      toast.error("Erro ao salvar lançamento");
    } finally {
      setSaving(false);
    }
  };

  // ✅ CORREÇÃO: id tipado como number (igual ao tipo Lancamento no mediadores-store)
  const handleDelete = async (id: number) => {
    try {
      await deleteLancamento(id);
      toast.success("Lançamento removido!");
      await refresh();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const vendasFilt = useMemo(() => aplicarFiltro(vendas, filtro), [vendas, filtro]);
  const lancFilt = useMemo(() => aplicarFiltro(lancamentos, filtro), [lancamentos, filtro]);

  const ganhoMediadores = useMemo(() => vendasFilt.reduce((a, v) => a + v.valor, 0), [vendasFilt]);
  const ganhoOutros = useMemo(() => lancFilt.filter((l) => l.tipo === "ganho").reduce((a, l) => a + l.valor, 0), [lancFilt]);
  const totalGastos = useMemo(() => lancFilt.filter((l) => l.tipo === "gasto").reduce((a, l) => a + l.valor, 0), [lancFilt]);
  const totalGanhos = ganhoMediadores + ganhoOutros;
  const lucro = totalGanhos - totalGastos;

  const chartData = useMemo(() => agruparPorData(vendas, lancamentos, filtro), [vendas, lancamentos, filtro]);

  const pieGanhos = useMemo(() => {
    const cats = agruparPorCategoria(lancFilt, "ganho");
    if (ganhoMediadores > 0) cats.unshift({ name: "Mediadores", value: ganhoMediadores });
    return cats;
  }, [lancFilt, ganhoMediadores]);

  const pieGastos = useMemo(() => agruparPorCategoria(lancFilt, "gasto"), [lancFilt]);

  const CATS = dialogTipo === "ganho" ? CATS_GANHO : CATS_GASTO;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="page-glow" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
            {filtros.map((f) => (
              <Button key={f.value} size="sm" variant="ghost" onClick={() => setFiltro(f.value)}
                className={`text-xs h-7 px-3 transition-all ${filtro === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {f.label}
              </Button>
            ))}
          </div>
          <Button size="sm" onClick={() => openDialog("ganho")} className="bg-success/20 text-success border border-success/30 hover:bg-success/30 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Ganho
          </Button>
          <Button size="sm" onClick={() => openDialog("gasto")} className="bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Gasto
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Ganho c/ Mediadores", value: ganhoMediadores, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
          { label: "Ganho Outros", value: ganhoOutros, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Total Gastos", value: totalGastos, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: lucro >= 0 ? "Lucro Líquido" : "Prejuízo", value: lucro, icon: Wallet, color: lucro >= 0 ? "text-chart-4" : "text-destructive", bg: lucro >= 0 ? "bg-chart-4/10" : "bg-destructive/10" },
        ].map((s) => (
          <motion.div key={s.label} variants={item} className="stat-card">
            <div className={`${s.bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>
              R$ {Math.abs(s.value).toFixed(2)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Gráfico de área */}
      <motion.div variants={item} className="glass-card p-4 sm:p-6 glow-red">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold">Evolução por Data</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gMed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,75%,50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0,75%,50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142,70%,45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142,70%,45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(25,90%,55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(25,90%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
              <XAxis dataKey="data" stroke="hsl(220,10%,55%)" fontSize={11} />
              <YAxis stroke="hsl(220,10%,55%)" fontSize={11} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(220,18%,13%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8 }}
                formatter={(v: unknown, name: string) => [`R$ ${Number(v).toFixed(2)}`, name === "ganhoMediador" ? "Mediadores" : name === "ganhoOutros" ? "Outros Ganhos" : "Gastos"]}
              />
              <Area type="monotone" dataKey="ganhoMediador" stroke="hsl(0,75%,50%)" strokeWidth={2} fill="url(#gMed)" name="ganhoMediador" />
              <Area type="monotone" dataKey="ganhoOutros" stroke="hsl(142,70%,45%)" strokeWidth={2} fill="url(#gOut)" name="ganhoOutros" />
              <Area type="monotone" dataKey="gastos" stroke="hsl(25,90%,55%)" strokeWidth={2} fill="url(#gGasto)" name="gastos" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <DollarSign className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">{loading ? "Carregando..." : "Nenhum dado no período"}</p>
          </div>
        )}
      </motion.div>

      {/* Pizza charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item} className="glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" /> De onde vieram os ganhos
          </h2>
          {pieGanhos.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieGanhos} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieGanhos.map((_, i) => <Cell key={i} fill={COLORS_GANHO[i % COLORS_GANHO.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => `R$ ${Number(v).toFixed(2)}`}
                  contentStyle={{ background: "hsl(220,18%,13%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8 }} />
                <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Nenhum ganho no período</div>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" /> Em que foi gasto
          </h2>
          {pieGastos.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieGastos} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieGastos.map((_, i) => <Cell key={i} fill={COLORS_GASTO[i % COLORS_GASTO.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => `R$ ${Number(v).toFixed(2)}`}
                  contentStyle={{ background: "hsl(220,18%,13%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8 }} />
                <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Nenhum gasto no período</div>
          )}
        </motion.div>
      </div>

      {/* Histórico de lançamentos manuais */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold p-4 sm:p-6 pb-3">Lançamentos Manuais</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-muted-foreground font-medium">Tipo</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Categoria</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Descrição</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Valor</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Data</th>
                <th className="text-left p-4 text-muted-foreground font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {lancFilt.length > 0 ? lancFilt.map((l) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${l.tipo === "ganho" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                        {l.tipo === "ganho" ? "Ganho" : "Gasto"}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{l.categoria}</td>
                    <td className="p-4 text-muted-foreground hidden sm:table-cell">{l.descricao || "—"}</td>
                    <td className={`p-4 font-semibold ${l.tipo === "ganho" ? "text-success" : "text-destructive"}`}>
                      {l.tipo === "ganho" ? "+" : "-"}R$ {l.valor.toFixed(2)}
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">
                      {new Date(l.data_lancamento).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      {loading ? "Carregando..." : "Nenhum lançamento no período"}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Dialog adicionar ganho/gasto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${dialogTipo === "ganho" ? "text-success" : "text-destructive"}`}>
              {dialogTipo === "ganho" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {dialogTipo === "ganho" ? "Registrar Ganho" : "Registrar Gasto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Valor (R$)</label>
              <Input placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="bg-secondary border-border" inputMode="decimal" autoFocus />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {CATS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, categoria: c, categoriaCustom: "" })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.categoria === c
                      ? dialogTipo === "ganho"
                        ? "bg-success/20 text-success border-success/40"
                        : "bg-destructive/20 text-destructive border-destructive/40"
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"}`}>
                    {c}
                  </button>
                ))}
              </div>
              {(form.categoria === "Outro" || form.categoria === "") && (
                <Input placeholder="Digite a categoria..." value={form.categoriaCustom}
                  onChange={(e) => setForm({ ...form, categoriaCustom: e.target.value })}
                  className="bg-secondary border-border text-sm" />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Descrição <span className="opacity-50">(opcional)</span></label>
              <Input placeholder="Ex: Pagamento de servidor mensal" value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="bg-secondary border-border" />
            </div>

            <Button onClick={handleSave} disabled={saving}
              className={`w-full ${dialogTipo === "ganho" ? "bg-success/20 text-success border border-success/30 hover:bg-success/30" : "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"}`}>
              {saving ? "Salvando..." : dialogTipo === "ganho" ? "Registrar Ganho" : "Registrar Gasto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}