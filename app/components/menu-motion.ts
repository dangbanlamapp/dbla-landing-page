import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

/**
 * The menu's motion signature, shared with the route-change transition that
 * imitates it. One module so the two cannot drift apart: tune the curve or the
 * stagger here and both move together.
 */

gsap.registerPlugin(CustomEase);

/** A steep ease-in-out — slow off the mark, fast through the middle. */
export const MENU_EASE = CustomEase.create("menu", "M0,0 C0.76,0 0.24,1 1,1");

/** How far the accent layer trails the black one behind it, in seconds. */
export const MENU_LEAD = 0.08;
