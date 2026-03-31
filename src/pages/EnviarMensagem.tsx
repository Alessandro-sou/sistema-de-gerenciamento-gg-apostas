import { useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function EnviarMensagem() {
  const [tipo, setTipo] = useState<"normal" | "embed">("normal");
  const [canalId, setCanalId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDesc, setEmbedDesc] = useState("");
  const [embedColor, setEmbedColor] = useState("#e74c3c");

  const handleSend = () => {
    if (!canalId) { toast.error("Informe o ID do canal"); return; }
    if (tipo === "normal" && !mensagem) { toast.error("Escreva uma mensagem"); return; }
    if (tipo === "embed" && !embedTitle && !embedDesc) { toast.error("Preencha o título ou descrição do embed"); return; }
    toast.success("Mensagem enviada com sucesso!");
    setMensagem(""); setEmbedTitle(""); setEmbedDesc("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative">
      <div className="page-glow" />
      <h1 className="text-xl sm:text-2xl font-bold">Enviar Mensagem</h1>

      <div className="glass-card glow-red p-4 sm:p-6 space-y-5 max-w-2xl">
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Tipo de Mensagem</label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as "normal" | "embed")}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Mensagem Normal</SelectItem>
              <SelectItem value="embed">Embed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">ID do Canal</label>
          <Input placeholder="Ex: 123456789012345678" value={canalId} onChange={(e) => setCanalId(e.target.value)} className="bg-secondary border-border font-mono text-sm" />
        </div>

        {tipo === "normal" ? (
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Mensagem</label>
            <Textarea placeholder="Digite sua mensagem..." value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="bg-secondary border-border min-h-[100px] sm:min-h-[120px]" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Título do Embed</label>
              <Input placeholder="Título" value={embedTitle} onChange={(e) => setEmbedTitle(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Descrição do Embed</label>
              <Textarea placeholder="Descrição do embed..." value={embedDesc} onChange={(e) => setEmbedDesc(e.target.value)} className="bg-secondary border-border min-h-[80px] sm:min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Cor do Embed</label>
              <Input type="color" value={embedColor} onChange={(e) => setEmbedColor(e.target.value)} className="bg-secondary border-border h-10 w-20 p-1 cursor-pointer" />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Preview</label>
              <div className="rounded-md p-3 sm:p-4 bg-secondary/50 border-l-4" style={{ borderLeftColor: embedColor }}>
                {embedTitle && <p className="font-semibold text-foreground text-sm">{embedTitle}</p>}
                {embedDesc && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{embedDesc}</p>}
                {!embedTitle && !embedDesc && <p className="text-xs sm:text-sm text-muted-foreground italic">Preview do embed...</p>}
              </div>
            </div>
          </>
        )}

        <Button onClick={handleSend} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red">
          <Send className="h-4 w-4 mr-2" /> Enviar Mensagem
        </Button>
      </div>
    </motion.div>
  );
}
