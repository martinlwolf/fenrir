import { Route, Routes } from "react-router-dom";
import { AppHeader } from "@/components/domain/AppHeader";
import { CatalogPage } from "@/routes/CatalogPage";
import { ProjectDetailPage } from "@/routes/ProjectDetailPage";
import { MyPortfolioPage } from "@/routes/MyPortfolioPage";
import { DeveloperProfilePage } from "@/routes/DeveloperProfilePage";
import { MarketplacePage } from "@/routes/MarketplacePage";
import { CreateProjectPage } from "@/routes/CreateProjectPage";

export function App() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/projects/:address" element={<ProjectDetailPage />} />
          <Route path="/portfolio" element={<MyPortfolioPage />} />
          <Route path="/developers/:wallet" element={<DeveloperProfilePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/create" element={<CreateProjectPage />} />
        </Routes>
      </main>
    </div>
  );
}
