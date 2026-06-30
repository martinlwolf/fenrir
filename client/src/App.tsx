import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppHeader } from "@/components/domain/AppHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Toaster } from "@/components/ui/sonner";
import { VoteNotifications } from "@/components/domain/VoteNotifications";
import { HomePage } from "@/routes/HomePage";
import { CatalogPage } from "@/routes/CatalogPage";
import { ProjectDetailPage } from "@/routes/ProjectDetailPage";
import { MyPortfolioPage } from "@/routes/MyPortfolioPage";
import { DevelopersPage } from "@/routes/DevelopersPage";
import { DeveloperProfilePage } from "@/routes/DeveloperProfilePage";
import { MarketplacePage } from "@/routes/MarketplacePage";
import { CreateProjectPage } from "@/routes/CreateProjectPage";
import { RegisterDeveloperPage } from "@/routes/RegisterDeveloperPage";
import { LandingPage } from "@/routes/LandingPage";

// Layout de la app: header global + footer comun en todas las vistas. El home (/) es una
// landing full-bleed: su hero ocupa todo el ancho y el header va transparente encima; el resto
// de las vistas usan el container con padding.
//
// El area de contenido siempre mide al menos el alto del viewport (menos el header), asi el
// footer queda SIEMPRE por debajo del fold: solo aparece al scrollear hasta el final, en
// cualquier pagina, sin tener que ajustarlas una por una.
function AppLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <AppHeader overlay={isHome} />
      <main
        className={
          isHome
            ? "flex-1"
            : "container flex-1 py-8 min-h-[calc(100dvh-4rem)]"
        }
      >
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}

export function App() {
  return (
    <>
      {/* Avisa a cada inversor de las votaciones de sus proyectos, desde cualquier vista. */}
      <VoteNotifications />
      <Toaster position="top-right" closeButton richColors />
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<CatalogPage />} />
          <Route path="/projects/:address" element={<ProjectDetailPage />} />
          <Route path="/portfolio" element={<MyPortfolioPage />} />
          <Route path="/developers" element={<DevelopersPage />} />
          <Route path="/developers/register" element={<RegisterDeveloperPage />} />
          <Route path="/developers/:wallet" element={<DeveloperProfilePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/create" element={<CreateProjectPage />} />
        </Route>
      </Routes>
    </>
  );
}
