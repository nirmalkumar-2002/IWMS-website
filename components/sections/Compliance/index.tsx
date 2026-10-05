import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { complianceContent } from '@/content/compliance';
export default function Compliance() {
  return (
    <Section id={complianceContent.id} variant="light">
      <Heading as="h2" eyebrow={complianceContent.eyebrow}>
        {complianceContent.title}
      </Heading>
      <p className="section-description">{complianceContent.description}</p>
    </Section>
  );
}
