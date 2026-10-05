import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { fAQContent } from '@/content/faq';
export default function FAQ() {
  return (
    <Section id={fAQContent.id} variant="light">
      <Heading as="h2" eyebrow={fAQContent.eyebrow}>
        {fAQContent.title}
      </Heading>
      <p className="section-description">{fAQContent.description}</p>
    </Section>
  );
}
