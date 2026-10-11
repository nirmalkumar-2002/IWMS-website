import { useEffect, useRef, useState } from 'react';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { citizenContent } from '@/content/citizen';
import type { CitizenScreen, CitizenScreenId } from '@/content/citizen';
import './citizen.css';

const { beats, screens, labels, sides, governance } = citizenContent;

function screenIndex(id: CitizenScreenId) {
  return Math.max(
    0,
    screens.findIndex((screen) => screen.id === id),
  );
}

function Stars() {
  return (
    <span className="citizen-stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((star) => (
        <svg key={star} viewBox="0 0 24 24" data-filled={star < 4}>
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
        </svg>
      ))}
    </span>
  );
}

function PhoneScreen({ screen }: { screen: CitizenScreen }) {
  const isSteps = screen.id === 'escalation';
  return (
    <div className="citizen-screen" data-screen={screen.id}>
      <p className="citizen-screen-name">{screen.name}</p>
      <p className="citizen-screen-heading">{screen.heading}</p>
      {screen.id === 'rating' && (
        <p className="citizen-rating">
          <Stars />
          <span className="citizen-sr">{labels.ratingHint}</span>
          <span className="citizen-rating-value" aria-hidden="true">
            {labels.ratingValue}
          </span>
        </p>
      )}
      <dl className={isSteps ? 'citizen-lines citizen-steps' : 'citizen-lines'}>
        {screen.lines.map((line) => (
          <div key={line.label} className="citizen-line">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Citizen() {
  const [active, setActive] = useState(0);
  const storyRef = useRef<HTMLOListElement>(null);
  const revealRef = useReveal<HTMLDivElement>({
    selector: '.citizen-beat, .citizen-gov-item',
  });

  // On wide screens the phone is sticky; follow the beat closest to the viewport centre.
  useEffect(() => {
    const list = storyRef.current;
    if (!list || !window.matchMedia('(min-width: 1024px)').matches) return;
    const rows = Array.from(
      list.querySelectorAll<HTMLElement>('[data-screen-id]'),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        const id = hit?.target.getAttribute('data-screen-id');
        if (id) setActive(screenIndex(id as CitizenScreenId));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  const current = screens[active] ?? screens[0];
  const step = (delta: number) =>
    setActive((index) => (index + delta + screens.length) % screens.length);

  return (
    <Section id={citizenContent.id} variant="light" className="citizen">
      <header className="citizen-intro">
        <div className="citizen-intro-title">
          <Heading as="h2" eyebrow={citizenContent.eyebrow}>
            {citizenContent.title}
          </Heading>
        </div>
        <p className="citizen-intro-lead">{citizenContent.description}</p>
      </header>

      <div ref={revealRef}>
        <div className="citizen-story">
          <div className="citizen-story-text">
            <h3 className="citizen-story-title">{citizenContent.storyTitle}</h3>
            <ol
              ref={storyRef}
              className="citizen-beats"
              aria-label={labels.story}
            >
              {beats.map((beat, index) => (
                <li
                  key={beat.moment}
                  className="citizen-beat"
                  data-screen-id={beat.screen}
                  data-active={screenIndex(beat.screen) === active}
                >
                  <p className="citizen-moment">
                    <span className="citizen-moment-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {beat.moment}
                  </p>
                  <div className="citizen-split">
                    <div className="citizen-side">
                      <span className="citizen-side-label">
                        {sides.resident}
                      </span>
                      <p>{beat.resident}</p>
                    </div>
                    <div className="citizen-side citizen-side-city">
                      <span className="citizen-side-label">{sides.city}</span>
                      <p>{beat.city}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <figure className="citizen-phone-wrap" aria-label={labels.phone}>
            <div className="citizen-phone">
              <span className="citizen-phone-notch" aria-hidden="true" />
              <PhoneScreen key={current.id} screen={current} />
            </div>
            <div
              className="citizen-controls"
              role="group"
              aria-label={labels.screenPicker}
            >
              <button
                type="button"
                className="citizen-step"
                onClick={() => step(-1)}
                aria-label={labels.previous}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <ul className="citizen-tabs">
                {screens.map((screen, index) => (
                  <li key={screen.id}>
                    <button
                      type="button"
                      className="citizen-tab"
                      aria-pressed={index === active}
                      onClick={() => setActive(index)}
                    >
                      {screen.name}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="citizen-step"
                onClick={() => step(1)}
                aria-label={labels.next}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <figcaption className="citizen-caption">
              {labels.illustration}
            </figcaption>
          </figure>
        </div>

        <div className="citizen-gov">
          <div className="citizen-gov-head">
            <span className="citizen-gov-eyebrow">{governance.eyebrow}</span>
            <h3 className="citizen-gov-title">{governance.title}</h3>
          </div>
          <ol className="citizen-gov-list">
            {citizenContent.items.map((item, index) => (
              <li key={item.title} className="citizen-gov-item">
                <span className="citizen-gov-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h4 className="citizen-gov-item-title">{item.title}</h4>
                  <p className="citizen-gov-item-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
