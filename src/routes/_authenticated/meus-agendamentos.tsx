import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/meus-agendamentos")({
  head: () => ({ meta: [{ title: "Meus agendamentos — Barbearia" }] }),
  component: MyAppointments,
});

type Row = {
  id: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  services: { name: string; price: number } | null;
  barbers: { name: string } | null;
};

const statusLabel: Record<Row["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function MyAppointments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["my-appointments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, notes, services(name, price), barbers(name)")
        .eq("client_id", user!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Meus agendamentos</h1>
        <Link to="/agendar"><Button><Calendar className="h-4 w-4" /> Novo</Button></Link>
      </div>

      <div className="mt-8 space-y-3">
        {q.isLoading && <p className="text-muted-foreground">Carregando...</p>}
        {q.data?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
            Nenhum agendamento ainda. <Link to="/agendar" className="text-gold underline">Agende seu primeiro</Link>.
          </div>
        )}
        {q.data?.map((row) => {
          const future = new Date(row.scheduled_at) > new Date();
          const canCancel = future && (row.status === "pending" || row.status === "confirmed");
          return (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl">{row.services?.name ?? "Serviço"}</span>
                  <Badge variant={row.status === "cancelled" ? "destructive" : row.status === "completed" ? "secondary" : "default"}>
                    {statusLabel[row.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(new Date(row.scheduled_at), "PPpp", { locale: ptBR })} · com <b>{row.barbers?.name}</b>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gold">{currency(Number(row.services?.price ?? 0))}</span>
                {canCancel && (
                  <Button variant="outline" size="sm" disabled={cancel.isPending}
                    onClick={() => cancel.mutate(row.id)}>
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
