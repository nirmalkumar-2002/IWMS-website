import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { financeContent } from '@/content/finance';
export default function Finance() {
  return (
    <Section id={financeContent.id} variant="light">
      <Heading as="h2" eyebrow={financeContent.eyebrow}>
        {financeContent.title}
      </Heading>
      <p className="section-description">{financeContent.description}</p>
    </Section>
  );
}
