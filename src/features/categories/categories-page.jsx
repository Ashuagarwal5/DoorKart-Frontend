'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, QueryView } from '@/components/ui/states';
import { ActiveBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { CategoryFormDialog } from '@/features/categories/category-form-dialog';
import { orderCategories } from '@/features/categories/category-tree';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchCategories, updateCategory } from '@/services/api/admin-api';
import { getErrorMessage } from '@/services/api/api-error';

export function CategoriesPage() {
  const toast = useToast();
  const query = useApiQuery('categories', fetchCategories);
  // `undefined`: dialog closed. `null`: creating. A category: editing it.
  const [editing, setEditing] = useState(undefined);
  const [deactivating, setDeactivating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const setActive = async (category, isActive) => {
    await updateCategory(category.id, { isActive });
    toast.success(isActive ? `${category.name} is active again.` : `${category.name} is now inactive.`);
    query.reload();
  };

  const activate = async (category) => {
    setBusyId(category.id);
    try {
      await setActive(category, true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      cell: (category) =>
        category.parentId === null ? (
          <span className="font-medium text-fg">
            {category.name}
            {category.childCount > 0 ? <span className="ml-2 text-xs font-normal text-muted">{category.childCount} subcategories</span> : null}
          </span>
        ) : (
          <span className="pl-6 text-fg">
            <span aria-hidden className="mr-1 text-muted">↳</span>
            {category.name}
          </span>
        ),
    },
    { key: 'slug', header: 'Slug', cell: (category) => category.slug },
    { key: 'order', header: 'Display order', align: 'right', cell: (category) => category.displayOrder },
    { key: 'products', header: 'Products', align: 'right', cell: (category) => category.productCount },
    { key: 'status', header: 'Status', cell: (category) => <ActiveBadge isActive={category.isActive} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (category) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setEditing(category)}>
            Edit
          </Button>
          {category.isActive ? (
            <Button size="sm" onClick={() => setDeactivating(category)}>
              Deactivate
            </Button>
          ) : (
            <Button size="sm" loading={busyId === category.id} onClick={() => activate(category)}>
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Categories"
        description="How products are grouped in the shop."
        actions={
          <Button variant="primary" onClick={() => setEditing(null)}>
            Add category
          </Button>
        }
      />

      <QueryView
        query={query}
        empty={(categories) =>
          categories.length === 0 ? (
            <EmptyState
              title="No categories yet"
              message="Products belong to a category, so add one first."
              action={
                <Button variant="primary" onClick={() => setEditing(null)}>
                  Add category
                </Button>
              }
            />
          ) : null
        }>
        {(categories) => (
          <DataTable
            caption="Categories"
            columns={columns}
            rows={orderCategories(categories).map((option) => option.category)}
            getKey={(category) => category.id}
          />
        )}
      </QueryView>

      <CategoryFormDialog
        open={editing !== undefined}
        category={editing ?? null}
        categories={query.status === 'success' ? query.data : []}
        onClose={() => setEditing(undefined)}
        onSaved={query.reload}
      />

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate this category?"
        confirmLabel="Deactivate"
        tone="danger"
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          if (deactivating) {
            await setActive(deactivating, false);
          }
        }}>
        <p>
          <strong>{deactivating?.name}</strong>
          {(deactivating?.productCount ?? 0) > 0
            ? ` and all ${deactivating?.productCount} of its products will be hidden from customers.`
            : ' will be hidden from customers.'}
          {(deactivating?.childCount ?? 0) > 0 ? ` Its ${deactivating?.childCount} subcategories will be deactivated too.` : ''}{' '}
          Nothing is deleted, and you can activate it again at any time.
        </p>
      </ConfirmDialog>
    </>
  );
}
