import EcosystemSection from '@/components/ecosystem/EcosystemSection';
import CinematicHero from '@/components/hero/CinematicHero';
import SoftwareSection from '@/components/software/SoftwareSection';
export default function Home() {
  return (
    <>
      <CinematicHero />
      {/* Scene 04 (M2): IWMS ecosystem interface after the cinematic hero. */}
      <EcosystemSection />
      {/* M6: "IWMS in Action" — illustrative software demonstrations. */}
      <SoftwareSection />
    </>
  );
}
