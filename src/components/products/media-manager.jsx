'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { uploadMedia } from '@/services/api/admin-api';
import { ApiError, describeApiError } from '@/services/api/api-error';
import { resolveMediaUrl } from '@/services/api/config';
import { cn } from '@/utils/cn';

export const MAX_MEDIA = 10;
export const MAX_VIDEOS = 3;
/** Below this a picture looks soft on a phone held close, and on a desktop zoom. */
export const RECOMMENDED_IMAGE_PX = 1200;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';

const VIDEO_ADDRESS = /\.(mp4|mov|webm)(\?.*)?$/i;

/** Rough guesses for an address typed in by hand. Uploaded files get their real type from the server. */
const guessTypeFromAddress = (url) => (VIDEO_ADDRESS.test(url) ? 'VIDEO' : 'IMAGE');

/** The count and limit rules, shared with the form's own validation. */
export function describeMediaProblem(items) {
  if (items.length > MAX_MEDIA) return `Add at most ${MAX_MEDIA} pictures and videos.`;
  if (items.filter((item) => item.mediaType === 'VIDEO').length > MAX_VIDEOS) {
    return `Add at most ${MAX_VIDEOS} videos.`;
  }
  return null;
}

/** A quick check before sending, so an obviously wrong file fails at once. The server checks again. */
function checkFile(file) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) return 'Only pictures and videos can be uploaded.';
  if (isImage && file.size > MAX_IMAGE_BYTES) return 'Pictures can be up to 5 MB.';
  if (isVideo && file.size > MAX_VIDEO_BYTES) return 'Videos can be up to 50 MB.';
  return null;
}

/** True when a picture's sides are equal, give or take 2%. */
export const isSquare = (size) => Boolean(size && Math.abs(size.width - size.height) <= Math.max(size.width, size.height) * 0.02);
export const isSharp = (size) => Boolean(size && size.width >= RECOMMENDED_IMAGE_PX && size.height >= RECOMMENDED_IMAGE_PX);

/** 1234567 -> "1.2 MB", 980000 -> "957 KB". */
export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const IMAGE_SLOTS = ['Store cover', 'Angle view', 'In-use / scale', 'Unboxing & pack'];

/** "#1 Store cover", "#2 Angle view" and so on; videos are store reels. The first picture is always the cover. */
export function slotLabel(value, index) {
  const item = value[index];
  if (item.mediaType === 'VIDEO') return 'Store reel';
  const pictureNumber = value.slice(0, index + 1).filter((entry) => entry.mediaType === 'IMAGE').length - 1;
  return IMAGE_SLOTS[pictureNumber] ?? 'Extra angle';
}

/** The last part of an address, without its query: what the admin recognises a file by. */
export const fileName = (url) => decodeURIComponent(url.split('?')[0].split('/').pop() || url);

/**
 * Everything that changes the product's media list: uploads (one after another), web
 * addresses, re-ordering, removal and alt text. One instance serves every place on the form
 * that adds media, so they all share the same uploads in progress.
 *
 * `update` receives a function from the current list to the next one, so an upload that
 * finishes late is added to whatever the list has become by then, never to an old copy.
 */
export function useMediaLibrary({ value, update, onUploadingChange }) {
  const [fileInput, setFileInput] = useState(null);
  const [notes, setNotes] = useState([]);

  const uploadFiles = async (files) => {
    const added = [];
    for (const file of files) {
      const id = crypto.randomUUID();
      const problem = checkFile(file) ?? describeMediaProblem([...value, ...added, { url: '', mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE', altText: null }]);
      if (problem) {
        setNotes((current) => [...current, { id, name: file.name, state: 'failed', message: problem }]);
        continue;
      }
      setNotes((current) => [...current, { id, name: file.name, state: 'uploading' }]);
      try {
        const uploaded = await uploadMedia(file);
        const item = { url: uploaded.url, mediaType: uploaded.mediaType, altText: null };
        added.push(item);
        update((current) => [...current, item]);
        setNotes((current) => current.filter((note) => note.id !== id));
      } catch (caught) {
        const message = caught instanceof ApiError ? describeApiError(caught) : 'The upload failed.';
        setNotes((current) => current.map((note) => (note.id === id ? { ...note, state: 'failed', message } : note)));
      }
    }
  };

  const isUploading = notes.some((note) => note.state === 'uploading');
  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const moveTo = (from, to) =>
    update((current) => {
      if (from === to || to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  return {
    value,
    notes,
    isUploading,
    isFull: value.length >= MAX_MEDIA,
    /** A callback ref for the one hidden file box (see MediaFileInput). */
    attachFileInput: setFileInput,
    openPicker: () => fileInput?.click(),
    /** Uploads chosen or dropped files, one after another. */
    addFiles: (files) => {
      const chosen = Array.from(files ?? []);
      if (chosen.length > 0) void uploadFiles(chosen);
    },
    dismissNote: (id) => setNotes((current) => current.filter((note) => note.id !== id)),
    /** Adds a typed-in address; returns why it was refused, or null. */
    addAddress: (address) => {
      const url = address.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) return 'Enter a full web address starting with http:// or https://.';
      const next = [...value, { url, mediaType: guessTypeFromAddress(url), altText: null }];
      const problem = describeMediaProblem(next);
      if (problem) return problem;
      update(() => next);
      return null;
    },
    moveTo,
    remove: (index) => update((current) => current.filter((_, position) => position !== index)),
    setAltText: (index, altText) =>
      update((current) => current.map((item, position) => (position === index ? { ...item, altText: altText === '' ? null : altText } : item))),
    /** Sharpest pictures first, videos after them; unmeasured pictures keep their place among the rest. */
    sortByResolution: (facts) => {
      const pixels = (item) => (facts[item.url]?.width ?? 0) * (facts[item.url]?.height ?? 0);
      const pictures = value.filter((item) => item.mediaType === 'IMAGE').sort((a, b) => pixels(b) - pixels(a));
      update(() => [...pictures, ...value.filter((item) => item.mediaType === 'VIDEO')]);
    },
    /** Fills only the empty alt texts, from the product name and each slot. */
    fillAltText: (productName) => {
      const name = productName.trim();
      if (!name) return;
      update(() => value.map((item, index) => (item.altText ? item : { ...item, altText: `${name} – ${slotLabel(value, index).toLowerCase()}`.slice(0, 200) })));
    },
  };
}

/**
 * The pixel size of every picture and, where the server says, the file size and format.
 * Measured in the background once per address; anything that cannot be read stays unknown.
 */
export function useMediaFacts(value) {
  const [facts, setFacts] = useState({});
  const started = useRef(new Set());

  useEffect(() => {
    for (const item of value) {
      if (started.current.has(item.url)) continue;
      started.current.add(item.url);
      const src = resolveMediaUrl(item.url);
      const record = (patch) => setFacts((current) => ({ ...current, [item.url]: { ...current[item.url], ...patch } }));
      if (item.mediaType === 'IMAGE') {
        const image = new window.Image();
        image.onload = () => record({ width: image.naturalWidth, height: image.naturalHeight });
        image.src = src;
      }
      // Another site may refuse to say: then size and format are simply not shown.
      fetch(src, { method: 'HEAD' })
        .then((response) => {
          if (!response.ok) return;
          const bytes = Number(response.headers.get('content-length'));
          const format = response.headers.get('content-type')?.split('/')[1]?.split(';')[0];
          record({ ...(bytes > 0 ? { bytes } : {}), ...(format ? { format: format.replace('quicktime', 'mov').toUpperCase() } : {}) });
        })
        .catch(() => {});
    }
  }, [value]);

  return facts;
}

/** The one hidden file box behind every "upload" control on the form. */
export function MediaFileInput({ library, disabled }) {
  // Taken apart first: the callback ref must not make the rest of the library look like a ref.
  const { attachFileInput, isFull, addFiles } = library;
  return (
    <input
      ref={attachFileInput}
      type="file"
      multiple
      accept={ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      disabled={disabled || isFull}
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        // Cleared so choosing the same file again still counts as a change.
        event.target.value = '';
        addFiles(files);
      }}
    />
  );
}

/** Uploads in progress and the ones that failed. */
export function MediaUploadNotes({ library }) {
  if (library.notes.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm" aria-live="polite">
      {library.notes.map((note) => (
        <li key={note.id} className={cn('flex items-center gap-2', note.state === 'failed' && 'text-danger')}>
          {note.state === 'uploading' ? <Spinner /> : null}
          <span className="truncate">{note.state === 'uploading' ? `Uploading ${note.name}…` : `${note.name}: ${note.message}`}</span>
          {note.state === 'failed' ? (
            <button type="button" className="ml-auto shrink-0 text-xs text-muted underline" onClick={() => library.dismissNote(note.id)}>Dismiss</button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** A box files can be dropped on. `compact` is the smaller one on the first step. */
export function MediaDropzone({ library, disabled, compact = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const blocked = disabled || library.isFull;
  return (
    <div
      onDragOver={(event) => {
        // A card being re-ordered is not a file.
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setIsDragging(false);
        if (!blocked) library.addFiles(event.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors',
        compact ? 'px-4 py-7' : 'px-4 py-9',
        isDragging ? 'border-primary bg-primary-soft/60' : 'border-primary/30 bg-primary-soft/10'
      )}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name={compact ? 'image' : 'upload'} /></span>
      {compact ? (
        <>
          <Button variant="primary" size="sm" onClick={library.openPicker} disabled={blocked} loading={library.isUploading}>
            {library.isUploading ? 'Uploading…' : 'Upload pictures or videos'}
          </Button>
          <p className="text-xs text-muted">Or drag &amp; drop files here. Formats: JPG, PNG, WebP up to 5 MB. Videos: MP4 up to 50 MB.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-fg">
            Drag &amp; drop product media here, or{' '}
            <button type="button" onClick={library.openPicker} disabled={blocked} className="text-primary underline disabled:opacity-50">browse computer</button>
          </p>
          <p className="text-xs text-muted">Supports high-resolution JPG, PNG, WebP (up to 5 MB) and MP4, MOV or WebM videos (up to 50 MB, at most {MAX_VIDEOS}).</p>
          <ul className="mt-1 flex flex-wrap justify-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
            <li className="rounded-md border border-line bg-surface px-2 py-1">1:1 square (recommended)</li>
            <li className="rounded-md border border-line bg-surface px-2 py-1">Min {RECOMMENDED_IMAGE_PX} × {RECOMMENDED_IMAGE_PX} px</li>
            <li className="rounded-md border border-line bg-surface px-2 py-1">White / neutral background</li>
          </ul>
        </>
      )}
    </div>
  );
}

/** A web address box with its button, for pictures hosted elsewhere. */
export function MediaAddressField({ library, disabled, label = 'Or import from public image URL', buttonLabel = 'Fetch' }) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);
  const add = () => {
    const problem = library.addAddress(address);
    setError(problem);
    if (!problem) setAddress('');
  };
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        <div className="mt-1.5 flex gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://cdn.example.com/assets/product-angle.jpg"
            value={address}
            disabled={disabled}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
            className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-normal"
          />
          <Button onClick={add} disabled={disabled || address.trim() === ''}>{buttonLabel}</Button>
        </div>
      </label>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/** The first step's row of slots: the cover, then prompts for the angles customers look for. */
export function QuickMediaSlots({ library, facts, disabled }) {
  const { value } = library;
  const prompts = [
    { icon: 'plus', label: 'Add side view' },
    { icon: 'plus', label: 'Add box contents' },
    { icon: 'video', label: 'Add MP4 reel' },
  ];
  const shown = value.slice(0, 4);
  const empty = prompts.slice(Math.max(0, shown.length - 1)).slice(0, 4 - shown.length);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {shown.map((item, index) => (
        <li key={`${item.url}-${index}`} className={cn('relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-bg', index === 0 ? 'border-primary' : 'border-line')}>
          {item.mediaType === 'VIDEO' ? (
            <video src={resolveMediaUrl(item.url)} muted preload="metadata" className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(item.url)} alt={item.altText ?? ''} className="h-full w-full object-cover" />
          )}
          <span className={cn('absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', index === 0 ? 'bg-primary text-on-primary' : 'bg-surface/90 text-muted')}>
            {index === 0 ? 'Cover' : slotLabel(value, index)}
          </span>
          {facts[item.url]?.width ? <span className="absolute bottom-1.5 left-1.5 rounded bg-fg/70 px-1 font-mono text-[10px] text-white">{facts[item.url].width}×{facts[item.url].height}</span> : null}
          <button type="button" aria-label={`Remove item ${index + 1}`} disabled={disabled} onClick={() => library.remove(index)} className="absolute right-1.5 top-1.5 rounded-md bg-surface/90 p-1 text-danger hover:bg-surface">
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
      {shown.length === 0 ? (
        <li>
          <button type="button" onClick={library.openPicker} disabled={disabled} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary bg-warning-soft/70 text-xs font-bold uppercase tracking-wide text-warning">
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-on-primary">Cover</span>
            Primary image
          </button>
        </li>
      ) : null}
      {empty.map((prompt) => (
        <li key={prompt.label}>
          <button type="button" onClick={library.openPicker} disabled={disabled || library.isFull} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-xs text-muted transition-colors hover:border-primary/40 hover:bg-bg disabled:opacity-50">
            <Icon name={prompt.icon} className="h-5 w-5" />
            {prompt.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Small square icon buttons on a gallery card. */
function CardAction({ label, icon, onClick, disabled, danger = false, children }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cn('inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-xs text-muted hover:bg-bg hover:text-fg disabled:opacity-40', danger && 'text-danger hover:text-danger')}>
      {icon ? <Icon name={icon} className="h-4 w-4" /> : children}
    </button>
  );
}

/**
 * The ordered gallery customers swipe through. Cards can be dragged by their grip, or moved
 * with their arrow buttons, to change the order.
 */
export function MediaGallery({ library, facts, disabled, productName }) {
  const { value } = library;
  const [dragIndex, setDragIndex] = useState(null);
  const coverIndex = value.findIndex((item) => item.mediaType === 'IMAGE');

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-fg">
          Customer gallery order <span className="ml-1 text-xs font-normal text-muted">(Drag grip handles to re-sequence storefront order)</span>
        </p>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" disabled={disabled || value.length < 2} onClick={() => library.sortByResolution(facts)}>
            <Icon name="chart" className="h-4 w-4" /> Auto-sort high res
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled || value.length === 0 || !productName.trim()} onClick={() => library.fillAltText(productName)}>
            <Icon name="check" className="h-4 w-4 text-primary" /> <span className="text-primary">Apply SEO tags</span>
          </Button>
        </div>
      </header>
      <p className="mt-4 flex gap-2 rounded-xl border border-warning/20 bg-warning-soft/60 px-4 py-3 text-xs leading-relaxed text-fg">
        <Icon name="bulb" className="h-4 w-4 text-warning" />
        <span><strong>Storefront tip:</strong> the item in Slot #1 is always the customer storefront hero and listing cover. Use clean, high-contrast imagery with no text overlay.</span>
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {value.map((item, index) => {
          const fact = facts[item.url] ?? {};
          const isCover = index === coverIndex;
          const square = isSquare(fact);
          const sharp = isSharp(fact);
          return (
            <li
              key={`${item.url}-${index}`}
              onDragOver={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                library.moveTo(dragIndex, index);
                setDragIndex(null);
              }}
              className={cn('flex flex-col overflow-hidden rounded-xl border-2 bg-surface', isCover ? 'border-primary' : 'border-line', dragIndex === index && 'opacity-50')}>
              <div className="flex items-center justify-between px-3 py-2">
                <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', isCover ? 'bg-primary text-on-primary' : item.mediaType === 'VIDEO' ? 'bg-violet-600 text-white' : 'bg-bg text-muted')}>
                  {isCover ? <Icon name="star" className="h-3 w-3" /> : item.mediaType === 'VIDEO' ? <Icon name="video" className="h-3 w-3" /> : null}
                  #{index + 1} {slotLabel(value, index)}
                </span>
                <span
                  draggable={!disabled}
                  onDragStart={(event) => {
                    setDragIndex(index);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  title="Drag to re-order"
                  className="cursor-grab rounded p-1 text-muted hover:bg-bg active:cursor-grabbing">
                  <Icon name="grip" className="h-4 w-4" />
                </span>
              </div>
              <div className="relative mx-3 aspect-[4/3] overflow-hidden rounded-lg bg-bg">
                {item.mediaType === 'VIDEO' ? (
                  <video src={resolveMediaUrl(item.url)} controls preload="metadata" muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.url)} alt={item.altText ?? ''} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                )}
                {fact.width ? <span className="absolute bottom-2 left-2 rounded bg-fg/75 px-1.5 py-0.5 font-mono text-[10px] text-white">{fact.width} × {fact.height} px</span> : null}
                {isCover && square ? <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white"><Icon name="check" className="h-3 w-3" /> Verified 1:1</span> : null}
                {item.mediaType === 'VIDEO' && index === value.findIndex((entry) => entry.mediaType === 'VIDEO') ? <span className="absolute right-2 top-2 rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">Store reel</span> : null}
              </div>
              <div className="space-y-1.5 px-3 pb-2 pt-3">
                <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted">
                  {fact.bytes ? <span>{formatBytes(fact.bytes)}</span> : null}
                  {fact.format ? <span>• {fact.format}</span> : null}
                  {item.mediaType === 'IMAGE' && fact.width ? (
                    sharp ? <span className="font-medium text-success">✓ Sharp</span> : <span className="font-medium text-warning">Below {RECOMMENDED_IMAGE_PX} px</span>
                  ) : null}
                  {item.mediaType === 'VIDEO' ? <span className="font-medium text-violet-600">Video</span> : null}
                </p>
                <p className="truncate text-xs font-semibold text-fg" title={fileName(item.url)}>{fileName(item.url)}</p>
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Icon name="edit" className="h-3.5 w-3.5 shrink-0" />
                  <span className="sr-only">Alt text for item {index + 1}</span>
                  <input
                    type="text"
                    value={item.altText ?? ''}
                    maxLength={200}
                    disabled={disabled}
                    onChange={(event) => library.setAltText(index, event.target.value)}
                    placeholder='Alt: "Blue notebook, front view"'
                    className="min-h-7 w-full rounded border border-transparent bg-transparent px-1 text-[11px] text-fg hover:border-line focus:border-line focus:bg-surface"
                  />
                </label>
              </div>
              <div className="mt-auto flex items-center gap-0.5 border-t border-line px-2 py-1.5">
                <CardAction label={`Move item ${index + 1} earlier`} disabled={disabled || index === 0} onClick={() => library.moveTo(index, index - 1)}>←</CardAction>
                <CardAction label={`Move item ${index + 1} later`} disabled={disabled || index === value.length - 1} onClick={() => library.moveTo(index, index + 1)}>→</CardAction>
                {item.mediaType === 'IMAGE' && !isCover ? <CardAction label="Make this the store cover" icon="star" disabled={disabled} onClick={() => library.moveTo(index, 0)} /> : null}
                <span className="ml-auto" />
                <CardAction label={`Remove item ${index + 1}`} icon="trash" danger disabled={disabled} onClick={() => library.remove(index)} />
              </div>
            </li>
          );
        })}
        {!library.isFull ? (
          <li>
            <button type="button" onClick={library.openPicker} disabled={disabled} className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-center text-muted transition-colors hover:border-primary/40 hover:bg-bg disabled:opacity-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg"><Icon name="plus" className="h-6 w-6" /></span>
              <span className="text-sm font-semibold text-fg">{value.length === 0 ? '+ Add the store cover' : '+ Add additional angle'}</span>
              <span className="px-6 text-xs">Drop dimension specs, the box, or a size reference</span>
              <span className="mt-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary">Slot #{value.length + 1} available</span>
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
