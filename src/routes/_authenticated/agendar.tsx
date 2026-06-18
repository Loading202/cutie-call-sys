import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfDay, addMinutes, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { currency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agendar")({
  head: () => ({ meta: [{ title: "Agendar — Barbearia" }] }),
  component: AgendarPage,
});

type Service = { id: string; name: string; duration_minutes: number; price: number; description: string | null };
type Barber = { id: string; name: string; bio: string | null };

const WORK_START = 9;   // 09:00
const WORK_END = 19;    // 19:00
const SLOT_MINUTES = 30;

function generateSlots(date: Date): Date[] {
  const slots: Date[] = [];
  const base = startOfDay(date);
  for (let h = WORK_START; h < WORK_END; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(addMinutes(base, h * 60 + m));
    }
  }
  return slots;
}

function AgendarPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 0));
  const [slot, setSlot] = useState<Date | null>(null);

  const services = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const barbers = useQuery({
    queryKey: ["barbers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data as Barber[];
    },
  });

  const taken = useQuery({
    queryKey: ["appointments-taken", barberId, date ? format(date, "yyyy-MM-dd") : null],
    enabled: !!barberId && !!date,
    queryFn: async () => {
      if (!barberId || !date) return [];
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = addDays(startOfDay(date), 1).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_at,status")
        .eq("barber_id", barberId)
        .gte("scheduled_at", dayStart)
        .lt("scheduled_at", dayEnd)
        .neq("status", "cancelled");
      if (error) throw error;
      return (data ?? []).map((a) => new Date(a.scheduled_at).getTime());
    },
  });

  const slots = useMemo(() => (date ? generateSlots(date) : []), [date]);
  const now = new Date();

  const create = useMutation({
    mutationFn: async () => {
      if (!user || !serviceId || !barberId || !slot) throw new Error("Faltam dados");
      const { error } = await supabase.from("appointments").insert({
        client_id: user.id,
        service_id: serviceId,
        barber_id: barberId,
        scheduled_at: slot.toISOString(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento confirmado!");
      qc.invalidateQueries({ queryKey: ["appointments-taken"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      setSlot(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  useEffect(() => { setSlot(null); }, [barberId, date]);

  if (role === "admin") {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Você é admin. <Link to="/admin" className="text-gold underline">Ir ao painel</Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Novo agendamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">Escolha serviço, barbeiro e horário.</p>

      {/* Service */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-gold/80">1. Serviço</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.data?.map((s) => (
            <button key={s.id} onClick={() => setServiceId(s.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition",
                serviceId === s.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
              )}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                <span className="text-gold">{currency(Number(s.price))}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.duration_minutes} min</p>
            </button>
          ))}
        </div>
      </section>

      {/* Barber */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-gold/80">2. Barbeiro</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {barbers.data?.map((b) => (
            <button key={b.id} onClick={() => setBarberId(b.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition",
                barberId === b.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
              )}>
              <span className="font-medium">{b.name}</span>
              {b.bio && <p className="mt-1 text-xs text-muted-foreground">{b.bio}</p>}
            </button>
          ))}
        </div>
      </section>

      {/* Date + slot */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-gold/80">3. Data e horário</h2>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4" />
                {date ? format(date, "PPP", { locale: ptBR }) : "Escolher data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate}
                disabled={(d) => isBefore(d, startOfDay(new Date()))}
                initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {barberId && date && (
            <Card className="flex-1 min-w-[280px]">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((t) => {
                    const isTaken = taken.data?.includes(t.getTime());
                    const past = isBefore(t, now);
                    const disabled = isTaken || past;
                    const selected = slot?.getTime() === t.getTime();
                    return (
                      <button key={t.toISOString()} disabled={disabled}
                        onClick={() => setSlot(t)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-xs transition",
                          disabled && "opacity-30 cursor-not-allowed line-through",
                          !disabled && !selected && "border-border hover:border-primary",
                          selected && "border-primary bg-primary text-primary-foreground"
                        )}>
                        {format(t, "HH:mm")}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <div className="mt-10 flex items-center justify-between border-t border-border/50 pt-6">
        <div className="text-sm text-muted-foreground">
          {serviceId && barberId && slot
            ? <>Confirmar para <b className="text-foreground">{format(slot, "PPpp", { locale: ptBR })}</b></>
            : "Preencha todas as etapas"}
        </div>
        <Button size="lg" disabled={!serviceId || !barberId || !slot || create.isPending}
          onClick={() => create.mutate()}>
          <Check className="h-4 w-4" /> Confirmar agendamento
        </Button>
      </div>
    </AppShell>
  );
}
