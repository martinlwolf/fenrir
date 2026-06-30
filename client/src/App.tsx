import { Outlet, Route, Routes } from "react-router-dom";
import { AppHeader } from "@/components/domain/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { VoteNotifications } from "@/components/domain/VoteNotifications";
import { CatalogPage } from "@/routes/CatalogPage";
import { ProjectDetailPage } from "@/routes/ProjectDetailPage";
import { MyPortfolioPage } from "@/routes/MyPortfolioPage";
import { DevelopersPage } from "@/routes/DevelopersPage";
import { DeveloperProfilePage } from "@/routes/DeveloperProfilePage";
import { MarketplacePage } from "@/routes/MarketplacePage";
import { CreateProjectPage } from "@/routes/CreateProjectPage";
import { RegisterDeveloperPage } from "@/routes/RegisterDeveloperPage";
import { LandingPage } from "@/routes/LandingPage";

// Layout de la app: header global + container. La landing va por fuera (full-bleed).
function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <Outlet />
      </main>
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
          <Route path="/" element={<CatalogPage />} />
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
