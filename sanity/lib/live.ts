import { defineLive } from "next-sanity/live";
import { client } from "./client";

/**
 * `sanityFetch` for every server-side read, and `<SanityLive />` (mounted once,
 * in the root layout) to keep those reads fresh: when a document is published,
 * the Live Content API tells the open page which cache tags went stale and
 * Next refetches just those. No webhook, no time-based revalidation.
 *
 * The token is optional while the dataset is public and the site only reads
 * published content. It becomes necessary with draft mode / Visual Editing,
 * which reads drafts — and only then is it handed to the browser, since
 * `browserToken` is shared exclusively with readers who are in draft mode.
 */
const token = process.env.SANITY_API_READ_TOKEN;

/**
 * One cache tag on every fetch, alongside the fine-grained ones defineLive adds
 * itself. It is what /api/revalidate expires when Sanity's webhook fires.
 *
 * The two paths cover each other's gap. <SanityLive /> revalidates precisely,
 * but only from a browser that is open on the site when the publish happens —
 * a publish while nobody is browsing is otherwise never picked up, since these
 * fetches are cached with no expiry and a late-connecting browser does not
 * replay events it missed. The webhook is called by Sanity's servers on every
 * publish, visitors or not, and simply expires everything: the whole site is a
 * handful of queries, so precision buys nothing there.
 */
export const SANITY_TAG = "sanity";

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  browserToken: token,
});
