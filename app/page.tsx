import HeaderPublico from "@/components/publico/HeaderPublico";
import HeroPublico from "@/components/publico/HeroPublico";
import CaracteristicasPublicas from "@/components/publico/CaracteristicasPublicas";
import ComoFuncionaPublico from "@/components/publico/ComoFuncionaPublico";
import PorQueElegirPublico from "@/components/publico/PorQueElegirPublico";
import PlanesPublicos from "@/components/publico/PlanesPublicos";
import PreguntasFrecuentesPublicas from "@/components/publico/PreguntasFrecuentesPublicas";
import LlamadoFinalPublico from "@/components/publico/LlamadoFinalPublico";
import FooterPublico from "@/components/publico/FooterPublico";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      <HeaderPublico />

      <HeroPublico />

      <CaracteristicasPublicas />

      <ComoFuncionaPublico />

      <PorQueElegirPublico />

      <PlanesPublicos />

      <PreguntasFrecuentesPublicas />

      <LlamadoFinalPublico />

      <FooterPublico />
    </main>
  );
}