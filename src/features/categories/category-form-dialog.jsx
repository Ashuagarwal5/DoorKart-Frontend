'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CheckboxField, SelectField, TextArea, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createCategory, updateCategory } from '@/services/api/admin-api';
import { ApiError, describeApiError } from '@/services/api/api-error';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function CategoryFormDialog({ open, category, categories, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title={category ? 'Edit category' : 'Add category'}>
      <CategoryForm category={category} categories={categories} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function CategoryForm({ category, categories, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(category?.displayOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const found = {};
    if (name.trim() === '') found['name'] = 'Enter the category name.';
    if (slug.trim() !== '' && !SLUG_PATTERN.test(slug.trim())) {
      found['slug'] = 'Use lower-case letters, digits and single dashes.';
    }
    if (imageUrl.trim() !== '' && !/^https?:\/\/\S+$/i.test(imageUrl.trim())) {
      found['imageUrl'] = 'Enter a full web address starting with http:// or https://.';
    }
    if (!/^\d+$/.test(displayOrder.trim()) || Number(displayOrder) > 100_000) {
      found['displayOrder'] = 'Enter a whole number, 0 or more.';
    }
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      return;
    }

    const next = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      displayOrder: Number(displayOrder),
      isActive,
      parentId: parentId || null,
    };

    // Editing sends only what changed; creating sends everything.
    const changes = {};
    if (category) {
      if (next.name !== category.name) changes.name = next.name;
      if (next.slug && next.slug !== category.slug) changes.slug = next.slug;
      if (next.description !== category.description) changes.description = next.description;
      if (next.imageUrl !== category.imageUrl) changes.imageUrl = next.imageUrl;
      if (next.displayOrder !== category.displayOrder) changes.displayOrder = next.displayOrder;
      if (next.isActive !== category.isActive) changes.isActive = next.isActive;
      if (next.parentId !== category.parentId) changes.parentId = next.parentId;
      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
    }
    setIsSaving(true);
    try {
      if (category) {
        await updateCategory(category.id, changes);
        toast.success('Category updated.');
      } else {
        await createCategory({ ...next, slug: next.slug || undefined });
        toast.success('Category created.');
      }
      onSaved();
      onClose();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.');
      if (apiError.code === 'VALIDATION_ERROR' && Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      } else if (apiError.code === 'DUPLICATE_SLUG') {
        setErrors({ slug: apiError.message });
      } else if (['INVALID_PARENT', 'CATEGORY_TOO_DEEP', 'CATEGORY_HAS_CHILDREN', 'PARENT_INACTIVE'].includes(apiError.code)) {
        setErrors({ parentId: apiError.message });
      } else {
        setFormError(describeApiError(apiError));
      }
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <TextField label="Name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} error={errors['name']} maxLength={100} disabled={isSaving} />
      <SelectField
        label="Parent category"
        hint={
          category && category.childCount > 0
            ? 'This category has subcategories, so it stays top-level.'
            : 'Leave empty for a top-level category, or choose one to make this a subcategory (e.g. Toys › Puzzles).'
        }
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        error={errors['parentId']}
        disabled={isSaving || (category !== null && category.childCount > 0)}>
        <option value="">None (top-level)</option>
        {categories
          .filter((candidate) => candidate.parentId === null && candidate.id !== category?.id)
          .map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
              {candidate.isActive ? '' : ' (inactive)'}
            </option>
          ))}
      </SelectField>
      <TextField
        label="Slug"
        hint={category ? 'Used in the category’s web address.' : 'Optional. Leave blank to build it from the name.'}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        error={errors['slug']}
        maxLength={100}
        disabled={isSaving}
      />
      <TextArea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} error={errors['description']} maxLength={500} disabled={isSaving} />
      <TextField label="Image address" placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} error={errors['imageUrl']} disabled={isSaving} />
      <TextField
        label="Display order"
        inputMode="numeric"
        hint="Categories are shown from the lowest number to the highest."
        value={displayOrder}
        onChange={(e) => setDisplayOrder(e.target.value)}
        error={errors['displayOrder']}
        disabled={isSaving}
      />
      <CheckboxField
        label="Active"
        hint="An inactive category, its subcategories and their products are hidden from customers."
        checked={isActive}
        onChange={(e) => setIsActive(e.target.checked)}
        disabled={isSaving}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          {category ? 'Save changes' : 'Create category'}
        </Button>
      </div>
    </form>
  );
}
