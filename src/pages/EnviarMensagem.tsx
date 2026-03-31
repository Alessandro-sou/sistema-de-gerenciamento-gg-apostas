import { useState } from "react";
import { Send, MessageSquare, Settings, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { sendMessage } from "@/lib/api-service";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export default function EnviarMensagem() {
  const [channelId, setChannelId] = useState("");
  const [message, setMessage] = useState("");
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("#00ff00");
  const [embedFields, setEmbedFields] = useState<EmbedField[]>([{ name: "", value: "", inline: false }]);
  const [sending, setSending] = useState(false);

  const addField = () => {
    setEmbedFields([...embedFields, { name: "", value: "", inline: false }]);
  };

  const removeField = (index: number) => {
    const newFields = embedFields.filter((_, i) => i !== index);
    setEmbedFields(newFields);
  };

  const updateField = (index: number, field: Partial<EmbedField>) => {
    const newFields = [...embedFields];
    newFields[index] = { ...newFields[index], ...field };
    setEmbedFields(newFields);
  };

  const handleSendNormal = async () => {
    if (!channelId.trim()) {
      toast.error("Digite o ID do canal");
      return;
    }
    if (!message.trim()) {
      toast.error("Digite a mensagem");
      return;
    }

    setSending(true);
    try {
      const result = await sendMessage({
        channelId: channelId.trim(),
        message: message,
        type: "normal",
      });

      if (result?.success) {
        toast.success("Mensagem enviada com sucesso!");
        setMessage("");
      } else {
        toast.error("Erro ao enviar mensagem");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleSendEmbed = async () => {
    if (!channelId.trim()) {
      toast.error("Digite o ID do canal");
      return;
    }

    const fields = embedFields.filter(f => f.name.trim() && f.value.trim());
    
    const embedData: any = {};
    if (embedTitle.trim()) embedData.title = embedTitle;
    if (embedDescription.trim()) embedData.description = embedDescription;
    if (embedColor) embedData.color = parseInt(embedColor.replace("#", ""), 16);
    if (fields.length > 0) embedData.fields = fields;

    if (Object.keys(embedData).length === 0) {
      toast.error("Preencha pelo menos um campo do embed");
      return;
    }

    setSending(true);
    try {
      const result = await sendMessage({
        channelId: channelId.trim(),
        type: "embed",
        embedData,
      });

      if (result?.success) {
        toast.success("Embed enviado com sucesso!");
        setEmbedTitle("");
        setEmbedDescription("");
        setEmbedColor("#00ff00");
        setEmbedFields([{ name: "", value: "", inline: false }]);
      } else {
        toast.error("Erro ao enviar embed");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar embed");
    } finally {
      setSending(false);
    }
  };

  const colorToHex = (color: string) => {
    // Converter cor de texto para hexadecimal
    const colors: Record<string, string> = {
      "red": "#ff0000",
      "green": "#00ff00",
      "blue": "#0000ff",
      "yellow": "#ffff00",
      "orange": "#ffa500",
      "purple": "#800080",
      "pink": "#ffc0cb",
      "white": "#ffffff",
      "black": "#000000",
    };
    return colors[color.toLowerCase()] || color;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="page-glow" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Enviar Mensagem</h1>
        </div>
        <p className="text-muted-foreground">
          Envie mensagens para o Discord através da API configurada
        </p>
      </div>

      <motion.div variants={item}>
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Configuração do Canal</CardTitle>
            <CardDescription>
              Digite o ID do canal do Discord onde a mensagem será enviada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="channelId">ID do Canal</Label>
              <Input
                id="channelId"
                placeholder="123456789012345678"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">
                Para obter o ID do canal, ative o modo desenvolvedor no Discord e clique com botão direito no canal → Copiar ID
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Mensagem</CardTitle>
            <CardDescription>
              Escolha entre mensagem normal ou embed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="normal" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="normal">Mensagem Normal</TabsTrigger>
                <TabsTrigger value="embed">Embed</TabsTrigger>
              </TabsList>

              <TabsContent value="normal" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Digite sua mensagem aqui..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-secondary border-border min-h-[150px]"
                  />
                </div>
                <Button
                  onClick={handleSendNormal}
                  disabled={sending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </TabsContent>

              <TabsContent value="embed" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="embedTitle">Título</Label>
                  <Input
                    id="embedTitle"
                    placeholder="Título do embed"
                    value={embedTitle}
                    onChange={(e) => setEmbedTitle(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedDescription">Descrição</Label>
                  <Textarea
                    id="embedDescription"
                    placeholder="Descrição do embed"
                    value={embedDescription}
                    onChange={(e) => setEmbedDescription(e.target.value)}
                    className="bg-secondary border-border min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedColor">Cor (hexadecimal)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="embedColor"
                      type="color"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="w-20 bg-secondary border-border"
                    />
                    <Input
                      placeholder="#00ff00"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(colorToHex(e.target.value))}
                      className="flex-1 bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Campos do Embed</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addField}
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      + Adicionar Campo
                    </Button>
                  </div>
                  
                  {embedFields.map((field, index) => (
                    <div key={index} className="p-3 bg-secondary/30 rounded-lg border border-border space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome do campo"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                          className="flex-1 bg-secondary border-border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(index)}
                          className="text-destructive hover:text-destructive"
                          disabled={embedFields.length === 1}
                        >
                          ✕
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Valor do campo"
                        value={field.value}
                        onChange={(e) => updateField(index, { value: e.target.value })}
                        className="bg-secondary border-border"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`inline-${index}`}
                          checked={field.inline}
                          onChange={(e) => updateField(index, { inline: e.target.checked })}
                          className="rounded border-border"
                        />
                        <Label htmlFor={`inline-${index}`} className="text-sm text-muted-foreground">
                          Exibir na mesma linha
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSendEmbed}
                  disabled={sending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Enviando..." : "Enviar Embed"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card border-border bg-secondary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Ajuda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>📌 <strong>ID do Canal:</strong> Ative o modo desenvolvedor no Discord (Configurações → Avançado → Modo Desenvolvedor), clique com botão direito no canal e copie o ID.</p>
              <p>🎨 <strong>Cores:</strong> Use hexadecimal (ex: #ff0000 para vermelho) ou nomes de cores em inglês (red, green, blue, yellow, orange, purple, pink, white, black).</p>
              <p>📝 <strong>Embed:</strong> Os campos são opcionais. Adicione quantos campos quiser para organizar a informação.</p>
              <p>🔑 <strong>Autenticação:</strong> O token JWT do usuário logado é enviado automaticamente em todas as requisições.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}