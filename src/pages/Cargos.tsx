import { useState, useEffect } from "react";
import { Shield, UserCheck, UserX, Search, RefreshCw, Users, Award, Star, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { atribuirCargoSuporte, atribuirCargoDiretor, removerCargo } from "@/lib/api-service";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface CargoUser {
  id: string;
  discord_id: string;
  nome_completo: string;
  cargo: "suporte" | "diretor" | null;
}

export default function Cargos() {
  const [users, setUsers] = useState<CargoUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedCargo, setSelectedCargo] = useState<"suporte" | "diretor">("suporte");
  const [assigning, setAssigning] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Buscar mediadores do banco (que são os usuários que podem ter cargos)
      const { data, error } = await (supabase as any)
        .from("mediadores")
        .select("id, discord_id, nome_completo, status")
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      
      // Por enquanto, não temos campo de cargo no banco, então vamos simular
      // Em produção, você pode adicionar uma coluna 'cargo' na tabela mediadores
      const usersWithCargo = (data || []).map((user: any) => ({
        ...user,
        cargo: null as "suporte" | "diretor" | null
      }));
      
      setUsers(usersWithCargo);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
    toast.success("Lista atualizada!");
  };

  const handleAssignCargo = async () => {
    if (!userId.trim()) {
      toast.error("Digite o ID do usuário");
      return;
    }
    if (!userName.trim()) {
      toast.error("Digite o nome do usuário");
      return;
    }

    setAssigning(true);
    try {
      let result;
      if (selectedCargo === "suporte") {
        result = await atribuirCargoSuporte(userId.trim(), userName.trim());
      } else {
        result = await atribuirCargoDiretor(userId.trim(), userName.trim());
      }
      
      if (result?.success) {
        toast.success(`Cargo ${selectedCargo === "suporte" ? "Suporte" : "Diretor"} atribuído com sucesso!`);
        setUserId("");
        setUserName("");
        await loadUsers();
      } else {
        toast.error("Erro ao atribuir cargo");
      }
    } catch (error: any) {
      console.error("Erro ao atribuir cargo:", error);
      toast.error(error.message || "Erro ao atribuir cargo");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveCargo = async (userId: string, cargo: "suporte" | "diretor") => {
    setAssigning(true);
    try {
      const result = await removerCargo(userId, cargo);
      
      if (result?.success) {
        toast.success(`Cargo ${cargo === "suporte" ? "Suporte" : "Diretor"} removido com sucesso!`);
        await loadUsers();
      } else {
        toast.error("Erro ao remover cargo");
      }
    } catch (error: any) {
      console.error("Erro ao remover cargo:", error);
      toast.error(error.message || "Erro ao remover cargo");
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.discord_id.toLowerCase().includes(search.toLowerCase()) ||
    user.nome_completo.toLowerCase().includes(search.toLowerCase())
  );

  const suporteUsers = users.filter(u => u.cargo === "suporte");
  const diretorUsers = users.filter(u => u.cargo === "diretor");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="page-glow" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Gerenciamento de Cargos</h1>
        </div>
        <p className="text-muted-foreground">
          Atribua ou remova cargos de Suporte e Diretor para usuários
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <motion.div variants={item} className="stat-card">
          <Award className="h-5 w-5 sm:h-6 sm:w-6 text-chart-4 mb-2" />
          <p className="text-lg sm:text-2xl font-bold">{suporteUsers.length}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Cargo Suporte</p>
        </motion.div>
        <motion.div variants={item} className="stat-card">
          <Star className="h-5 w-5 sm:h-6 sm:w-6 text-warning mb-2" />
          <p className="text-lg sm:text-2xl font-bold">{diretorUsers.length}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Cargo Diretor</p>
        </motion.div>
      </div>

      {/* Assign Cargo Section */}
      <motion.div variants={item}>
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Atribuir Cargo</CardTitle>
            <CardDescription>
              Preencha os dados do usuário para atribuir um cargo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="ID do Discord"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-secondary border-border"
              />
              <Input
                placeholder="Nome Completo"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-secondary border-border"
              />
              <div className="flex gap-2">
                <Button
                  variant={selectedCargo === "suporte" ? "default" : "outline"}
                  onClick={() => setSelectedCargo("suporte")}
                  className={selectedCargo === "suporte" ? "bg-chart-4" : "border-chart-4/30 text-chart-4"}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Suporte
                </Button>
                <Button
                  variant={selectedCargo === "diretor" ? "default" : "outline"}
                  onClick={() => setSelectedCargo("diretor")}
                  className={selectedCargo === "diretor" ? "bg-warning" : "border-warning/30 text-warning"}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Diretor
                </Button>
              </div>
            </div>
            <Button
              onClick={handleAssignCargo}
              disabled={assigning}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {assigning ? "Atribuindo..." : "Atribuir Cargo"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users List */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">Usuários</h2>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-border w-48"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="border-border">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20">
                <th className="text-left p-4 text-muted-foreground font-medium">Discord ID</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Cargo</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Ações</th>
               </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{user.discord_id}</td>
                    <td className="p-4 font-medium">{user.nome_completo}</td>
                    <td className="p-4">
                      {user.cargo === "suporte" && (
                        <Badge className="bg-chart-4/20 text-chart-4 border-chart-4/30">
                          Suporte
                        </Badge>
                      )}
                      {user.cargo === "diretor" && (
                        <Badge className="bg-warning/20 text-warning border-warning/30">
                          Diretor
                        </Badge>
                      )}
                      {!user.cargo && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {user.cargo === "suporte" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveCargo(user.discord_id, "suporte")}
                            disabled={assigning}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Remover Suporte
                          </Button>
                        )}
                        {user.cargo === "diretor" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveCargo(user.discord_id, "diretor")}
                            disabled={assigning}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Remover Diretor
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}