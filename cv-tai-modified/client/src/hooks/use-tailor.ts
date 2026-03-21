import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type TailorInput = z.infer<typeof api.tailor.generate.input>;

export function useGenerateTailor() {
  return useMutation({
    mutationFn: async (data: TailorInput) => {
      const res = await fetch(api.tailor.generate.path, {
        method: api.tailor.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        let errMessage = "Generation failed";
        try {
          const errData = await res.json();
          if (errData.message) errMessage = errData.message;
        } catch (_) {}
        throw new Error(errMessage);
      }
      return api.tailor.generate.responses[201].parse(await res.json());
    },
  });
}

export function useRun(id: string) {
  return useQuery({
    queryKey: [api.tailor.getRun.path, id],
    queryFn: async () => {
      const url = buildUrl(api.tailor.getRun.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch run");
      return api.tailor.getRun.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ["/api/runs"],
    queryFn: async () => {
      const res = await fetch("/api/runs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json() as Promise<any[]>;
    },
  });
}
