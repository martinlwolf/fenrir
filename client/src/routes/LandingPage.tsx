// Landing pública de Fenrir (full-bleed, sin AppHeader ni container de la app).
// Marketing estático: todo el contenido sale de datos mockeados locales en
// components/landing/data.ts — no toca la API.
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Featured } from "@/components/landing/Featured";
import { ProjectTypes } from "@/components/landing/ProjectTypes";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--fen-bg)] font-sans text-[var(--fen-ink)] antialiased">
      <LandingHeader />
      <main>
        <Hero />
        <StatsStrip />
        <HowItWorks />
        <Featured />
        <ProjectTypes />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
