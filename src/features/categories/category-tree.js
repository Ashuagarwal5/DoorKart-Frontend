/**
 * Parents followed by their subcategories, which is the order people expect to read them in.
 * The label of a subcategory is prefixed so a plain <select> still shows the nesting.
 */
export function orderCategories(categories) {
  const childrenOf = new Map();
  for (const category of categories) {
    if (category.parentId !== null) {
      childrenOf.set(category.parentId, [...(childrenOf.get(category.parentId) ?? []), category]);
    }
  }
  const ids = new Set(categories.map((category) => category.id));

  // A subcategory whose parent is missing from the list is shown as a top-level one.
  return categories
    .filter((category) => category.parentId === null || !ids.has(category.parentId))
    .flatMap((parent) => [
      { category: parent, label: parent.name },
      ...(childrenOf.get(parent.id) ?? []).map((child) => ({ category: child, label: `${parent.name} › ${child.name}` })),
    ]);
}
