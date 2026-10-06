'use client';

import { type DragEvent, useEffect, useId, useRef, useState } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { uploadMedia } from '@/services/api/admin-api';
import { ApiError, describeApiError } from '@/services/api/api-error';
import { resolveMediaUrl } from '@/services/api/config';
import type { MediaType } from '@/types/api';
import { cn } from '@/utils/cn';

/** One picture or video as the product form holds it. */
export type MediaItem = { url: string; mediaType: MediaType; altText: string | null };

export const MAX_MEDIA = 10;
export const MAX_VIDEOS = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';

const VIDEO_ADDRESS = /\.(mp4|mov|webm)(\?.*)?$/i;

/** Rough guesses for an address typed in by hand. Uploaded files get their real type from the server. */
const guessTypeFromAddress = (url: string): MediaType => (VIDEO_ADDRESS.test(url) ? 'VIDEO' : 'IMAGE');

/** The count and limit rules, shared with the form's own validation. */
export function describeMediaProblem(items: MediaItem[]): string | null {
  if (items.length > MAX_MEDIA) return `Add at most ${MAX_MEDIA} pictures and videos.`;
  if (items.filter((item) => item.mediaType === 'VIDEO').length > MAX_VIDEOS) {
    return `Add at most ${MAX_VIDEOS} videos.`;
  }
  return null;
}

/** A quick check before sending, so an obviously wrong file fails at once. The server checks again. */
function checkFile(file: File): string | null {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) return 'Only pictures and videos can be uploaded.';
  if (isImage && file.size > MAX_IMAGE_BYTES) return 'Pictures can be up to 5 MB.';
  if (isVideo && file.size > MAX_VIDEO_BYTES) return 'Videos can be up to 50 MB.';
  return null;
}

type UploadNote = { id: number; name: string; state: 'uploading' | 'failed'; message?: string };

type Props = {
  value: MediaItem[];
  onChange: (next: MediaItem[]) => void;
  /** Lets the form hold the Save button back while a file is still going up. */
  onUploadingChange?: (isUploading: boolean) => void;
  error?: string;
  disabled?: boolean;
};

export function MediaManager({ value, onChange, onUploadingChange, error, disabled }: Props) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<UploadNote[]>([]);
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Uploads finish one after another, each adding to the list. This always holds the latest list,
  // so a finished upload never overwrites one that completed a moment earlier.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const nextNoteId = useRef(0);

  const commit = (next: MediaItem[]) => {
    latest.current = next;
    onChange(next);
  };

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const id = nextNoteId.current++;
      const problem = checkFile(file) ?? describeMediaProblem([...latest.current, { url: '', mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE', altText: null }]);
      if (problem) {
        setNotes((current) => [...current, { id, name: file.name, state: 'failed', message: problem }]);
        continue;
      }
      setNotes((current) => [...current, { id, name: file.name, state: 'uploading' }]);
      try {
        const uploaded = await uploadMedia(file);
        commit([...latest.current, { url: uploaded.url, mediaType: uploaded.mediaType, altText: null }]);
        setNotes((current) => current.filter((note) => note.id !== id));
      } catch (caught) {
        const message = caught instanceof ApiError ? describeApiError(caught) : 'The upload failed.';
        setNotes((current) =>
          current.map((note) => (note.id === id ? { ...note, state: 'failed', message } : note))
        );
      }
    }
  };

  const onPicked = (files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    if (fileInput.current) fileInput.current.value = '';
    if (chosen.length > 0) void uploadFiles(chosen);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) onPicked(event.dataTransfer.files);
  };

  const addAddress = () => {
    const url = address.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setAddressError('Enter a full web address starting with http:// or https://.');
      return;
    }
    const next = [...value, { url, mediaType: guessTypeFromAddress(url), altText: null }];
    const problem = describeMediaProblem(next);
    if (problem) {
      setAddressError(problem);
      return;
    }
    setAddressError(null);
    setAddress('');
    commit(next);
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    commit(next);
  };

  const remove = (index: number) => commit(value.filter((_, position) => position !== index));

  const mainPicture = value.findIndex((item) => item.mediaType === 'IMAGE');
  const isUploading = notes.some((note) => note.state === 'uploading');
  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center',
          isDragging ? 'border-primary bg-primary-soft' : 'border-line bg-bg'
        )}>
        <input
          ref={fileInput}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => onPicked(event.target.files)}
        />
        <Button onClick={() => fileInput.current?.click()} disabled={disabled} loading={isUploading}>
          {isUploading ? 'Uploading…' : 'Upload pictures or videos'}
        </Button>
        <p className="text-xs text-muted">
          Or drop files here. Pictures: JPG, PNG, WebP or GIF up to 5 MB. Videos: MP4, MOV or WebM up to 50 MB (at most {MAX_VIDEOS}).
        </p>
      </div>

      {notes.length > 0 ? (
        <ul className="space-y-1 text-sm" aria-live="polite">
          {notes.map((note) => (
            <li key={note.id} className={cn('flex items-center gap-2', note.state === 'failed' && 'text-danger')}>
              {note.state === 'uploading' ? <Spinner /> : null}
              <span className="truncate">
                {note.state === 'uploading' ? `Uploading ${note.name}…` : `${note.name}: ${note.message}`}
              </span>
              {note.state === 'failed' ? (
                <button
                  type="button"
                  className="ml-auto shrink-0 text-xs text-muted underline"
                  onClick={() => setNotes((current) => current.filter((other) => other.id !== note.id))}>
                  Dismiss
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {value.map((item, index) => (
            <li key={`${item.url}-${index}`} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="relative aspect-square bg-bg">
                {item.mediaType === 'VIDEO' ? (
                  <video
                    src={resolveMediaUrl(item.url)}
                    controls
                    preload="metadata"
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="absolute left-1.5 top-1.5 flex gap-1 text-[11px] font-medium">
                  {item.mediaType === 'VIDEO' ? (
                    <span className="rounded bg-fg/80 px-1.5 py-0.5 text-white">Video</span>
                  ) : null}
                  {index === mainPicture ? (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-on-primary">Main picture</span>
                  ) : null}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move item ${index + 1} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}>
                  ←
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move item ${index + 1} later`}
                  disabled={disabled || index === value.length - 1}
                  onClick={() => move(index, 1)}>
                  →
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={disabled}
                  onClick={() => remove(index)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No pictures or videos yet. The first picture added becomes the main one.</p>
      )}

      <div>
        <label htmlFor={`${inputId}-address`} className="mb-1 block text-sm font-medium text-fg">
          Or add from a web address
        </label>
        <div className="flex gap-2">
          <input
            id={`${inputId}-address`}
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={address}
            disabled={disabled}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addAddress();
              }
            }}
            className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
          />
          <Button onClick={addAddress} disabled={disabled || address.trim() === ''}>
            Add
          </Button>
        </div>
        {addressError ? (
          <p role="alert" className="mt-1 text-xs text-danger">
            {addressError}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
