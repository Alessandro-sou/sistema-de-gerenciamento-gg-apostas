import { useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Cargos() {
  const [userId, setUserId] = useState("");
  const [cargo, setCargo] = useState<string>("");

  const handleDarCargo = () => {
    if (!userId) { toast.error("Informe o ID do usuário"); return; }
    if (!cargo) { toast.error("Selecione um cargo"); return; }
    toast.success(`Cargo "${cargo}" atribuído ao usuário ${userId}!`);
    setUserId(""); setCargo("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative">
      <div className="page-glow" />
      <h1 className="text-xl sm:text-2xl font-bold">Cargos</h1>

      <div className="glass-card glow-red p-4 sm:p-6 space-y-5 max-w-md">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold">Dar Cargo</h2>
        </div>

        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">ID do Usuário</label>
          <Input placeholder="Ex: 123456789012345678" value={userId} onChange={(e) => setUserId(e.target.value)} className="bg-secondary border-border font-mono text-sm" />
        </div>

        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Cargo</label>
          <Select value={cargo} onValueChange={setCargo}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="suporte">Suporte</SelectItem>
              <SelectItem value="diretor">Diretor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleDarCargo} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red">
          <Shield className="h-4 w-4 mr-2" /> Dar Cargo
        </Button>
      </div>
    </motion.div>
  );
}
