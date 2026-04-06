import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type AuthUser = { id: number; email: string };

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await fetchJson("/api/auth/me");
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation<AuthUser, Error, { email: string; password: string }>({
    mutationFn: (body) =>
      fetchJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (user) => qc.setQueryData(["/api/auth/me"], user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation<AuthUser, Error, { email: string; password: string; inviteCode?: string }>({
    mutationFn: (body) =>
      fetchJson("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (user) => qc.setQueryData(["/api/auth/me"], user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      qc.clear();
    },
  });
}
