import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TxFeedback } from "@/components/domain/TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useDeveloper } from "@/hooks/useDeveloper";
import { registerDeveloper } from "@/lib/chain/contracts";
import { shortAddress } from "@/lib/format";

// Alta de developer (on-chain) firmando contra el FenrirFactory (FR-012). Pantalla propia:
// el alta es prerequisito de crear un proyecto, asi que se valida ANTES y por separado para
// no perder el form del proyecto si la wallet todavia no estaba registrada.
export function RegisterDeveloperPage() {
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();

  const {
    data: developer,
    isLoading: devLoading,
    refetch: refetchDeveloper,
  } = useDeveloper(address ?? undefined);
  const isRegistered = !!developer;

  const register = useWrite(address ? [["developer", address]] : []);
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");

  // Tras confirmar el alta on-chain, el backend tarda en espejar el evento. Sondeamos la
  // identidad hasta verla registrada para que la tarjeta pase a "Registrado" sin que el
  // usuario recargue (y sin perder navegacion).
  useEffect(() => {
    if (register.phase !== "confirmed" || isRegistered) return;
    const interval = setInterval(() => void refetchDeveloper(), 2500);
    return () => clearInterval(interval);
  }, [register.phase, isRegistered, refetchDeveloper]);

  if (!hasWallet) {
    return <p className="text-muted-foreground">Necesitás una wallet para registrarte como developer.</p>;
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
      <h1 className="text-2xl font-semibold">Identidad de developer</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devLoading ? (
            <p className="text-sm text-muted-foreground">Verificando tu registro…</p>
          ) : developer ? (
            <>
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
              <Button asChild>
                <Link to="/create">Crear proyecto</Link>
              </Button>
            </>
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
                disabled={register.phase === "signing" || register.phase === "mining" || !razonSocial || !cuit}
                onClick={() => void register.run(() => registerDeveloper(razonSocial, cuit))}
              >
                Registrar developer
              </Button>
              {register.phase === "confirmed" && (
                <p className="text-sm text-muted-foreground">
                  Registro confirmado on-chain. Esperando a que el backend lo espeje…
                </p>
              )}
              <TxFeedback phase={register.phase} error={register.error} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
