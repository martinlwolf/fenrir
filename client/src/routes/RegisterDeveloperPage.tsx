import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Hash,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/domain/PageHeader";
import { CertificatePill } from "@/components/domain/CertificateBadge";
import { TxFeedback } from "@/components/domain/TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useOnchainDeveloper } from "@/hooks/useOnchainDeveloper";
import { registerDeveloper } from "@/lib/chain/contracts";
import { AddressTag } from "@/components/domain/AddressTag";

// Alta de developer (on-chain) firmando contra el FenrirFactory (FR-012). El registro se LEE
// directo del factory on-chain (no del backend espejo), porque eso es lo que valida
// createProject: si redeployás el factory, el backend puede seguir diciendo "registrado" pero
// el factory nuevo no te conoce. Pantalla propia: el alta es prerequisito de crear un proyecto.
export function RegisterDeveloperPage() {
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();

  const register = useWrite(address ? [["onchain-developer", address]] : []);
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");

  // Tras confirmar el alta on-chain sondeamos el factory hasta verla registrada, sin que el
  // usuario recargue (poll directo a la cadena, no al backend).
  const { data: developer, isLoading: devLoading } = useOnchainDeveloper(
    address,
    register.phase === "confirmed",
  );
  const isRegistered = !!developer?.registered;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Desarrolladores"
        title="Convertite en desarrollador"
        description="Registrá tu identidad on-chain para publicar y fondear proyectos. Tu historial de obras —exitosas y fallidas— queda como reputación verificable."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Panel de valor */}
        <DeveloperValuePanel />

        {/* Formulario / estado */}
        <Card className="animate-fade-up border-[var(--fen-border)]">
          <CardContent className="space-y-5 p-6">
            {!hasWallet ? (
              <GateState
                Icon={Wallet}
                title="Necesitás una wallet"
                description="Instalá MetaMask para registrarte como desarrollador en Fenrir."
                action={
                  <Button variant="outline" asChild>
                    <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                      Instalar MetaMask
                    </a>
                  </Button>
                }
              />
            ) : !address ? (
              <GateState
                Icon={Wallet}
                title="Conectá tu wallet"
                description="Conectá tu wallet para empezar el registro on-chain."
                action={<Button onClick={() => void connect()}>Conectar wallet</Button>}
              />
            ) : !isOnSepolia ? (
              <GateState
                Icon={ShieldCheck}
                title="Cambiá de red"
                description="El registro se firma en la red Sepolia. Cambiá de red para continuar."
                action={
                  <Button variant="destructive" onClick={() => void switchNetwork()}>
                    Cambiar a Sepolia
                  </Button>
                }
              />
            ) : devLoading ? (
              <p className="py-8 text-center text-sm text-[var(--fen-muted)]">
                Verificando tu registro…
              </p>
            ) : isRegistered ? (
              <div className="animate-rise space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--fen-verified)]/25 bg-[var(--fen-verified-soft)] p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--fen-accent)] text-white">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg font-semibold text-[var(--fen-ink)]">
                      {developer.razonSocial}
                    </p>
                    <p className="text-sm text-[var(--fen-body)]">CUIT {developer.cuit}</p>
                    <p className="text-xs text-[var(--fen-muted)]">
                      <AddressTag address={address} />
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--fen-body)]">
                  Tu identidad ya está registrada en el factory actual. Ya podés crear y publicar
                  proyectos.
                </p>
                <Button variant="brand" className="w-full" asChild>
                  <Link to="/create">
                    Crear mi primer proyecto <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-[var(--fen-ink)]">
                    Registro de identidad
                  </h2>
                  <p className="mt-1 text-sm text-[var(--fen-body)]">
                    Esta wallet todavía no está registrada como desarrollador. Completá tus datos
                    una sola vez para poder crear proyectos.
                  </p>
                </div>

                <div className="space-y-4">
                  <Field
                    id="razon"
                    label="Razón social"
                    Icon={Building2}
                    placeholder="Constructora del Norte S.A."
                    value={razonSocial}
                    onChange={setRazonSocial}
                  />
                  <Field
                    id="cuit"
                    label="CUIT"
                    Icon={Hash}
                    placeholder="30-71234567-8"
                    value={cuit}
                    onChange={setCuit}
                  />
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-[var(--fen-surface)] p-3 text-xs text-[var(--fen-body)]">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--fen-accent)]" />
                  El alta queda registrada on-chain y es pública. Firmás una transacción en Sepolia
                  desde tu wallet.
                </div>

                <Button
                  variant="brand"
                  className="w-full"
                  disabled={
                    register.phase === "signing" ||
                    register.phase === "mining" ||
                    !razonSocial ||
                    !cuit
                  }
                  onClick={() => void register.run(() => registerDeveloper(razonSocial, cuit))}
                >
                  Registrar desarrollador
                </Button>

                {register.phase === "confirmed" && !isRegistered && (
                  <p className="text-center text-sm text-[var(--fen-muted)]">
                    Registro confirmado on-chain. Actualizando…
                  </p>
                )}
                <TxFeedback phase={register.phase} error={register.error} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeveloperValuePanel() {
  return (
    <div className="animate-fade-up space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[var(--fen-border)]">
        <div className="relative aspect-[16/9]">
          <img
            src="/buildings/inv-06.jpg"
            alt="Edificio en desarrollo"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fen-ink)]/85 to-transparent" />
          <div className="absolute inset-x-5 bottom-5">
            <p className="font-serif text-2xl font-semibold text-white">
              Construí reputación verificable
            </p>
            <p className="mt-1 text-sm text-white/80">
              Cada proyecto suma una credencial soulbound a tu wallet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <Step
          n="01"
          title="Registrá tu identidad"
          body="Razón social y CUIT firmados on-chain contra el FenrirFactory."
        />
        <Step
          n="02"
          title="Publicá proyectos"
          body="Definí hitos, presupuesto y objetivo de fondeo. La comunidad invierte y vota."
        />
        <Step
          n="03"
          title="Acumulá credenciales"
          body="Al completar una obra recibís un Certificado de Finalización; si se cancela, uno de Proyecto Fallido."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <CertificatePill kind="completion" label="Finalización" />
        <CertificatePill kind="failed" label="Proyecto fallido" />
        <CertificatePill kind="fdt" label="FDT del proyecto" />
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--fen-border)] bg-card p-4">
      <span className="font-mono text-sm font-bold text-[var(--fen-accent)]">{n}</span>
      <div>
        <p className="font-semibold text-[var(--fen-ink)]">{title}</p>
        <p className="text-sm text-[var(--fen-body)]">{body}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  Icon,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  Icon: typeof Building2;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fen-muted)]" />
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}

function GateState({
  Icon,
  title,
  description,
  action,
}: {
  Icon: typeof Wallet;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--fen-surface-2)] text-[var(--fen-accent)]">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="font-semibold text-[var(--fen-ink)]">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--fen-body)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
