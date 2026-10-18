import EcosystemSection from '@/components/ecosystem/EcosystemSection';
import CinematicHero from '@/components/hero/CinematicHero';
export default function Home() {
  return (
    <>
      <CinematicHero />
      {/* Scene 04 (M2): IWMS ecosystem interface after the cinematic hero. */}
      <EcosystemSection />
    </>
  );
}
