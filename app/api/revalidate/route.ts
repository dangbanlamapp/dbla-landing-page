import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { SANITY_TAG } from "@/sanity/lib/live";

/**
 * Called by a Sanity webhook on every publish, unpublish and delete, so the
 * site picks up an edit even when nobody has it open — see SANITY_TAG for why
 * <SanityLive /> alone does not cover that.
 *
 * The request is signed with SANITY_REVALIDATE_SECRET, the same value set on
 * the webhook in sanity.io/manage; anything unsigned or wrongly signed is
 * refused, so this cannot be used to flush the cache from outside.
 *
 * `parseBody`'s third argument holds the response until the Content Lake has
 * the change everywhere, so the refetch this triggers cannot read the old
 * version back from a replica that has not caught up yet.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    return new NextResponse("SANITY_REVALIDATE_SECRET is not set", {
      status: 500,
    });
  }

  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(
      request,
      secret,
      true,
    );

    if (!isValidSignature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // `{ expire: 0 }` rather than the "max" profile <SanityLive /> uses:
    // "max" serves the old page once more and refreshes behind it, which is
    // fine for a reader already looking at the page, but here the first
    // person to see the change may be a visitor arriving hours later. Next's
    // docs recommend exactly this for webhooks.
    revalidateTag(SANITY_TAG, { expire: 0 });

    return NextResponse.json({
      revalidated: true,
      type: body?._type ?? null,
      now: Date.now(),
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Could not parse the webhook body", {
      status: 400,
    });
  }
}
