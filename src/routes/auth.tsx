import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, normalizePhone, phoneToEmail } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Barbearia" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");

  // Login
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup
  const [fullName, setFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const afterAuth = () => navigate({ to: "/agendar" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(loginPhone);
    if (phone.length < 10) return toast.error("Telefone inválido");
    if (loginPassword.length < 8) return toast.error("Senha deve ter pelo menos 8 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: loginPassword,
    });
    setLoading(false);
    if (error) return toast.error("Telefone ou senha incorretos");
    toast.success("Bem-vindo de volta!");
    afterAuth();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(signupPhone);
    if (fullName.trim().length < 2) return toast.error("Informe seu nome completo");
    if (phone.length < 10) return toast.error("Telefone inválido");
    if (signupPassword.length < 8) return toast.error("Senha deve ter pelo menos 8 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password: signupPassword,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: fullName.trim(), phone },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return toast.error("Telefone já cadastrado. Faça login.");
      }
      return toast.error(error.message);
    }
    toast.success("Conta criada!");
    afterAuth();
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <Scissors className="h-5 w-5 text-gold" />
          <span className="font-display text-xl tracking-wide">BARBEARIA</span>
        </Link>

        <div className="rounded-xl border border-border/60 bg-card p-8 shadow-2xl">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="lphone">Telefone</Label>
                  <Input id="lphone" inputMode="tel" placeholder="(11) 98765-4321"
                    value={formatPhoneBR(loginPhone)}
                    onChange={(e) => setLoginPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lpw">Senha</Label>
                  <Input id="lpw" type="password" placeholder="Mínimo 8 caracteres"
                    value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" placeholder="João da Silva"
                    value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sphone">Telefone</Label>
                  <Input id="sphone" inputMode="tel" placeholder="(11) 98765-4321"
                    value={formatPhoneBR(signupPhone)}
                    onChange={(e) => setSignupPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="spw">Senha</Label>
                  <Input id="spw" type="password" placeholder="Mínimo 8 caracteres"
                    value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          É o dono da barbearia?{" "}
          <Link to="/admin/login" className="text-gold hover:underline">Entrar como admin</Link>
        </p>
      </div>
    </div>
  );
}
