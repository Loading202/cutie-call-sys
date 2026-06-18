import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Pencil, Trash2, TrendingUp, Users, CalendarDays, DollarSign } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { currency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel — Barbearia" }] }),
  component: AdminPanel,
});

type Service = { id: string; name: string; description: string | null; duration_minutes: number; price: number; active: boolean };
type Barber = { id: string; name: string; bio: string | null; active: boolean };
type Appt = {
  id: string; scheduled_at: string; status: "pending"|"confirmed"|"completed"|"cancelled"; notes: string | null;
  services: { name: string; price: number } | null;
  barbers: { name: string } | null;
  profiles: { full_name: string; phone: string } | null;
};

function AdminPanel() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== "admin") navigate({ to: "/agendar" });
  }, [role, loading, navigate]);

  if (loading) return <AppShell><p className="text-muted-foreground">Carregando...</p></AppShell>;
  if (role !== "admin") return null;

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Painel</h1>
      <p className="mt-2 text-sm text-muted-foreground">Gestão completa da barbearia.</p>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="barbers">Barbeiros</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="appointments"><AppointmentsTab /></TabsContent>
        <TabsContent value="services"><ServicesTab /></TabsContent>
        <TabsContent value="barbers"><BarbersTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------------- Overview ---------------- */
function Overview() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date();
      const dStart = startOfDay(today).toISOString();
      const dEnd = endOfDay(today).toISOString();

      const [todayAppt, totalClients, completed] = await Promise.all([
        supabase.from("appointments").select("id, services(price)", { count: "exact" })
          .gte("scheduled_at", dStart).lte("scheduled_at", dEnd).neq("status", "cancelled"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("services(price)").eq("status", "completed"),
      ]);

      const todayRevenue = (todayAppt.data ?? []).reduce(
        (sum, a: any) => sum + Number(a.services?.price ?? 0), 0);
      const totalRevenue = (completed.data ?? []).reduce(
        (sum, a: any) => sum + Number(a.services?.price ?? 0), 0);

      return {
        todayCount: todayAppt.count ?? 0,
        clients: totalClients.count ?? 0,
        todayRevenue,
        totalRevenue,
      };
    },
  });

  const cards = [
    { icon: CalendarDays, label: "Agendamentos hoje", value: stats.data?.todayCount ?? "—" },
    { icon: DollarSign, label: "Receita prevista hoje", value: stats.data ? currency(stats.data.todayRevenue) : "—" },
    { icon: Users, label: "Clientes cadastrados", value: stats.data?.clients ?? "—" },
    { icon: TrendingUp, label: "Faturamento total", value: stats.data ? currency(stats.data.totalRevenue) : "—" },
  ];

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-lg border border-border bg-card p-6">
          <Icon className="h-5 w-5 text-gold" />
          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-3xl">{value}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Appointments ---------------- */
const statusLabel: Record<Appt["status"], string> = {
  pending: "Pendente", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado",
};

function AppointmentsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");

  const q = useQuery({
    queryKey: ["admin-appointments", filter],
    queryFn: async () => {
      let query = supabase.from("appointments")
        .select("id, scheduled_at, status, notes, services(name, price), barbers(name), profiles(full_name, phone)")
        .order("scheduled_at", { ascending: filter === "upcoming" });
      if (filter === "upcoming") {
        query = query.gte("scheduled_at", new Date().toISOString()).neq("status", "cancelled");
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Appt[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Appt["status"] }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["admin-appointments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">Agendamentos</h2>
        <Select value={filter} onValueChange={(v) => setFilter(v as "upcoming"|"all")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Próximos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {q.data?.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Nenhum agendamento.
          </div>
        )}
        {q.data?.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg">{a.services?.name}</span>
                <Badge variant={a.status === "cancelled" ? "destructive" : a.status === "completed" ? "secondary" : "default"}>
                  {statusLabel[a.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(new Date(a.scheduled_at), "PPpp", { locale: ptBR })} · {a.barbers?.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cliente: <b className="text-foreground">{a.profiles?.full_name ?? "—"}</b> · {a.profiles?.phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={a.status}
                onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v as Appt["status"] })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Services ---------------- */
function ServicesTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["admin-services"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">Serviços</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="space-y-3">
        {q.data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                {!s.active && <Badge variant="secondary">Inativo</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{s.duration_minutes} min · {currency(Number(s.price))}</p>
              {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                if (confirm("Remover serviço?")) remove.mutate(s.id);
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ServiceDialog open={open} onOpenChange={setOpen} service={editing} />
    </div>
  );
}

function ServiceDialog({ open, onOpenChange, service }: { open: boolean; onOpenChange: (v: boolean) => void; service: Service | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setDuration(service?.duration_minutes ?? 30);
    setPrice(service ? Number(service.price) : 0);
    setActive(service?.active ?? true);
  }, [service, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, description, duration_minutes: duration, price, active };
      if (service) {
        const { error } = await supabase.from("services").update(payload).eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services-active"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
            <div><Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Barbers ---------------- */
function BarbersTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").order("name");
      if (error) throw error;
      return data as Barber[];
    },
  });

  const [editing, setEditing] = useState<Barber | null>(null);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["admin-barbers"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">Barbeiros</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="space-y-3">
        {q.data?.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{b.name}</span>
                {!b.active && <Badge variant="secondary">Inativo</Badge>}
              </div>
              {b.bio && <p className="mt-1 text-xs text-muted-foreground">{b.bio}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => { setEditing(b); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                if (confirm("Remover barbeiro?")) remove.mutate(b.id);
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <BarberDialog open={open} onOpenChange={setOpen} barber={editing} />
    </div>
  );
}

function BarberDialog({ open, onOpenChange, barber }: { open: boolean; onOpenChange: (v: boolean) => void; barber: Barber | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    setName(barber?.name ?? "");
    setBio(barber?.bio ?? "");
    setActive(barber?.active ?? true);
  }, [barber, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, bio, active };
      if (barber) {
        const { error } = await supabase.from("barbers").update(payload).eq("id", barber.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("barbers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin-barbers"] });
      qc.invalidateQueries({ queryKey: ["barbers-active"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{barber ? "Editar barbeiro" : "Novo barbeiro"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
