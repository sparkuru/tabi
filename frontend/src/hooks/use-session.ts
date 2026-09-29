import { useQuery } from "@tanstack/react-query";

import { apiData } from "../api/client";
import { meApiAuthMeGet } from "../api/generated";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await meApiAuthMeGet();
      if (response.response?.status === 401) return null;
      return apiData(Promise.resolve(response));
    },
    retry: false,
  });
}
