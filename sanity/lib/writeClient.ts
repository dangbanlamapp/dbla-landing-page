import "server-only";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

/**
 * The one client allowed to write, and only from the server — `server-only`
 * fails the build if anything in a client bundle imports it, since the token
 * would ship with it. Used by the contact form's action and nothing else.
 *
 * `useCdn: false` because writes never go through the CDN anyway, and this
 * keeps a read-after-write from coming back stale should one ever be added.
 *
 * Undefined while SANITY_API_WRITE_TOKEN is unset, so a missing token is a
 * logged failure in the action rather than a crash at import.
 */
const token = process.env.SANITY_API_WRITE_TOKEN;

export const writeClient = token
  ? createClient({ projectId, dataset, apiVersion, token, useCdn: false })
  : undefined;
