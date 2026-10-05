import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { modulesContent } from '@/content/modules';
export default function Modules() {
  return (
    <Section id={modulesContent.id} variant="light">
      <Heading as="h2" eyebrow={modulesContent.eyebrow}>
        {modulesContent.title}
      </Heading>
      <p className="section-description">{modulesContent.description}</p>
    </Section>
  );
}
