import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";
import { dataset, projectId } from "../env";

const builder = createImageUrlBuilder({ projectId, dataset });

/**
 * A URL builder for an image field. Respects the editor's crop and hotspot
 * whenever the result is cropped (`.width().height().fit("crop")`), which is
 * why queries project `crop` and `hotspot` alongside the asset.
 */
export const urlFor = (source: SanityImageSource) => builder.image(source);
