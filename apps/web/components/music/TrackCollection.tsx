"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Shuffle, X } from "lucide-react";
import { PlayIcon, SearchIcon } from "@personal/design-system";
import { sound } from "@/lib/audio/soundEngine";
import type { LibraryTrack } from "@/lib/musicLibrary";
import { ViewToggle, type CollectionView } from "@/components/ui/ViewToggle";
import { useAudio } from "./AudioProvider";
import { TrackRow, TrackTile, trackStyles } from "./TrackItems";
import styles from "./TrackCollection.module.css";

const EDGE_ZONE = 56;
const MAX_SCROLL_SPEED = 22;

// Shared surface for any page that lists tracks: /music uses the full toolbar,
// smaller sections (a track page's "more from the library", the home page) pass
// controls={false} and a limit to get the same cards without the chrome.
export function TrackCollection({ tracks, defaultView = "grid", controls = true, limit, label = "tracks" }: {
  tracks: LibraryTrack[];
  defaultView?: CollectionView;
  controls?: boolean;
  limit?: number;
  label?: string;
}) {
  const reducedMotion = useReducedMotion();
  const { currentSlug, playing, playPause, playTrackBySlug, playTracks } = useAudio();
  const [view, setView] = useState<CollectionView>(defaultView);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; clientX: number; clientY: number; base: string[]; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  // Anchor for shift-click range selection — the index of the last track
  // clicked (play or checkbox) without shift held.
  const anchorRef = useRef<number | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());

  const results = useMemo(() => {
    const filtered = tracks.filter((track) => !deferredQuery || `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase().includes(deferredQuery));
    return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  }, [deferredQuery, limit, tracks]);

  const rangeSelect = (index: number) => {
    const anchor = anchorRef.current ?? index;
    const [lo, hi] = anchor < index ? [anchor, index] : [index, anchor];
    setSelected(results.slice(lo, hi + 1).map((track) => track.slug));
  };

  const select = (track: LibraryTrack, index: number, event: ReactMouseEvent) => {
    if (event.shiftKey) { sound.play("toggle"); rangeSelect(index); return; }
    sound.play("tap");
    anchorRef.current = index;
    if (track.slug === currentSlug && playing) playPause(); else playTrackBySlug(track.slug);
  };
  const toggleSelect = (track: LibraryTrack, index: number, event: ReactMouseEvent) => {
    sound.play("toggle");
    if (event.shiftKey) { rangeSelect(index); return; }
    anchorRef.current = index;
    setSelected((current) => current.includes(track.slug) ? current.filter((slug) => slug !== track.slug) : [...current, track.slug]);
  };

  // Shuffle plays the checked songs when there are any, so a selection acts as
  // a throwaway playlist without needing to be saved anywhere.
  const shuffle = () => {
    const pool = selected.length ? results.filter((track) => selected.includes(track.slug)) : results;
    if (!pool.length) return;
    sound.play("next");
    const order = pool.map((track) => track.slug);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    playTracks(order);
  };

  // Rubber-band select. Coordinates are kept in document space so the box stays
  // anchored while the page auto-scrolls mid-drag, and a 6px threshold keeps a
  // plain click on a card working as play/pause.
  const startMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (!controls || !surface || event.button !== 0 || event.pointerType !== "mouse") return;
    // Cards are links now, so only real controls (play, checkbox) opt out of the
    // drag. A drag that actually moves is swallowed by the click-capture guard
    // below, which preventDefaults the click and stops the link navigating.
    if ((event.target as HTMLElement).closest("button, [role=checkbox]")) return;
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    dragRef.current = { startX: event.clientX + window.scrollX, startY: event.clientY + window.scrollY, clientX: event.clientX, clientY: event.clientY, base: additive ? selected : [], moved: false };

    const applyDrag = () => {
      const drag = dragRef.current;
      if (!drag) return;
      const x = drag.clientX + window.scrollX;
      const y = drag.clientY + window.scrollY;
      if (!drag.moved && Math.hypot(x - drag.startX, y - drag.startY) < 6) return;
      drag.moved = true;
      const box = { left: Math.min(x, drag.startX), top: Math.min(y, drag.startY), right: Math.max(x, drag.startX), bottom: Math.max(y, drag.startY) };
      const surfaceRect = surface.getBoundingClientRect();
      setMarquee({ left: box.left - surfaceRect.left - window.scrollX, top: box.top - surfaceRect.top - window.scrollY, width: box.right - box.left, height: box.bottom - box.top });
      const hits = [...surface.querySelectorAll<HTMLElement>("[data-slug]")].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left + window.scrollX < box.right && rect.right + window.scrollX > box.left && rect.top + window.scrollY < box.bottom && rect.bottom + window.scrollY > box.top;
      }).map((element) => element.dataset.slug ?? "");
      setSelected([...new Set([...drag.base, ...hits])]);
    };

    const onMove = (move: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.clientX = move.clientX;
      drag.clientY = move.clientY;
      applyDrag();
    };

    // Cursor pinned at the viewport edge keeps scrolling even without new
    // pointermove events, so this runs on its own rAF loop rather than off onMove.
    let rafId = 0;
    const scrollTick = () => {
      const drag = dragRef.current;
      if (!drag) return;
      let dy = 0;
      if (drag.clientY < EDGE_ZONE) dy = -Math.ceil(((EDGE_ZONE - drag.clientY) / EDGE_ZONE) * MAX_SCROLL_SPEED);
      else if (drag.clientY > window.innerHeight - EDGE_ZONE) dy = Math.ceil(((drag.clientY - (window.innerHeight - EDGE_ZONE)) / EDGE_ZONE) * MAX_SCROLL_SPEED);
      if (dy) {
        const target = Math.max(0, window.scrollY + dy);
        if (window.__lenis) window.__lenis.scrollTo(target, { immediate: true }); else window.scrollBy(0, dy);
        applyDrag();
      }
      rafId = window.requestAnimationFrame(scrollTick);
    };
    rafId = window.requestAnimationFrame(scrollTick);

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.cancelAnimationFrame(rafId);
      if (dragRef.current?.moved) { suppressClick.current = true; sound.play("toggle"); }
      dragRef.current = null;
      setMarquee(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const playSelection = () => {
    if (!selected.length) return;
    sound.play("confirm");
    playTracks(results.filter((track) => selected.includes(track.slug)).map((track) => track.slug));
  };

  return (
    <section className={styles.collection} aria-label={`All ${label}`}>
      {controls ? (
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <SearchIcon />
            <label htmlFor="track-search">Search {label}</label>
            <input id="track-search" type="search" placeholder={`Search ${label}…`} value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
          </div>
          {selected.length ? (
            <>
              <button className={styles.action} type="button" onClick={playSelection}>
                <PlayIcon aria-hidden="true" /> Play {selected.length} selected
              </button>
              <button className={`${styles.action} ${styles.actionQuiet}`} type="button" onClick={() => { sound.play("close"); setSelected([]); }}>
                <X aria-hidden="true" /> Clear
              </button>
            </>
          ) : null}
          <button className={`${styles.action} ${styles.actionQuiet}`} type="button" onClick={shuffle} disabled={!results.length}>
            <Shuffle aria-hidden="true" /> Shuffle
          </button>
          <ViewToggle label={`${label} view`} view={view} onChange={setView} />
          <span className={styles.count}>{results.length} {results.length === 1 ? "track" : "tracks"}</span>
        </div>
      ) : null}

      <div
        className={styles.surface}
        ref={surfaceRef}
        data-dragging={Boolean(marquee)}
        onPointerDown={startMarquee}
        onClickCapture={(event) => { if (!suppressClick.current) return; suppressClick.current = false; event.stopPropagation(); event.preventDefault(); }}
      >
        <motion.ul layout={!reducedMotion} className={view === "grid" ? trackStyles.grid : trackStyles.list}>
          {results.map((track, index) => {
            const active = track.slug === currentSlug;
            const Item = view === "grid" ? TrackTile : TrackRow;
            return (
              <Item
                key={track.slug}
                track={track}
                index={index}
                active={active}
                playing={active && playing}
                selected={selected.includes(track.slug)}
                onSelect={(item, event) => select(item, index, event)}
                onToggleSelect={controls ? (item, event) => toggleSelect(item, index, event) : undefined}
              />
            );
          })}
        </motion.ul>
        {marquee ? <div className={styles.marquee} style={marquee} aria-hidden="true" /> : null}
      </div>

      {results.length === 0 ? <p className={styles.empty}>No {label} match “{query}”.</p> : null}
      <output className={styles.srOnly} aria-live="polite">{results.length} {results.length === 1 ? "track" : label} shown{selected.length ? `, ${selected.length} selected` : ""}</output>
    </section>
  );
}
