import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { complianceContent } from '@/content/compliance';
import './compliance.css';

export default function Compliance() {
  const { pillars, ledger, note } = complianceContent;
  const revealRef = useReveal<HTMLDivElement>({
    selector: '.compliance-pillar, .compliance-ledger',
  });

  return (
    <Section id={complianceContent.id} variant="dark" className="compliance">
      <header className="compliance-intro">
        <div className="compliance-intro-title">
          <Heading as="h2" eyebrow={complianceContent.eyebrow}>
            {complianceContent.title}
          </Heading>
        </div>
        <p className="compliance-intro-lead">{complianceContent.description}</p>
      </header>

      <div ref={revealRef} className="compliance-body">
        <ol className="compliance-pillars">
          {pillars.map((pillar) => (
            <li key={pillar.index} className="compliance-pillar">
              <span className="compliance-index" aria-hidden="true">
                {pillar.index}
              </span>
              <div className="compliance-pillar-text">
                <h3 className="compliance-pillar-title">{pillar.title}</h3>
                <p className="compliance-pillar-body">{pillar.body}</p>
                <ul className="compliance-bullets">
                  {pillar.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <figure className="compliance-ledger">
          <figcaption className="compliance-ledger-head">
            <span className="compliance-ledger-title">{ledger.title}</span>
            <span className="compliance-ledger-caption">{ledger.caption}</span>
          </figcaption>
          <table className="compliance-table">
            <thead>
              <tr>
                <th scope="col">{ledger.columns.event}</th>
                <th scope="col">{ledger.columns.evidence}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.rows.map((row, index) => (
                <tr
                  key={row.event}
                  data-last={index === ledger.rows.length - 1}
                >
                  <th scope="row">{row.event}</th>
                  <td>{row.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </div>

      <p className="compliance-note">{note}</p>
    </Section>
  );
}
