import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { finalCTAContent, type FinalCTAFieldKey } from '@/content/final-cta';
import { sharedContent } from '@/content/shared';

const { labels, fields } = finalCTAContent;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

const required = () => z.string().trim().min(1, labels.required);

const schema = z.object({
  name: required(),
  organisation: required(),
  role: required(),
  city: required(),
  email: required().regex(EMAIL_PATTERN, labels.emailError),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE_PATTERN.test(value), {
      message: labels.phoneError,
    }),
  message: required().min(10, labels.tooShort),
  // Honeypot: real visitors never see or fill this field.
  website: z.string(),
});

type FormValues = z.infer<typeof schema>;

type Status = 'idle' | 'success' | 'error' | 'unconfigured';

/** Public form-service URL only; secrets never belong in VITE_* variables. */
function getEndpoint(): string {
  const raw: unknown = import.meta.env.VITE_CONTACT_ENDPOINT;
  if (typeof raw !== 'string') return '';
  const value = raw.trim();
  return /^https?:\/\//.test(value) ? value : '';
}

const ENDPOINT = getEndpoint();

const defaultValues: FormValues = {
  name: '',
  organisation: '',
  role: '',
  city: '',
  email: '',
  phone: '',
  message: '',
  website: '',
};

type FieldConfig = {
  key: FinalCTAFieldKey;
  type?: 'text' | 'email' | 'tel';
  inputMode?: 'text' | 'email' | 'tel';
  optional?: boolean;
  wide?: boolean;
  multiline?: boolean;
  maxLength: number;
};

const FIELD_ORDER: FieldConfig[] = [
  { key: 'name', maxLength: 120 },
  { key: 'organisation', maxLength: 160 },
  { key: 'role', maxLength: 120 },
  { key: 'city', maxLength: 120 },
  { key: 'email', type: 'email', inputMode: 'email', maxLength: 160 },
  {
    key: 'phone',
    type: 'tel',
    inputMode: 'tel',
    optional: true,
    maxLength: 20,
  },
  { key: 'message', wide: true, multiline: true, maxLength: 2000 },
];

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const successRef = useRef<HTMLHeadingElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  const onSubmit = async ({ website, ...values }: FormValues) => {
    if (website !== '') {
      // Likely automated; acknowledge without sending.
      setStatus('success');
      return;
    }
    if (!ENDPOINT) {
      setStatus('unconfigured');
      return;
    }
    setStatus('idle');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ...values, source: 'iwms-website#contact' }),
      });
      if (!response.ok) throw new Error(String(response.status));
      reset(defaultValues);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="final-cta-success" role="status">
        <h3 ref={successRef} tabIndex={-1} className="final-cta-success-title">
          {labels.successTitle}
        </h3>
        <p>{labels.successBody}</p>
        <Button variant="secondary" onClick={() => setStatus('idle')}>
          {labels.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="final-cta-form"
      aria-labelledby="final-cta-form-title"
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <h3 id="final-cta-form-title" className="final-cta-form-title">
        {labels.formTitle}
      </h3>
      <p className="final-cta-form-intro">{labels.formIntro}</p>

      {!ENDPOINT && (
        <div className="final-cta-notice">
          <p className="final-cta-notice-title">{labels.notConfiguredTitle}</p>
          <p>{labels.notConfiguredBody}</p>
        </div>
      )}

      <div className="final-cta-fields">
        {FIELD_ORDER.map((config) => {
          const field = fields[config.key];
          const id = `contact-${config.key}`;
          const error = errors[config.key]?.message;
          const hintId = 'hint' in field ? `${id}-hint` : undefined;
          const errorId = error ? `${id}-error` : undefined;
          const describedBy =
            [hintId, errorId].filter(Boolean).join(' ') || undefined;
          const shared = {
            id,
            autoComplete: field.autoComplete,
            maxLength: config.maxLength,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy,
            'aria-required': config.optional ? undefined : true,
            className: 'final-cta-input',
            ...register(config.key),
          } as const;

          return (
            <div
              key={config.key}
              className={`final-cta-field${config.wide ? ' final-cta-field-wide' : ''}`}
            >
              <label htmlFor={id} className="final-cta-label">
                {field.label}
                <span className="final-cta-mark">
                  {config.optional ? labels.optionalMark : labels.requiredMark}
                </span>
              </label>
              {config.multiline ? (
                <textarea rows={4} {...shared} />
              ) : (
                <input
                  type={config.type ?? 'text'}
                  inputMode={config.inputMode ?? 'text'}
                  {...shared}
                />
              )}
              {'hint' in field && (
                <p id={hintId} className="final-cta-hint">
                  {field.hint}
                </p>
              )}
              {error && (
                <p id={errorId} className="final-cta-error">
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <div className="final-cta-honeypot" aria-hidden="true">
          <label htmlFor="contact-website">{labels.honeypot}</label>
          <input
            id="contact-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>
      </div>

      <div className="final-cta-submit-row">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          aria-describedby="final-cta-privacy"
        >
          {isSubmitting ? labels.submitting : labels.submit}
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <p id="final-cta-privacy" className="final-cta-privacy">
          {sharedContent.privacyPending}{' '}
          <a href="/privacy">{sharedContent.privacy}</a>
        </p>
      </div>

      <div className="final-cta-status" role="status" aria-live="polite">
        {status === 'unconfigured' && (
          <p className="final-cta-status-note">
            <strong>{labels.notConfiguredTitle}</strong>{' '}
            {labels.notConfiguredBody}
          </p>
        )}
      </div>
      <div className="final-cta-status" role="alert">
        {status === 'error' && (
          <p className="final-cta-status-error">{labels.error}</p>
        )}
      </div>
    </form>
  );
}
