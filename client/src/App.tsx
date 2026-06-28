import { Outlet, Route, Routes } from "react-router-dom";
import { AppHeader } from "@/components/domain/AppHeader";
import { CatalogPage } from "@/routes/CatalogPage";
import { ProjectDetailPage } from "@/routes/ProjectDetailPage";
import { MyPortfolioPage } from "@/routes/MyPortfolioPage";
import { DeveloperProfilePage } from "@/routes/DeveloperProfilePage";
import { MarketplacePage } from "@/routes/MarketplacePage";
import { CreateProjectPage } from "@/routes/CreateProjectPage";
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
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/projects/:address" element={<ProjectDetailPage />} />
        <Route path="/portfolio" element={<MyPortfolioPage />} />
        <Route path="/developers/:wallet" element={<DeveloperProfilePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/create" element={<CreateProjectPage />} />
      </Route>
    </Routes>
  );
}
