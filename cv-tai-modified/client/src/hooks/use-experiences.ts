import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type ExperienceInput = z.infer<typeof api.experiences.create.input>;
type ExperienceUpdateInput = z.infer<typeof api.experiences.update.input>;

export function useExperiences() {
  return useQuery({
    queryKey: [api.experiences.list.path],
    queryFn: async () => {
      const res = await fetch(api.experiences.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch experiences");
      return api.experiences.list.responses[200].parse(await res.json());
    },
  });
}

export function useExperience(id: string) {
  return useQuery({
    queryKey: [api.experiences.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.experiences.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch experience");
      return api.experiences.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExperienceInput) => {
      const res = await fetch(api.experiences.create.path, {
        method: api.experiences.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create experience");
      return api.experiences.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.experiences.list.path] });
    },
  });
}

export function useUpdateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ExperienceUpdateInput) => {
      const url = buildUrl(api.experiences.update.path, { id });
      const res = await fetch(url, {
        method: api.experiences.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update experience");
      return api.experiences.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.experiences.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.experiences.get.path, data.id] });
    },
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.experiences.delete.path, { id });
      const res = await fetch(url, {
        method: api.experiences.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete experience");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.experiences.list.path] });
    },
  });
}
