import Hero from '@/components/sections/Hero';
import Problem from '@/components/sections/Problem';
import Journey from '@/components/sections/Journey';
import Modules from '@/components/sections/Modules';
import Dashboard from '@/components/sections/Dashboard';
import Technologies from '@/components/sections/Technologies';
import Citizen from '@/components/sections/Citizen';
import Compliance from '@/components/sections/Compliance';
import Impact from '@/components/sections/Impact';
import Finance from '@/components/sections/Finance';
import Estimator from '@/components/sections/Estimator';
import Roadmap from '@/components/sections/Roadmap';
import Audience from '@/components/sections/Audience';
import FAQ from '@/components/sections/FAQ';
import FinalCTA from '@/components/sections/FinalCTA';
export const sectionRegistry = {
  hero: Hero,
  problem: Problem,
  journey: Journey,
  modules: Modules,
  dashboard: Dashboard,
  technologies: Technologies,
  citizen: Citizen,
  compliance: Compliance,
  impact: Impact,
  finance: Finance,
  estimator: Estimator,
  roadmap: Roadmap,
  audience: Audience,
  faq: FAQ,
  'final-cta': FinalCTA,
} as const;
export type SectionName = keyof typeof sectionRegistry;
