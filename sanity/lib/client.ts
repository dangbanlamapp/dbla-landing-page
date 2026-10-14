import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

/**
 * The one client. Pages do not call it directly — they go through
 * `sanityFetch` in live.ts, which wraps it with cache tags and live updates.
 *
 * `useCdn: true` serves published content from Sanity's edge cache, which is
 * all the public site ever reads. `perspective: "published"` keeps drafts out
 * unless a fetch asks for them explicitly (draft mode, once it exists).
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});
