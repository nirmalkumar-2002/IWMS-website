import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { Button } from '@/components/ui/Button';
import { estimatorContent } from '@/content/estimator';
import type { EstimatorFieldContent, EstimatorSite } from '@/content/estimator';
import {
  emptyRaw,
  emptySites,
  fill,
  phaseResult,
  summaryFor,
  validateAll,
  validateField,
  type FieldErrors,
  type RawValues,
  type ScopeInput,
  type SiteValues,
} from './scope';
import './estimator.css';

const content = estimatorContent;
const fields: EstimatorFieldContent[] = content.fields;

export default function Estimator() {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [raw, setRaw] = useState<RawValues>(emptyRaw);
  const [sites, setSites] = useState<SiteValues>(emptySites);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [input, setInput] = useState<ScopeInput | null>(null);
  const [revision, setRevision] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const { labels } = content;
  const idFor = (name: string) => `${uid}-${name}`;

  const onChange =
    (field: EstimatorFieldContent) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setRaw((current) => ({ ...current, [field.name]: value }));
      // Clear or refresh an error once the visitor starts correcting it.
      if (errors[field.name]) {
        setErrors((current) => ({
          ...current,
          [field.name]: validateField(field, value),
        }));
      }
    };

  const onBlur = (field: EstimatorFieldContent) => () => {
    const value = raw[field.name];
    if (value.trim() === '' && !errors[field.name]) return;
    setErrors((current) => ({
      ...current,
      [field.name]: validateField(field, value),
    }));
  };

  const onSite =
    (name: EstimatorSite) => (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setSites((current) => ({ ...current, [name]: checked }));
    };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateAll(fields, raw, sites, content.crossErrors);
    setErrors(result.errors);
    if (!result.input) {
      const invalid = fields.filter((field) => result.errors[field.name]);
      setAnnouncement(
        invalid.length === 1
          ? labels.announceError
          : fill(labels.announceErrors, { count: invalid.length }),
      );
      const first = invalid[0];
      if (first) {
        formRef.current
          ?.querySelector<HTMLInputElement>(`[name="${first.name}"]`)
          ?.focus();
      }
      return;
    }
    const summary = summaryFor(result.input);
    setInput(result.input);
    setRevision((current) => current + 1);
    setAnnouncement(
      fill(labels.announceUpdated, {
        households: summary.households,
        wards: summary.wards,
      }),
    );
  };

  const onReset = () => {
    setRaw(emptyRaw);
    setSites(emptySites);
    setErrors({});
    setInput(null);
    setAnnouncement('');
  };

  const summary = input ? summaryFor(input) : null;

  return (
    <Section
      id={content.id}
      variant="dark"
      className="estimator"
      aria-labelledby={idFor('title')}
    >
      <header className="estimator-header">
        <div>
          <Heading as="h2" id={idFor('title')} eyebrow={content.eyebrow}>
            {content.title}
          </Heading>
        </div>
        <p className="estimator-lead">{content.description}</p>
      </header>

      <div className="estimator-layout">
        <form
          ref={formRef}
          className="estimator-form"
          onSubmit={onSubmit}
          noValidate
          aria-labelledby={idFor('form-heading')}
        >
          <h3 className="estimator-panel-heading" id={idFor('form-heading')}>
            {labels.formHeading}
          </h3>
          <div className="estimator-fields">
            {fields.map((field) => {
              const id = idFor(field.name);
              const error = errors[field.name];
              const describedBy = [`${id}-hint`, error ? `${id}-error` : '']
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  className="estimator-field"
                  data-invalid={error ? 'true' : undefined}
                  key={field.name}
                >
                  <label className="estimator-label" htmlFor={id}>
                    {field.label}
                    {!field.required && (
                      <span className="estimator-optional">
                        {labels.optional}
                      </span>
                    )}
                  </label>
                  <div className="estimator-input-wrap">
                    <input
                      id={id}
                      name={field.name}
                      className="estimator-input"
                      type="text"
                      inputMode={field.inputMode}
                      autoComplete="off"
                      required={field.required}
                      aria-required={field.required}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={describedBy}
                      value={raw[field.name]}
                      onChange={onChange(field)}
                      onBlur={onBlur(field)}
                    />
                    {field.unit && (
                      <span className="estimator-unit" aria-hidden="true">
                        {field.unit}
                      </span>
                    )}
                  </div>
                  <p className="estimator-hint" id={`${id}-hint`}>
                    {field.hint}
                  </p>
                  {error && (
                    <p className="estimator-error" id={`${id}-error`}>
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <fieldset
            className="estimator-sites"
            aria-describedby={idFor('sites-hint')}
          >
            <legend className="estimator-label">{content.sites.legend}</legend>
            <p className="estimator-hint" id={idFor('sites-hint')}>
              {content.sites.hint}
            </p>
            {content.sites.options.map((option) => (
              <label className="estimator-check" key={option.name}>
                <input
                  type="checkbox"
                  name={option.name}
                  checked={sites[option.name]}
                  onChange={onSite(option.name)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="estimator-actions">
            <Button type="submit" variant="primary">
              {input ? labels.update : labels.submit}
            </Button>
            <button type="button" className="estimator-reset" onClick={onReset}>
              {labels.reset}
            </button>
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        </form>

        <div
          className="estimator-results"
          aria-labelledby={idFor('results-heading')}
          role="region"
        >
          <div className="estimator-results-head">
            <h3
              className="estimator-panel-heading"
              id={idFor('results-heading')}
            >
              {labels.resultsHeading}
            </h3>
            <p className="estimator-tag">{labels.illustrative}</p>
          </div>
          {!input && <p className="estimator-empty">{labels.emptyState}</p>}

          <dl className="estimator-summary">
            {content.summary.rows.map((row) => (
              <div className="estimator-summary-item" key={row.key}>
                <dt>{row.label}</dt>
                <dd>{summary ? summary[row.key] : content.summary.empty}</dd>
              </div>
            ))}
          </dl>
          <p className="estimator-fine">{content.summary.note}</p>

          <ol
            className="estimator-phases"
            aria-label={labels.phasesLabel}
            key={revision}
            data-scoped={input ? 'true' : 'false'}
          >
            {content.phases.map((phase) => {
              const result = input ? phaseResult(phase, input) : null;
              return (
                <li
                  className="estimator-phase"
                  data-status={result?.status ?? 'idle'}
                  key={phase.key}
                >
                  <p className="estimator-phase-meta">
                    <span>{phase.phase}</span>
                    <span>{phase.window}</span>
                  </p>
                  <div className="estimator-phase-main">
                    <h4 className="estimator-phase-title">{phase.title}</h4>
                    <p className="estimator-phase-text">
                      {result ? result.text : phase.body}
                    </p>
                  </div>
                  {result && (
                    <p className="estimator-phase-status">
                      {result.status === 'scoped'
                        ? labels.statusScoped
                        : labels.statusConfirm}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="estimator-outcome">{labels.outcome}</p>

          <div className="estimator-pending">
            <h4 className="estimator-pending-heading">
              {content.pending.heading}
            </h4>
            <p className="estimator-pending-status">{content.pending.status}</p>
            <dl className="estimator-pending-rows">
              {content.pending.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="estimator-fine">{content.pending.note}</p>
          </div>

          <div className="estimator-cta">
            <Button href={labels.ctaHref} variant="primary">
              {labels.cta}
            </Button>
            <p className="estimator-fine">{labels.disclaimer}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
