import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors, Calendar, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbearia — Agendamento Online" },
      { name: "description", content: "Reserve seu corte ou barba online em segundos. Profissionais experientes, atendimento impecável." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen gradient-hero">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gold" />
            <span className="font-display text-xl tracking-wide">BARBEARIA</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Agendar</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/80">Desde sempre, no capricho</p>
          <h1 className="mt-6 font-display text-5xl leading-tight md:text-7xl">
            Estilo, navalha e<br />
            <span className="text-gold">tradição</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
            Agende seu horário online em segundos. Escolha o serviço, o barbeiro e a hora — a gente cuida do resto.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="px-8">Agendar agora</Button>
            </Link>
            <Link to="/admin/login">
              <Button size="lg" variant="outline" className="px-8">Sou o dono</Button>
            </Link>
          </div>
        </section>

        <div className="gold-divider mx-auto max-w-3xl" />

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-10 md:grid-cols-3">
            {[
              { icon: Calendar, title: "Agendamento simples", text: "Escolha data e horário com poucos cliques." },
              { icon: Clock, title: "Sem espera", text: "Chegou, sentou, cortou. Hora marcada de verdade." },
              { icon: Star, title: "Profissionais top", text: "Barbeiros experientes em corte e barba." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-border/50 bg-card/40 p-8">
                <Icon className="h-6 w-6 text-gold" />
                <h3 className="mt-4 font-display text-2xl">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Barbearia · Todos os direitos reservados
      </footer>
    </div>
  );
}
