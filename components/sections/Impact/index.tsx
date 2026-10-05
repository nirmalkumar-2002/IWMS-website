import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { impactContent } from '@/content/impact';
export default function Impact() {
  return (
    <Section id={impactContent.id} variant="dark">
      <Heading as="h2" eyebrow={impactContent.eyebrow}>
        {impactContent.title}
      </Heading>
      <p className="section-description">{impactContent.description}</p>
    </Section>
  );
}
