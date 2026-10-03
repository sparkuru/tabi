import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { apiData } from "../../api/client";
import { completeItemApiItemsItemIdCompletePost } from "../../api/generated";
import { useSession } from "../../hooks/use-session";
import { queryClient } from "../../lib/query-client";
import { createRequestKey } from "../../lib/request-key";

export function useCompletion(itemId: string) {
  const session = useSession();
  const navigate = useNavigate();
  const requestKey = useRef(createRequestKey());
  const active = useRef(false);
  const mutation = useMutation({
    mutationFn: () =>
      apiData(
        completeItemApiItemsItemIdCompletePost({
          path: { item_id: itemId },
          headers: { "idempotency-key": requestKey.current },
        }),
      ),
    onSuccess: async () => {
      requestKey.current = createRequestKey();
      await Promise.all(
        ["lists", "list", "items", "item", "history"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });

  async function complete() {
    if (active.current) return;
    if (!session.data) {
      await navigate({
        to: "/auth",
        search: { redirect: `/items/${itemId}?complete=1` },
      });
      return;
    }
    active.current = true;
    try {
      await mutation.mutateAsync();
    } catch {
      // The mutation retains the error and request key for a safe retry.
    } finally {
      active.current = false;
    }
  }

  return { ...mutation, complete };
}
