import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { technologiesContent } from '@/content/technologies';
import './technologies.css';

export default function Technologies() {
  const { stages, terminal, labels } = technologiesContent;
  const revealRef = useReveal<HTMLDivElement>({
    selector: '.tech-stage, .tech-terminal',
  });

  return (
    <Section id={technologiesContent.id} variant="dark" className="tech">
      <header className="tech-intro">
        <div className="tech-intro-title">
          <Heading as="h2" eyebrow={technologiesContent.eyebrow}>
            {technologiesContent.title}
          </Heading>
        </div>
        <p className="tech-intro-lead">{technologiesContent.description}</p>
      </header>

      <div ref={revealRef} className="tech-body">
        <div className="tech-chain-wrap">
          <span className="tech-line" aria-hidden="true">
            <span className="tech-line-fill" />
            <span className="tech-packet" />
          </span>
          <ol className="tech-chain" aria-label={labels.chain}>
            {stages.map((stage) => (
              <li key={stage.index} className="tech-stage">
                <div className="tech-stage-head">
                  <span className="tech-node" aria-hidden="true" />
                  <span className="tech-index" aria-hidden="true">
                    {stage.index}
                  </span>
                  <h3 className="tech-place">{stage.place}</h3>
                  <p className="tech-summary">{stage.summary}</p>
                </div>
                <ul className="tech-list">
                  {stage.technologies.map((tech) => (
                    <li key={tech.title} className="tech-item">
                      <h4 className="tech-item-title">{tech.title}</h4>
                      <p className="tech-item-body">{tech.body}</p>
                      <p className="tech-captures">
                        <span className="tech-captures-label">
                          {labels.captures}
                        </span>
                        <span className="tech-captures-values">
                          {tech.captures.join(' · ')}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        <div className="tech-terminal">
          <span className="tech-terminal-label">{terminal.label}</span>
          <div className="tech-terminal-text">
            <h3 className="tech-terminal-title">{terminal.title}</h3>
            <p className="tech-terminal-body">{terminal.body}</p>
          </div>
          <svg
            className="tech-terminal-mark"
            viewBox="0 0 120 120"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="60" cy="60" r="58" />
            <circle cx="60" cy="60" r="40" />
            <circle cx="60" cy="60" r="22" />
            <circle className="tech-terminal-core" cx="60" cy="60" r="5" />
            <path d="M60 0v20M60 100v20M0 60h20M100 60h20" />
          </svg>
        </div>
      </div>
    </Section>
  );
}
