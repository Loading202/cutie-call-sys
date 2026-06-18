import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminExists, createFirstAdmin } from "@/lib/admin-setup.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin — Barbearia" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const check = useServerFn(checkAdminExists);
  const bootstrap = useServerFn(createFirstAdmin);

  const [mode, setMode] = useState<"login" | "setup" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    check().then(({ exists }) => setMode(exists ? "login" : "setup"));
  }, [check]);

  const goAdmin = () => navigate({ to: "/admin" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return toast.error("E-mail ou senha incorretos");
    }
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin");
    setLoading(false);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      return toast.error("Esta conta não tem permissão de admin");
    }
    toast.success("Bem-vindo, admin");
    goAdmin();
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Senha precisa ter pelo menos 8 caracteres");
    setLoading(true);
    try {
      await bootstrap({ data: { email, password, full_name: name || "Administrador" } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Admin criado!");
      goAdmin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <span className="font-display text-xl tracking-wide">PAINEL ADMIN</span>
        </Link>

        <div className="rounded-xl border border-border/60 bg-card p-8 shadow-2xl">
          {mode === null && <p className="text-sm text-muted-foreground">Carregando...</p>}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="font-display text-2xl">Entrar como admin</h2>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw">Senha</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}

          {mode === "setup" && (
            <form onSubmit={handleSetup} className="space-y-4">
              <h2 className="font-display text-2xl">Criar conta de admin</h2>
              <p className="text-sm text-muted-foreground">
                Nenhum admin cadastrado. Crie a conta principal da barbearia.
              </p>
              <div>
                <Label htmlFor="name">Seu nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw">Senha (mín. 8)</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar admin"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
