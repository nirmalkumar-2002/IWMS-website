import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { fAQContent, isPendingAnswer } from '@/content/faq';
import { finalCTAContent } from '@/content/final-cta';
import './faq.css';

const { labels } = fAQContent;

function pad(index: number) {
  return String(index + 1).padStart(2, '0');
}

export default function FAQ() {
  const listRef = useReveal<HTMLDivElement>({ selector: '.faq-item' });

  return (
    <Section
      id={fAQContent.id}
      variant="dark"
      className="faq"
      aria-labelledby="faq-title"
    >
      <div className="faq-layout">
        <header className="faq-intro">
          <Heading
            as="h2"
            id="faq-title"
            eyebrow={fAQContent.eyebrow}
            className="faq-title"
          >
            {fAQContent.title}
          </Heading>
          <p className="faq-lead">{fAQContent.description}</p>
          <p className="faq-note">{labels.confirmedNote}</p>
          <p className="faq-contact">
            <span>{labels.contactPrompt}</span>{' '}
            <a href={`/#${finalCTAContent.id}`} className="faq-contact-link">
              {labels.contactLink}
            </a>
          </p>
        </header>

        <div ref={listRef} className="faq-list">
          {fAQContent.items.map((item, index) => {
            const pending = isPendingAnswer(item.body);
            return (
              <details key={item.title} className="faq-item">
                <summary className="faq-summary">
                  <span className="faq-index" aria-hidden="true">
                    {pad(index)}
                  </span>
                  <span className="faq-question">
                    {item.title}
                    {pending && (
                      <span className="faq-tag">{labels.pendingTag}</span>
                    )}
                  </span>
                  <span className="faq-toggle" aria-hidden="true" />
                </summary>
                <div className="faq-answer">
                  {pending ? (
                    <p className="faq-pending">{labels.pending}</p>
                  ) : (
                    <>
                      <p>{item.body}</p>
                      {item.value && (
                        <p className="faq-source">
                          {labels.sourcePrefix}
                          {item.value}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
