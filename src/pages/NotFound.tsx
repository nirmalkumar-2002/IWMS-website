import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { Button } from '@/components/ui/Button';
import { sharedContent } from '@/content/shared';
export default function NotFound() {
  return (
    <Section id="not-found">
      <Heading as="h1">{sharedContent.notFoundTitle}</Heading>
      <p>{sharedContent.notFoundBody}</p>
      <Button href="/">{sharedContent.back}</Button>
    </Section>
  );
}
