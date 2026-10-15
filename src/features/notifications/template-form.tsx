'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField, SelectField, TextArea, TextField } from '@/components/ui/field';
import { QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError, describeApiError, toApiError, type FieldErrors } from '@/services/api/api-error';
import {
  createTemplate,
  fetchNotificationEvents,
  fetchNotificationVariables,
  fetchTargetOptions,
  previewTemplate,
  updateTemplate,
  type NotificationEvent,
  type NotificationTemplate,
  type NotificationVariable,
  type TargetOption,
  type TemplateInput,
  type TemplatePreview,
} from '@/services/api/notifications-api';

type Meta = { events: NotificationEvent[]; variables: NotificationVariable[]; targets: TargetOption[] };

/** Loads the registries the form needs, then renders it. */
export function TemplateFormLoader({ template }: { template?: NotificationTemplate }) {
  const query = useApiQuery('notification-template-meta', async (): Promise<Meta> => {
    const [events, variables, targets] = await Promise.all([
      fetchNotificationEvents(),
      fetchNotificationVariables(),
      fetchTargetOptions(),
    ]);
    return { events, variables, targets };
  });
  return <QueryView query={query}>{(meta) => <TemplateForm meta={meta} template={template} />}</QueryView>;
}

const KEY_PATTERN = /^[a-z][a-z0-9_]{2,59}$/;

function metadataToText(metadata: Record<string, string> | null): string {
  return metadata ? Object.entries(metadata).map(([key, value]) => `${key}=${value}`).join('\n') : '';
}

function parseMetadata(text: string): Record<string, string> | null | 'invalid' {
  const entries: Record<string, string> = {};
  for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
    const index = line.indexOf('=');
    if (index < 1) return 'invalid';
    entries[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return Object.keys(entries).length === 0 ? null : entries;
}

function TemplateForm({ meta, template }: { meta: Meta; template?: NotificationTemplate }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = template !== undefined;

  const [form, setForm] = useState({
    key: template?.key ?? '',
    name: template?.name ?? '',
    eventKey: template?.eventKey ?? meta.events[0]?.key ?? '',
    title: template?.title ?? '',
    body: template?.body ?? '',
    imageUrl: template?.imageUrl ?? '',
    targetScreen: template?.targetScreen ?? '',
    metadata: metadataToText(template?.metadata ?? null),
    isEnabled: template?.isEnabled ?? false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [focused, setFocused] = useState<'title' | 'body'>('body');
  const [keyEdited, setKeyEdited] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const event = meta.events.find((candidate) => candidate.key === form.eventKey);
  const allowed = new Set(event?.variables ?? []);
  const variables = meta.variables.filter((variable) => allowed.has(variable.key));
  const groups = [...new Set(variables.map((variable) => variable.group))];

  // Live preview: rendered by the server with sample data, exactly as customers will see it.
  useEffect(() => {
    if (!form.eventKey) return undefined;
    let stale = false;
    const timer = setTimeout(() => {
      previewTemplate({
        eventKey: form.eventKey,
        title: form.title,
        body: form.body,
        targetScreen: form.targetScreen || null,
      }).then(
        (result) => { if (!stale) setPreview(result); },
        () => { if (!stale) setPreview(null); }
      );
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [form.eventKey, form.title, form.body, form.targetScreen]);

  function insertVariable(key: string) {
    const token = `{${key}}`;
    const element = formRef.current?.elements.namedItem(focused) as HTMLInputElement | HTMLTextAreaElement | null;
    const current = form[focused];
    const start = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    setForm((old) => ({ ...old, [focused]: next }));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    setFormError('');
    const nextErrors: FieldErrors = {};
    if (!isEdit && !KEY_PATTERN.test(form.key)) nextErrors['key'] = 'Use 3–60 lowercase letters, digits or underscores, starting with a letter.';
    if (form.name.trim().length < 3) nextErrors['name'] = 'Enter at least 3 characters.';
    if (!form.title.trim()) nextErrors['title'] = 'Enter a title.';
    if (!form.body.trim()) nextErrors['body'] = 'Enter a message.';
    if (form.imageUrl.trim() && !/^https:\/\/\S+$/i.test(form.imageUrl.trim())) nextErrors['imageUrl'] = 'Use a full https:// address.';
    const metadata = parseMetadata(form.metadata);
    if (metadata === 'invalid') nextErrors['metadata'] = 'Use one key=value per line.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || metadata === 'invalid') return;

    const payload: TemplateInput = {
      key: form.key,
      name: form.name.trim(),
      eventKey: form.eventKey,
      title: form.title.trim(),
      body: form.body.trim(),
      imageUrl: form.imageUrl.trim() || null,
      targetScreen: form.targetScreen || null,
      metadata,
      isEnabled: form.isEnabled,
    };

    setBusy(true);
    try {
      if (isEdit) {
        const { eventKey, name, title, body, imageUrl, targetScreen, metadata: meta2, isEnabled } = payload;
        await updateTemplate(template.id, { eventKey, name, title, body, imageUrl, targetScreen, metadata: meta2, isEnabled });
      } else {
        await createTemplate(payload);
      }
      toast.success(isEdit ? 'Template saved.' : 'Template created.');
      router.push('/notifications/templates');
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError instanceof ApiError && Object.keys(apiError.fieldErrors).length > 0) setErrors(apiError.fieldErrors);
      setFormError(describeApiError(apiError));
    } finally {
      setBusy(false);
    }
  }

  const titleLength = Array.from(form.title).length;
  const bodyLength = Array.from(form.body).length;
  const titleLimit = preview?.limits.title ?? 65;
  const bodyLimit = preview?.limits.body ?? 240;
  const activeOther = event?.templates.find((candidate) => candidate.isEnabled && candidate.id !== template?.id);
  const eventGroups = [...new Set(meta.events.map((candidate) => candidate.group))];
  const counter = (length: number, limit: number) => (
    <span className={length > limit ? 'text-danger' : 'text-muted'}>{length} / {limit} visible characters</span>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-5 pb-4">
        <Card title="1 · What triggers it">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Internal name"
              required
              value={form.name}
              maxLength={100}
              error={errors['name']}
              placeholder="Order delivered"
              hint="Only staff see this."
              onChange={(e) => {
                const name = e.target.value;
                setForm((old) => ({
                  ...old,
                  name,
                  key: isEdit || keyEdited ? old.key : slugify(name),
                }));
              }}
            />
            <TextField
              label="Unique identifier"
              required
              disabled={isEdit}
              value={form.key}
              maxLength={60}
              placeholder="order_delivered"
              hint={isEdit ? 'Cannot be changed after creation.' : 'Filled in from the name; lowercase letters, digits, underscores.'}
              error={errors['key']}
              onChange={(e) => {
                setKeyEdited(true);
                setForm({ ...form, key: e.target.value });
              }}
            />
          </div>
          <div className="mt-4">
            <SelectField
              label="Business event"
              value={form.eventKey}
              onChange={(e) => setForm({ ...form, eventKey: e.target.value })}
              hint={event?.description}>
              {eventGroups.map((group) => (
                <optgroup key={group} label={group}>
                  {meta.events.filter((candidate) => candidate.group === group).map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>{candidate.name}</option>
                  ))}
                </optgroup>
              ))}
            </SelectField>
          </div>
        </Card>

        <Card title="2 · What the customer reads">
          <div className="space-y-4">
            <div className="space-y-1">
              <TextField
                name="title"
                label="Title"
                required
                value={form.title}
                maxLength={200}
                placeholder="Order Delivered!"
                error={errors['title']}
                onFocus={() => setFocused('title')}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <p className="text-xs">{counter(titleLength, titleLimit)}</p>
            </div>
            <div className="space-y-1">
              <TextArea
                name="body"
                label="Message"
                required
                rows={4}
                value={form.body}
                maxLength={600}
                placeholder="Dear {username}, your order {order_number} has been delivered."
                error={errors['body']}
                onFocus={() => setFocused('body')}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <p className="text-xs">{counter(bodyLength, bodyLimit)}</p>
            </div>
            <div className="rounded-lg border border-line bg-bg p-3">
              <p className="mb-2 text-xs font-medium text-muted">
                Insert a variable into the {focused === 'title' ? 'title' : 'message'} (click)
              </p>
              <VariablePicker variables={variables} groups={groups} onPick={insertVariable} />
            </div>
          </div>
        </Card>

        <Card title="3 · Where it leads">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Opens screen"
              value={form.targetScreen}
              onChange={(e) => setForm({ ...form, targetScreen: e.target.value })}
              hint="Only app screens from this list can be opened.">
              <option value="">
                Event default{event ? ` (${meta.targets.find((t) => t.key === event.defaultTarget)?.label ?? event.defaultTarget})` : ''}
              </option>
              {meta.targets.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}
            </SelectField>
            <TextField
              label="Image URL (optional)"
              value={form.imageUrl}
              error={errors['imageUrl']}
              placeholder="https://…"
              hint="Shown in the expanded push; must be https."
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>
          <details className="mt-4 rounded-lg border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Advanced: metadata</summary>
            <div className="mt-3">
              <TextArea
                label="Metadata (optional)"
                rows={2}
                value={form.metadata}
                error={errors['metadata']}
                hint="One key=value per line, up to 10. For your own reference; not shown to customers."
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
              />
            </div>
          </details>
        </Card>

        <Card title="4 · Turn it on">
          <CheckboxField
            label="Enabled: send this notification when the event happens"
            hint={
              activeOther
                ? `“${activeOther.name}” is currently enabled for this event and will be switched off.`
                : 'Only one template per event can be enabled.'
            }
            checked={form.isEnabled}
            onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
          />
        </Card>

        {formError ? <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">{formError}</p> : null}

        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2 border-t border-line bg-bg/95 px-1 py-3 backdrop-blur">
          <Button type="button" disabled={busy} onClick={() => router.push('/notifications/templates')}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>{isEdit ? 'Save changes' : 'Create template'}</Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4">
        <Card title="Live preview">
          <div className="space-y-4">
            {preview && preview.problems.length > 0 ? (
              <ul role="alert" className="list-disc space-y-1 rounded-lg bg-danger-soft p-3 pl-7 text-sm text-danger">
                {preview.problems.map((problem, index) => <li key={index}>{problem.message}</li>)}
              </ul>
            ) : null}
            <PreviewBubble
              heading="On the lock screen"
              title={preview?.rendered.pushTitle}
              body={preview?.rendered.pushBody}
              storeName="DoorKart"
            />
            <PreviewBubble
              heading="In the app inbox"
              title={preview?.rendered.title}
              body={preview?.rendered.body}
            />
            <p className="text-xs text-muted">
              Sample customer and order. Email, mobile and address appear in the inbox but are replaced by generic words in the push.
            </p>
          </div>
        </Card>
      </aside>
    </form>
  );
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return /^[a-z]/.test(slug) ? slug : slug ? `t_${slug}`.slice(0, 60) : '';
}

function PreviewBubble({
  heading, title, body, storeName,
}: {
  heading: string;
  title: string | undefined;
  body: string | undefined;
  storeName?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{heading}</p>
      <div className="rounded-2xl border border-line bg-bg p-3 shadow-sm">
        {storeName ? <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">{storeName} · now</p> : null}
        <p className={title ? 'text-sm font-semibold text-fg' : 'text-sm font-semibold text-muted/60'}>
          {title || 'Your title appears here'}
        </p>
        <p className={body ? 'mt-0.5 break-words text-sm text-fg' : 'mt-0.5 text-sm text-muted/60'}>
          {body || 'Your message appears here'}
        </p>
      </div>
    </div>
  );
}

function VariablePicker({
  variables, groups, onPick,
}: {
  variables: NotificationVariable[];
  groups: string[];
  onPick: (key: string) => void;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  return (
    <div className="space-y-3">
      <input
        type="search"
        aria-label="Filter variables"
        placeholder="Filter variables…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm"
      />
      {groups.map((group) => {
        const items = variables.filter(
          (variable) => variable.group === group && (!needle || variable.key.includes(needle) || variable.label.toLowerCase().includes(needle))
        );
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  title={`{${variable.key}} — ${variable.description} Example: ${variable.sample}`}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                  onClick={() => onPick(variable.key)}>
                  {variable.label}
                  {variable.sensitive ? <span aria-label="sensitive"> 🔒</span> : null}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted">Hover a chip to see its placeholder and an example. 🔒 = inbox only; push shows generic words.</p>
    </div>
  );
}
