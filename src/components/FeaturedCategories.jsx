import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORIES } from "../data/catalog.js";
import { fetchCategories } from "../redux/slices/productSlice.js";
import SectionHeader from "./SectionHeader.jsx";

const AUTOPLAY_MS = 3000;

/**
 * "Shop by Category" as a carousel.
 *
 * It is a real horizontal scroller rather than a CSS animation, so the arrows
 * move it, a finger swipes it, and the keyboard reaches every card. It also
 * advances on its own, and pauses while someone is hovering, dragging or
 * tabbing through it — then picks up again.
 *
 * Categories come from the API and fall back to the bundled list, so the strip
 * grows by itself when a category is added to the database.
 */
export default function FeaturedCategories() {
  const dispatch = useDispatch();
  const fromApi = useSelector((s) => s.products.categories);

  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const categories = useMemo(() => {
    const list = fromApi?.length ? fromApi : CATEGORIES;
    // Match every API category with its picture from the bundled catalogue.
    return list.map((c) => ({
      ...c,
      image: c.image || CATEGORIES.find((x) => x.slug === c.slug)?.image,
      icon: c.icon || CATEGORIES.find((x) => x.slug === c.slug)?.icon || "",
    }));
  }, [fromApi]);

  /** How far one press of an arrow moves: one card plus its gap. */
  const step = () => {
    const track = trackRef.current;
    if (!track) return 240;
    const card = track.firstElementChild;
    if (!card) return 240;
    const gap = parseFloat(getComputedStyle(track).columnGap || "16") || 16;
    return card.offsetWidth + gap;
  };

  const readEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setAtStart(scrollLeft <= 2);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2);
  }, []);

  useEffect(() => {
    readEdges();
    const track = trackRef.current;
    if (!track) return undefined;
    track.addEventListener("scroll", readEdges, { passive: true });
    window.addEventListener("resize", readEdges);
    return () => {
      track.removeEventListener("scroll", readEdges);
      window.removeEventListener("resize", readEdges);
    };
  }, [readEdges, categories.length]);

  const scrollBy = useCallback((direction) => {
    const track = trackRef.current;
    if (!track) return;

    const { scrollLeft, scrollWidth, clientWidth } = track;

    // Wrap around at the ends so the carousel never dead-ends.
    if (direction > 0 && scrollLeft + clientWidth >= scrollWidth - 2) {
      track.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (direction < 0 && scrollLeft <= 2) {
      track.scrollTo({ left: scrollWidth, behavior: "smooth" });
      return;
    }

    track.scrollBy({ left: direction * step(), behavior: "smooth" });
  }, []);

  // Advance on its own, unless someone is interacting with it or the visitor
  // has asked the system for reduced motion.
  useEffect(() => {
    if (paused) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = setInterval(() => scrollBy(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, scrollBy]);

  if (!categories.length) return null;

  const arrow =
    "grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/95 " +
    "text-slate-700 shadow-card backdrop-blur transition hover:bg-white hover:shadow-lift " +
    "disabled:opacity-0 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200";

  return (
    <section className="mt-10">
      <div className="container-app">
        <SectionHeader
          title="Shop by Category"
          subtitle="Find what you need, faster"
          viewAllTo="/shop"
        />
      </div>

      <div
        className="group/carousel relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth
                     px-4 py-4 sm:gap-4 sm:px-6 lg:px-8
                     [-ms-overflow-style:none] [scrollbar-width:none]
                     [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Shop by category"
        >
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="zoom-img group relative block h-32 w-44 shrink-0 snap-start
                         overflow-hidden rounded-xl shadow-card transition-shadow
                         hover:shadow-lift sm:h-40 sm:w-56"
            >
              <img
                src={c.image}
                alt={c.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <p className="text-sm font-semibold drop-shadow">
                  {c.icon} {c.name}
                </p>
                <p className="text-[11px] text-white/80">
                  {c.productCount ? `${c.productCount} items · ` : ""}Shop now →
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Arrows sit over the strip and fade in when there is somewhere to go. */}
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous categories"
          disabled={atStart && atEnd}
          className={`${arrow} absolute left-2 top-1/2 -translate-y-1/2 sm:left-4`}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Next categories"
          disabled={atStart && atEnd}
          className={`${arrow} absolute right-2 top-1/2 -translate-y-1/2 sm:right-4`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
