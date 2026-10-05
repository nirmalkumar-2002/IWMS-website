import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { citizenContent } from '@/content/citizen';
export default function Citizen() {
  return (
    <Section id={citizenContent.id} variant="light">
      <Heading as="h2" eyebrow={citizenContent.eyebrow}>
        {citizenContent.title}
      </Heading>
      <p className="section-description">{citizenContent.description}</p>
    </Section>
  );
}
