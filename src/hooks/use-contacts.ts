import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsRepo } from "../data";
import type { Contact } from "../data";

export function useContacts(filter?: "client" | "supplier" | "crew") {
  return useQuery({
    queryKey: ["contacts", filter ?? "all"],
    queryFn: () => {
      if (filter === "client") return contactsRepo.findClients();
      if (filter === "supplier") return contactsRepo.findSuppliers();
      if (filter === "crew") return contactsRepo.findCrew();
      return contactsRepo.findAll();
    },
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: ["contacts", "detail", id],
    queryFn: () => (id ? contactsRepo.findById(id) : null),
    enabled: !!id,
  });
}

export function useSearchContacts(query: string) {
  return useQuery({
    queryKey: ["contacts", "search", query],
    queryFn: () => contactsRepo.search(query),
    enabled: query.length >= 2,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Contact, "id" | "created_at" | "updated_at">) =>
      contactsRepo.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      contactsRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsRepo.softDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useCheckDuplicates(phone?: string, email?: string, name?: string) {
  return useQuery({
    queryKey: ["contacts", "duplicates", phone, email, name],
    queryFn: () => contactsRepo.findDuplicates(phone, email, name),
    enabled: !!(phone || email || name),
  });
}
