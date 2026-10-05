import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { dashboardContent } from '@/content/dashboard';
export default function Dashboard() {
  return (
    <Section id={dashboardContent.id} variant="dark">
      <Heading as="h2" eyebrow={dashboardContent.eyebrow}>
        {dashboardContent.title}
      </Heading>
      <p className="section-description">{dashboardContent.description}</p>
    </Section>
  );
}
