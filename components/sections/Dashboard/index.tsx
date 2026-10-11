import { useId, useState } from 'react';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { dashboardContent, type DashboardPanelKey } from '@/content/dashboard';
import { Console } from './Console';
import './dashboard.css';

const pad = (value: number) => String(value).padStart(2, '0');

export default function Dashboard() {
  const { items, model, labels } = dashboardContent;
  const [active, setActive] = useState<DashboardPanelKey | null>(null);
  const [preview, setPreview] = useState<DashboardPanelKey | null>(null);
  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const panelId = (key: DashboardPanelKey) => `${baseId}-panel-${key}`;
  const signalsRef = useReveal<HTMLOListElement>({
    selector: '.dashboard-signal',
  });
  const modelRef = useReveal<HTMLOListElement>({
    selector: '.dashboard-model-item',
  });

  return (
    <Section id={dashboardContent.id} variant="dark" className="dashboard">
      <header className="dashboard-head">
        <div className="dashboard-head-title">
          <Heading as="h2" eyebrow={dashboardContent.eyebrow}>
            {dashboardContent.title}
          </Heading>
        </div>
        <p className="dashboard-description">{dashboardContent.description}</p>
      </header>

      <div className="dashboard-stage">
        <div className="dashboard-signals">
          <p className="dashboard-signals-label">{labels.signalsHeading}</p>
          <span id={hintId} className="sr-only">
            {labels.highlight}
          </span>
          <ol className="dashboard-signal-list" ref={signalsRef}>
            {items.map((item, index) => {
              const pressed = active === item.key;
              return (
                <li
                  key={item.key}
                  className="dashboard-signal"
                  data-active={pressed ? 'true' : 'false'}
                >
                  <h3 className="dashboard-signal-heading">
                    <button
                      type="button"
                      className="dashboard-signal-trigger"
                      aria-pressed={pressed}
                      aria-controls={panelId(item.key)}
                      aria-describedby={hintId}
                      onClick={() => setActive(pressed ? null : item.key)}
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') setPreview(item.key);
                      }}
                      onPointerLeave={() => setPreview(null)}
                    >
                      <span className="dashboard-signal-num" aria-hidden="true">
                        {pad(index + 1)}
                      </span>
                      <span className="dashboard-signal-title">
                        {item.title}
                      </span>
                      <span
                        className="dashboard-signal-mark"
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div className="dashboard-signal-body">
                    <p>{item.body}</p>
                    <p className="dashboard-signal-feed">
                      <span>{labels.feeds}</span>{' '}
                      <a href={`/modules/${item.module}`}>{item.moduleTitle}</a>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="dashboard-console-wrap">
          <Console active={preview ?? active} panelId={panelId} />
        </div>
      </div>

      <div className="dashboard-model">
        <div className="dashboard-model-intro">
          <h3 className="dashboard-model-title">{model.title}</h3>
          <p>{model.body}</p>
        </div>
        <ol className="dashboard-model-list" ref={modelRef}>
          {model.items.map((item, index) => (
            <li key={item.title} className="dashboard-model-item">
              <span className="dashboard-model-num" aria-hidden="true">
                {pad(index + 1)}
              </span>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
