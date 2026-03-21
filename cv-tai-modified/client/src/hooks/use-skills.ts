import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type SkillInput = z.infer<typeof api.skills.create.input>;
type SkillUpdateInput = z.infer<typeof api.skills.update.input>;

export function useSkills() {
  return useQuery({
    queryKey: [api.skills.list.path],
    queryFn: async () => {
      const res = await fetch(api.skills.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch skills");
      return api.skills.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SkillInput) => {
      const res = await fetch(api.skills.create.path, {
        method: api.skills.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create skill");
      return api.skills.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.skills.list.path] });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & SkillUpdateInput) => {
      const url = buildUrl(api.skills.update.path, { id });
      const res = await fetch(url, {
        method: api.skills.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update skill");
      return api.skills.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.skills.list.path] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.skills.delete.path, { id });
      const res = await fetch(url, {
        method: api.skills.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete skill");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.skills.list.path] });
    },
  });
}
