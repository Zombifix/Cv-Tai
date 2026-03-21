import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type ParseResponse = z.infer<typeof api.parseExperience.parse.responses[200]>;

export function useParseExperience() {
  return useMutation({
    mutationFn: async (text: string): Promise<ParseResponse> => {
      const res = await fetch(api.parseExperience.parse.path, {
        method: api.parseExperience.parse.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to parse experience");
      return api.parseExperience.parse.responses[200].parse(await res.json());
    },
  });
}
