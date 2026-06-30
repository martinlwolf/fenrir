import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TxFeedback } from "@/components/domain/TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useDeveloper } from "@/hooks/useDeveloper";
import { createProject, registerDeveloper } from "@/lib/chain/contracts";
import { ethToWei, shortAddress } from "@/lib/format";
import {
  PROJECT_TYPE,
  VOTING_MODE,
  type ProjectTypeValue,
  type VotingModeValue,
} from "@shared/constants/enums";

interface MilestoneInput {
  budgetEth: string;
  durationDays: string;
}

// Alta de developer (on-chain) + creacion de proyecto firmando contra el FenrirFactory
// (FR-012). El contrato valida las reglas; la UI solo valida formato.
export function CreateProjectPage() {
  const navigate = useNavigate();
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();

  // Identidad on-chain de la wallet conectada: si ya esta registrada como developer,
  // mostramos sus datos y no dejamos registrar de nuevo.
  const {
    data: developer,
    isLoading: devLoading,
    refetch: refetchDeveloper,
  } = useDeveloper(address ?? undefined);
  const isRegistered = !!developer;

  const register = useWrite(address ? [["developer", address]] : []);
  const create = useWrite();
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");

  // Tras confirmar el alta on-chain, el backend tarda en espejar el evento; reintentamos
  // leer la identidad para que la tarjeta pase a "Registrado" sin recargar.
  useEffect(() => {
    if (register.phase !== "confirmed") return;
    const timers = [1500, 5000, 10000].map((ms) =>
      setTimeout(() => void refetchDeveloper(), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [register.phase, refetchDeveloper]);

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [projectType, setProjectType] = useState<ProjectTypeValue>("Investment");
  const [votingMode, setVotingMode] = useState<VotingModeValue>("ByToken");
  const [fmpa, setFmpa] = useState("");
  const [ff, setFf] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedSalePrice, setEstimatedSalePrice] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { budgetEth: "", durationDays: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const busyCreate =
    create.phase === "signing" || create.phase === "mining" || create.phase === "propagating";

  function updateMilestone(i: number, patch: Partial<MilestoneInput>) {
    setMilestones((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  async function onCreate() {
    setFormError(null);
    try {
      const budgets = milestones.map((m) => ethToWei(m.budgetEth));
      const durations = milestones.map((m) => {
        const days = Number(m.durationDays);
        if (!Number.isFinite(days) || days <= 0) throw new Error();
        return Math.round(days * 86400);
      });
      const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
      if (!Number.isFinite(deadlineTs)) throw new Error();

      const ok = await create.run(() =>
        createProject({
          tokenName,
          tokenSymbol,
          projectType,
          votingMode,
          fmpa: ethToWei(fmpa),
          ff: ethToWei(ff),
          fundingDeadline: deadlineTs,
          milestoneBudgets: budgets,
          milestoneDurations: durations,
          estimatedSalePrice:
            projectType === "Investment" && estimatedSalePrice ? ethToWei(estimatedSalePrice) : 0n,
        }),
      );
      if (ok) setTimeout(() => navigate("/"), 1500);
    } catch {
      setFormError("Revisá los campos: montos en ETH y duraciones en días válidas.");
    }
  }

  if (!hasWallet) {
    return <p className="text-muted-foreground">Necesitás una wallet para crear un proyecto.</p>;
  }
  if (!address) {
    return <Button onClick={() => void connect()}>Conectar wallet</Button>;
  }
  if (!isOnSepolia) {
    return (
      <Button variant="destructive" onClick={() => void switchNetwork()}>
        Cambiar a Sepolia
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Crear proyecto</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Identidad de developer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devLoading ? (
            <p className="text-sm text-muted-foreground">Verificando tu registro…</p>
          ) : developer ? (
            <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="font-medium">{developer.razonSocial}</span>
                </div>
                <p className="text-sm text-muted-foreground">CUIT {developer.cuit}</p>
                <p className="text-xs text-muted-foreground">{shortAddress(developer.wallet)}</p>
              </div>
              <Badge variant="success">Registrado</Badge>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Esta wallet todavía no está registrada como developer. Registrate una vez para
                poder crear proyectos.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="razon">Razón social</Label>
                  <Input id="razon" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cuit">CUIT</Label>
                  <Input id="cuit" value={cuit} onChange={(e) => setCuit(e.target.value)} />
                </div>
              </div>
              <Button
                variant="outline"
                disabled={register.phase === "signing" || register.phase === "mining" || !razonSocial || !cuit}
                onClick={() => void register.run(() => registerDeveloper(razonSocial, cuit))}
              >
                Registrar developer
              </Button>
              <TxFeedback phase={register.phase} error={register.error} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">2. Datos del proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tname">Nombre del token (FDT)</Label>
              <Input id="tname" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tsym">Símbolo</Label>
              <Input id="tsym" value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectTypeValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "Investment" ? "Inversión" : "Cívico"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Modo de voto</Label>
              <Select value={votingMode} onValueChange={(v) => setVotingMode(v as VotingModeValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOTING_MODE.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "ByToken" ? "1 FDT = 1 voto" : "1 wallet = 1 voto"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fmpa">FMPA (ETH)</Label>
              <Input id="fmpa" value={fmpa} onChange={(e) => setFmpa(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ff">FF (ETH)</Label>
              <Input id="ff" value={ff} onChange={(e) => setFf(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Vencimiento de fondeo</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {projectType === "Investment" && (
              <div className="space-y-1.5">
                <Label htmlFor="esp">Precio estimado de venta (ETH)</Label>
                <Input
                  id="esp"
                  value={estimatedSalePrice}
                  onChange={(e) => setEstimatedSalePrice(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Hitos (presupuesto y duración)</Label>
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Tranche (ETH)"
                  value={m.budgetEth}
                  onChange={(e) => updateMilestone(i, { budgetEth: e.target.value })}
                />
                <Input
                  placeholder="Días"
                  value={m.durationDays}
                  onChange={(e) => updateMilestone(i, { durationDays: e.target.value })}
                />
                {milestones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMilestones((ms) => ms.filter((_, idx) => idx !== i))}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMilestones((ms) => [...ms, { budgetEth: "", durationDays: "" }])}
            >
              Agregar hito
            </Button>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {!isRegistered && !devLoading && (
            <p className="text-sm text-muted-foreground">
              Registrate como developer (paso 1) para poder crear el proyecto.
            </p>
          )}
          <TxFeedback phase={create.phase} error={create.error} />
          <Button onClick={() => void onCreate()} disabled={busyCreate || !isRegistered}>
            {busyCreate ? "Procesando…" : "Crear proyecto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
