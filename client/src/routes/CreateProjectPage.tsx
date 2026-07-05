import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { createProject } from "@/lib/chain/contracts";
import { ethToWei } from "@/lib/format";
import {
  PROJECT_TYPE,
  VOTING_MODE,
  type ProjectTypeValue,
  type VotingModeValue,
} from "@shared/constants/enums";

interface MilestoneInput {
  // Promesa de lo que el developer se compromete a entregar en el hito. Queda inmutable
  // on-chain y es contra lo que el DAO vota el cumplimiento.
  description: string;
  budgetEth: string;
  durationDays: string;
}

// Creacion de proyecto firmando contra el FenrirFactory (FR-012). El contrato valida las
// reglas; la UI solo valida formato. El alta de developer es prerequisito y vive en su
// propia pantalla (/developers/register): esta pagina NO muestra el form del proyecto hasta
// confirmar que la wallet esta registrada, para no perder datos cargados.
export function CreateProjectPage() {
  const navigate = useNavigate();
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();

  // Registro leído del backend: 404 si no existe → isError=true, data=undefined → no registrado.
  const developer = useDeveloper(address ?? undefined);
  const isRegistered = !developer.isLoading && !!developer.data;
  const devLoading = developer.isLoading;

  const create = useWrite();
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [projectType, setProjectType] = useState<ProjectTypeValue>("Investment");
  const [votingMode, setVotingMode] = useState<VotingModeValue>("ByToken");
  const [fmpa, setFmpa] = useState("");
  const [ff, setFf] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedSalePrice, setEstimatedSalePrice] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: "", budgetEth: "", durationDays: "" },
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
      const descriptions = milestones.map((m) => {
        const desc = m.description.trim();
        // Cada hito debe declarar su promesa: es el patron contra el que vota el DAO.
        if (!desc) throw new Error();
        return desc;
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
          milestoneDescriptions: descriptions,
          estimatedSalePrice:
            projectType === "Investment" && estimatedSalePrice ? ethToWei(estimatedSalePrice) : 0n,
        }),
      );
      if (ok) setTimeout(() => navigate("/"), 1500);
    } catch {
      setFormError(
        "Revisá los campos: cada hito necesita una descripción, un monto en ETH y una duración en días válidos.",
      );
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

  // Gate de registro: sin developer confirmado no se renderiza el form del proyecto, asi no
  // se cargan datos que se perderian. Mientras verificamos, evitamos el parpadeo.
  if (devLoading) {
    return <p className="text-sm text-muted-foreground">Verificando tu registro de developer…</p>;
  }
  if (!isRegistered) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Crear proyecto</h1>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Necesitás registrarte como developer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Solo las wallets registradas como developer pueden crear proyectos. Registrate una
              vez y volvé acá para cargar el proyecto.
            </p>
            <Button asChild>
              <Link to="/developers/register">Registrarme como developer</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Crear proyecto</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Datos del proyecto</CardTitle>
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
            <Label>Hitos (promesa, presupuesto y duración)</Label>
            <p className="text-xs text-muted-foreground">
              La descripción es la promesa de lo que entregás en cada hito. Queda fija on-chain y
              es contra lo que los inversores votan si se cumplió.
            </p>
            {milestones.map((m, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Hito {i + 1}</span>
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
                <textarea
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="¿Qué te comprometés a entregar en este hito? (ej: cimientos y estructura de la planta baja terminados)"
                  value={m.description}
                  onChange={(e) => updateMilestone(i, { description: e.target.value })}
                />
                <div className="flex gap-2">
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
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMilestones((ms) => [...ms, { description: "", budgetEth: "", durationDays: "" }])
              }
            >
              Agregar hito
            </Button>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <TxFeedback phase={create.phase} error={create.error} />
          <Button onClick={() => void onCreate()} disabled={busyCreate}>
            {busyCreate ? "Procesando…" : "Crear proyecto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
