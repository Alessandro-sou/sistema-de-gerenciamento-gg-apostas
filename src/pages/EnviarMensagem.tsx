import { useState } from "react";
import { Send, MessageSquare, HelpCircle, Image, Hash, Bold, Italic, Link as LinkIcon } from "lucide-react";
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
  const [sending, setSending] = useState(false);
  
  // Embed states
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("#5865F2");
  const [embedFields, setEmbedFields] = useState<EmbedField[]>([{ name: "", value: "", inline: false }]);
  const [embedFooter, setEmbedFooter] = useState("");
  const [embedTimestamp, setEmbedTimestamp] = useState(false);
  const [embedThumbnail, setEmbedThumbnail] = useState("");
  const [embedImage, setEmbedImage] = useState("");

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
      const result = await sendMessage(channelId.trim(), message);
      
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

    // Construir o embed
    const embed: any = {};
    
    if (embedTitle.trim()) embed.title = embedTitle;
    if (embedDescription.trim()) embed.description = embedDescription;
    if (embedColor) embed.color = parseInt(embedColor.replace("#", ""), 16);
    if (embedFooter.trim()) embed.footer = { text: embedFooter };
    if (embedTimestamp) embed.timestamp = new Date().toISOString();
    if (embedThumbnail.trim()) embed.thumbnail = { url: embedThumbnail };
    if (embedImage.trim()) embed.image = { url: embedImage };
    
    const fields = embedFields.filter(f => f.name.trim() && f.value.trim());
    if (fields.length > 0) embed.fields = fields;

    if (Object.keys(embed).length === 0) {
      toast.error("Preencha pelo menos um campo do embed");
      return;
    }

    setSending(true);
    try {
      // Para embed, precisamos enviar no formato correto
      // A API 2 atualmente suporta apenas mensagem normal
      // Vamos enviar como JSON formatado
      const embedMessage = `📦 **Embed**\n\`\`\`json\n${JSON.stringify(embed, null, 2)}\n\`\`\``;
      
      const result = await sendMessage(channelId.trim(), embedMessage);
      
      if (result?.success) {
        toast.success("Embed enviado com sucesso!");
        // Reset embed fields
        setEmbedTitle("");
        setEmbedDescription("");
        setEmbedColor("#5865F2");
        setEmbedFields([{ name: "", value: "", inline: false }]);
        setEmbedFooter("");
        setEmbedTimestamp(false);
        setEmbedThumbnail("");
        setEmbedImage("");
      } else {
        toast.error("Erro ao enviar embed");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar embed");
    } finally {
      setSending(false);
    }
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

      {/* Canal ID */}
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
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="channelId"
                  placeholder="123456789012345678"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Para obter o ID do canal, ative o modo desenvolvedor no Discord (Configurações → Avançado → Modo Desenvolvedor), clique com botão direito no canal e copie o ID.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs para Normal e Embed */}
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

              {/* Mensagem Normal */}
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

              {/* Embed */}
              <TabsContent value="embed" className="space-y-4">
                {/* Título */}
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

                {/* Descrição */}
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

                {/* Cor */}
                <div className="space-y-2">
                  <Label htmlFor="embedColor">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="embedColor"
                      type="color"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="w-20 bg-secondary border-border"
                    />
                    <Input
                      placeholder="#5865F2"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="flex-1 bg-secondary border-border"
                    />
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="space-y-2">
                  <Label htmlFor="embedThumbnail">Thumbnail URL</Label>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="embedThumbnail"
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={embedThumbnail}
                      onChange={(e) => setEmbedThumbnail(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <Label htmlFor="embedImage">Imagem URL</Label>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="embedImage"
                      placeholder="https://exemplo.com/imagem-grande.jpg"
                      value={embedImage}
                      onChange={(e) => setEmbedImage(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                {/* Campos */}
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
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`inline-${index}`}
                          checked={field.inline}
                          onChange={(e) => updateField(index, { inline: e.target.checked })}
                          className="rounded border-border"
                        />
                        <Label htmlFor={`inline-${index}`} className="text-sm text-muted-foreground cursor-pointer">
                          Exibir na mesma linha
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="space-y-2">
                  <Label htmlFor="embedFooter">Rodapé</Label>
                  <Input
                    id="embedFooter"
                    placeholder="Texto do rodapé"
                    value={embedFooter}
                    onChange={(e) => setEmbedFooter(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="embedTimestamp"
                    checked={embedTimestamp}
                    onChange={(e) => setEmbedTimestamp(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="embedTimestamp" className="text-sm text-muted-foreground cursor-pointer">
                    Incluir timestamp (data/hora atual)
                  </Label>
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

      {/* Ajuda */}
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
              <p>🎨 <strong>Cores:</strong> Use hexadecimal (ex: #ff0000 para vermelho) ou o seletor de cores.</p>
              <p>📝 <strong>Embed:</strong> Os campos são opcionais. Adicione quantos campos quiser para organizar a informação.</p>
              <p>🖼️ <strong>Imagens:</strong> Use URLs diretas de imagens (jpg, png, gif).</p>
              <p>🔑 <strong>Autenticação:</strong> O token JWT do usuário logado é enviado automaticamente em todas as requisições.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}