import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogueRepo } from "../data";
import type { CatalogueItem } from "../data";
import { getDb } from "../data";
import { uid } from "../data/uid";

export function useCatalogueItems() {
  return useQuery({
    queryKey: ["catalogue"],
    queryFn: () => catalogueRepo.findActive(),
  });
}

export function useCatalogueByCategory(category: string) {
  return useQuery({
    queryKey: ["catalogue", "category", category],
    queryFn: () => catalogueRepo.findByCategory(category),
    enabled: !!category,
  });
}

export function usePackages() {
  return useQuery({
    queryKey: ["catalogue", "packages"],
    queryFn: () => catalogueRepo.findPackages(),
  });
}

export function useCreateCatalogueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CatalogueItem, "id" | "created_at" | "updated_at">) =>
      catalogueRepo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogue"] }),
  });
}

export function useUpdateCatalogueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogueItem> }) =>
      catalogueRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogue"] }),
  });
}

export function useDeleteCatalogueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogueRepo.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogue"] }),
  });
}

/** Get package items (the line items inside a package). */
export function usePackageItems(packageId: string | null) {
  return useQuery({
    queryKey: ["catalogue", "package-items", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const db = await getDb();
      return db.select<{ id: string; catalogue_item_id: string; quantity: number; name: string; price_cents: number }[]>(
        `SELECT cpi.id, cpi.catalogue_item_id, cpi.quantity, ci.name, ci.price_cents
         FROM catalogue_package_items cpi
         JOIN catalogue_items ci ON ci.id = cpi.catalogue_item_id
         WHERE cpi.package_id = ?`,
        [packageId]
      );
    },
    enabled: !!packageId,
  });
}

export function useAddPackageItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ packageId, catalogueItemId, quantity }: { packageId: string; catalogueItemId: string; quantity: number }) => {
      const db = await getDb();
      const id = uid();
      await db.execute(
        "INSERT INTO catalogue_package_items (id, package_id, catalogue_item_id, quantity) VALUES (?, ?, ?, ?)",
        [id, packageId, catalogueItemId, quantity]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogue"] }),
  });
}
