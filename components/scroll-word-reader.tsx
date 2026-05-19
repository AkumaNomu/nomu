"use client";

import Link from "next/link";
import { animate, useReducedMotion } from "framer-motion";
import { SymbolIcon } from "@/components/icons";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { WPM_STORAGE_KEY } from "@/lib/theme";

type ScrollWordReaderProps = {
  html: string;
  nextHref?: string;
  nextLabel?: string;
};

type PreparedNodes = {
  words: HTMLElement[];
  blocks: Array<{ node: HTMLElement; index: number }>;
};

type PageDefinition = {
  html: string;
  wordCount: number;
};

const BLOCK_SELECTOR = "img, video, audio, iframe, pre, .katex-display, table";
const SKIP_SELECTOR = "script, style, svg, .katex";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function readStoredWpm() {
  if (typeof window === "undefined") return 140;

  const stored = window.localStorage.getItem(WPM_STORAGE_KEY);
  if (!stored) return 140;

  const parsed = Number(stored);
  if (Number.isFinite(parsed) && parsed >= 60 && parsed <= 320) {
    return parsed;
  }

  return 140;
}

type PageUnit = {
  node: HTMLElement;
  path: HTMLElement[];
  leadingSpace: boolean;
};

type OpenFrame = {
  source: HTMLElement;
  clone: HTMLElement;
};

function wrapWordsInPlace(root: HTMLElement) {
  function process(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent ?? "";
      if (!textContent.trim()) return;

      const parentElement = node.parentElement;
      if (!parentElement || parentElement.closest(SKIP_SELECTOR)) return;

      const fragment = document.createDocumentFragment();

      for (const token of textContent.split(/(\s+)/)) {
        if (!token) continue;

        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          continue;
        }

        const span = document.createElement("span");
        span.className = "reveal-word";
        span.dataset.wordIndex = "0";
        span.textContent = token;
        fragment.append(span);
      }

      node.parentNode?.replaceChild(fragment, node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;

    if (element.matches(SKIP_SELECTOR)) return;

    if (element.matches(BLOCK_SELECTOR)) return;

    for (const child of Array.from(element.childNodes)) {
      process(child);
    }
  }

  for (const child of Array.from(root.childNodes)) {
    process(child);
  }
}

function collectPaginationUnits(root: HTMLElement) {
  const units: PageUnit[] = [];
  let pendingWhitespace = false;

  function visit(node: Node, path: HTMLElement[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.length > 0 && /\s/.test(text)) {
        pendingWhitespace = true;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    if (element.matches(SKIP_SELECTOR)) return;

    const nextPath = [...path, element];

    if (element.matches(BLOCK_SELECTOR)) {
      units.push({ node: element, path, leadingSpace: pendingWhitespace });
      pendingWhitespace = false;
      return;
    }

    if (element.classList.contains("reveal-word")) {
      units.push({ node: element, path, leadingSpace: pendingWhitespace });
      pendingWhitespace = false;
      return;
    }

    for (const child of Array.from(element.childNodes)) {
      visit(child, nextPath);
    }
  }

  for (const child of Array.from(root.childNodes)) {
    visit(child, []);
  }

  return units;
}

function syncOpenFrames(pageRoot: HTMLElement, frames: OpenFrame[], targetPath: HTMLElement[]) {
  let commonLength = 0;

  while (
    commonLength < frames.length &&
    commonLength < targetPath.length &&
    frames[commonLength].source === targetPath[commonLength]
  ) {
    commonLength += 1;
  }

  frames.length = commonLength;

  let parent: HTMLElement = commonLength > 0 ? frames[commonLength - 1].clone : pageRoot;

  for (let index = commonLength; index < targetPath.length; index += 1) {
    const clone = targetPath[index].cloneNode(false) as HTMLElement;
    parent.append(clone);
    frames.push({ source: targetPath[index], clone });
    parent = clone;
  }
}

function appendUnitToPage(pageRoot: HTMLElement, frames: OpenFrame[], unit: PageUnit) {
  const isFirstOnPage = pageRoot.firstChild === null;
  syncOpenFrames(pageRoot, frames, unit.path);
  const parent = frames.length > 0 ? frames[frames.length - 1].clone : pageRoot;
  if (unit.leadingSpace && !isFirstOnPage) {
    parent.append(document.createTextNode(" "));
  }
  const node = unit.node.cloneNode(true) as HTMLElement;
  parent.append(node);
  return node;
}

function buildPages(html: string, viewport: HTMLElement, sizer: HTMLElement) {
  const source = document.createElement("div");
  source.innerHTML = html;
  wrapWordsInPlace(source);

  const units = collectPaginationUnits(source);

  if (units.length === 0) {
    return [] as PageDefinition[];
  }

  const pages: PageDefinition[] = [];
  const pageRoot = document.createElement("article");
  pageRoot.className = "prose-archive scroll-word-prose scroll-word-measure";
  sizer.innerHTML = "";
  sizer.append(pageRoot);

  const maxHeight = Math.max(240, viewport.clientHeight - 8);
  let frames: OpenFrame[] = [];

  for (const unit of units) {
    const previousHtml = pageRoot.innerHTML;

    appendUnitToPage(pageRoot, frames, unit);

    if (pageRoot.scrollHeight > maxHeight && previousHtml) {
      pages.push({ html: previousHtml, wordCount: countWords(previousHtml.replace(/<[^>]+>/g, " ")) });
      pageRoot.innerHTML = "";
      frames = [];
      appendUnitToPage(pageRoot, frames, unit);
    }
  }

  if (pageRoot.innerHTML.trim()) {
    pages.push({ html: pageRoot.innerHTML, wordCount: countWords(pageRoot.textContent ?? "") });
  }

  sizer.innerHTML = "";

  return pages;
}

function hideWord(node: HTMLElement) {
  node.style.opacity = "0.06";
  node.style.filter = "blur(8px)";
  node.style.transform = "translateY(0.35em)";
}

function hideBlock(node: HTMLElement) {
  node.style.opacity = "0";
  node.style.filter = "blur(12px)";
  node.style.transform = "translateY(24px) scale(0.985)";
}

function showWord(node: HTMLElement, reducedMotion: boolean) {
  animate(
    node,
    { opacity: 1, filter: "blur(0px)", transform: "translateY(0em)" },
    { duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }
  );
}

function showBlock(node: HTMLElement, reducedMotion: boolean) {
  animate(
    node,
    { opacity: 1, filter: "blur(0px)", transform: "translateY(0px) scale(1)" },
    { duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }
  );
}

function prepareAnimatedContent(root: HTMLElement) {
  const words: HTMLElement[] = [];
  const blocks: Array<{ node: HTMLElement; index: number }> = [];
  let wordIndex = 0;

  function process(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent ?? "";
      if (!textContent.trim()) return;

      const parentElement = node.parentElement;
      if (!parentElement || parentElement.closest(SKIP_SELECTOR)) return;

      const fragment = document.createDocumentFragment();

      for (const token of textContent.split(/(\s+)/)) {
        if (!token) continue;

        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          continue;
        }

        const span = document.createElement("span");
        span.className = "reveal-word";
        span.dataset.wordIndex = String(wordIndex);
        span.textContent = token;
        hideWord(span);
        words.push(span);
        fragment.append(span);
        wordIndex += 1;
      }

      node.parentNode?.replaceChild(fragment, node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;

    if (element.matches(SKIP_SELECTOR)) return;

    if (element.matches(BLOCK_SELECTOR)) {
      const index = wordIndex;
      const reservation = Math.max(1, countWords(element.textContent || element.getAttribute("alt") || ""));
      element.dataset.revealBlockIndex = String(index);
      hideBlock(element);
      blocks.push({ node: element, index });
      wordIndex += reservation;
      return;
    }

    for (const child of Array.from(element.childNodes)) {
      process(child);
    }
  }

  for (const child of Array.from(root.childNodes)) {
    process(child);
  }

  return { words, blocks } satisfies PreparedNodes;
}

export function ScrollWordReader({ html, nextHref, nextLabel }: ScrollWordReaderProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const preparedRef = useRef<PreparedNodes>({ words: [], blocks: [] });
  const pagesRef = useRef<PageDefinition[]>([]);
  const currentPageIndexRef = useRef(0);
  const revealedCountRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const pendingDirectionRef = useRef<1 | -1>(1);
  const transitioningRef = useRef(false);
  const autoplayRemainderRef = useRef(0);
  const [pages, setPages] = useState<PageDefinition[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [wpm, setWpm] = useState(readStoredWpm);
  const prefersReducedMotion = useReducedMotion();

  const totalWords = pages.reduce((sum, page) => sum + page.wordCount, 0);

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    revealedCountRef.current = revealedCount;
  }, [revealedCount]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      setViewportVersion((version) => version + 1);
    });

    observer.observe(viewport);

    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        setViewportVersion((version) => version + 1);
      });
    }

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const sizer = sizerRef.current;

    if (!viewport || !sizer || viewport.clientHeight === 0) return;

    const nextPages = buildPages(html, viewport, sizer);
    pagesRef.current = nextPages;
    setPages(nextPages);
    autoplayRemainderRef.current = 0;
    startTransition(() => {
      setCurrentPageIndex(0);
      setRevealedCount(0);
    });
  }, [html, viewportVersion]);

  useEffect(() => {
    const article = articleRef.current;
    const stage = stageRef.current;
    const page = pages[currentPageIndex];

    if (!article || !page) return;

    article.innerHTML = page.html;
    const prepared = prepareAnimatedContent(article);
    preparedRef.current = prepared;
    transitioningRef.current = false;

    for (const word of prepared.words) {
      hideWord(word);
    }

    for (const block of prepared.blocks) {
      hideBlock(block.node);
    }

    if (stage) {
      stage.style.opacity = "0";
      stage.style.transform = `translateY(${pendingDirectionRef.current > 0 ? "16px" : "-16px"})`;
      animate(
        stage,
        { opacity: 1, transform: "translateY(0px)" },
        { duration: prefersReducedMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }
      );
    }
  }, [currentPageIndex, pages, prefersReducedMotion]);

  useEffect(() => {
    const page = pages[currentPageIndex];
    if (!page) return;

    const nextCount = clamp(Math.floor(revealedCount), 0, page.wordCount);
    const prepared = preparedRef.current;

    for (let index = 0; index < prepared.words.length; index += 1) {
      const word = prepared.words[index];
      if (!word) continue;

      if (index < nextCount) {
        showWord(word, Boolean(prefersReducedMotion));
      } else {
        hideWord(word);
      }
    }

    for (const block of prepared.blocks) {
      if (block.index < nextCount) {
        showBlock(block.node, Boolean(prefersReducedMotion));
      } else {
        hideBlock(block.node);
      }
    }
  }, [currentPageIndex, pages, prefersReducedMotion, revealedCount]);

  const transitionToPage = useEffectEvent(async (targetPageIndex: number, targetReveal: number, direction: 1 | -1) => {
    const stage = stageRef.current;
    const targetPage = pagesRef.current[targetPageIndex];

    if (!targetPage || transitioningRef.current) return;

    transitioningRef.current = true;
    pendingDirectionRef.current = direction;

    if (stage && !prefersReducedMotion) {
      await animate(
        stage,
        { opacity: 0, transform: `translateY(${direction > 0 ? "-18px" : "18px"})` },
        { duration: 0.18, ease: [0.64, 0, 0.78, 0] }
      ).finished;
    }

    startTransition(() => {
      setCurrentPageIndex(targetPageIndex);
      setRevealedCount(clamp(targetReveal, 0, targetPage.wordCount));
    });
  });

  const applyStepDelta = useEffectEvent((stepDelta: number) => {
    const currentPages = pagesRef.current;
    if (currentPages.length === 0 || stepDelta === 0 || transitioningRef.current) return;

    const pageIndex = currentPageIndexRef.current;
    const page = currentPages[pageIndex];
    const currentReveal = revealedCountRef.current;

    if (!page) return;

    if (stepDelta > 0) {
      const nextReveal = clamp(currentReveal + stepDelta, 0, page.wordCount);

      if (nextReveal < page.wordCount || pageIndex === currentPages.length - 1) {
        startTransition(() => setRevealedCount(nextReveal));
        return;
      }

      const overflow = Math.max(0, stepDelta - (page.wordCount - currentReveal));
      const nextPageIndex = pageIndex + 1;
      const nextPage = currentPages[nextPageIndex];
      transitionToPage(nextPageIndex, clamp(overflow, 0, nextPage.wordCount), 1);
      return;
    }

    const nextReveal = clamp(currentReveal + stepDelta, 0, page.wordCount);

    if (nextReveal > 0 || pageIndex === 0) {
      startTransition(() => setRevealedCount(nextReveal));
      return;
    }

    const previousPageIndex = pageIndex - 1;
    const previousPage = currentPages[previousPageIndex];
    const overflow = Math.abs(stepDelta) - currentReveal;
    const targetReveal = clamp(previousPage.wordCount - overflow, 0, previousPage.wordCount);
    transitionToPage(previousPageIndex, targetReveal, -1);
  });

  const handlePointerDelta = useEffectEvent((delta: number) => {
    const steps = delta > 0 ? Math.max(1, Math.round(delta / 28)) : Math.min(-1, Math.round(delta / 28));
    applyStepDelta(steps);
  });

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      handlePointerDelta(event.deltaY);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        applyStepDelta(14);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        applyStepDelta(-14);
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        applyStepDelta(event.shiftKey ? -24 : 24);
      }

      if (event.key === "Home") {
        event.preventDefault();
        startTransition(() => {
          setCurrentPageIndex(0);
          setRevealedCount(0);
        });
      }

      if (event.key === "End") {
        const lastPageIndex = pagesRef.current.length - 1;
        const lastPage = pagesRef.current[lastPageIndex];
        if (!lastPage) return;

        event.preventDefault();
        startTransition(() => {
          setCurrentPageIndex(lastPageIndex);
          setRevealedCount(lastPage.wordCount);
        });
      }
    }

    function onTouchStart(event: TouchEvent) {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event: TouchEvent) {
      if (touchStartYRef.current == null) return;
      const currentY = event.touches[0]?.clientY;
      if (typeof currentY !== "number") return;
      event.preventDefault();
      handlePointerDelta(touchStartYRef.current - currentY);
      touchStartYRef.current = currentY;
    }

    function onTouchEnd() {
      touchStartYRef.current = null;
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const wordsBeforeCurrentPage = pages
    .slice(0, currentPageIndex)
    .reduce((sum, page) => sum + page.wordCount, 0);
  const progress = totalWords > 0 ? (wordsBeforeCurrentPage + revealedCount) / totalWords : 0;
  const pageCount = pages.length;
  const isComplete =
    pageCount > 0 &&
    currentPageIndex === pageCount - 1 &&
    revealedCount >= (pages[currentPageIndex]?.wordCount ?? 0);
  const isAutoScrollActive = autoScroll && !isComplete;

  useEffect(() => {
    if (!isAutoScrollActive || pageCount === 0) return;

    const intervalMs = 100;
    const timer = window.setInterval(() => {
      if (transitioningRef.current) return;

      autoplayRemainderRef.current += (wpm / 60) * (intervalMs / 1000);
      const nextSteps = Math.floor(autoplayRemainderRef.current);

      if (nextSteps <= 0) return;

      autoplayRemainderRef.current -= nextSteps;
      applyStepDelta(nextSteps);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isAutoScrollActive, pageCount, wpm]);

  return (
    <section className="scroll-word-shell min-h-0 flex-1">
      <div className="reader-toolbar">
        <div className="reader-toolbar-group">
          <button
            type="button"
            onClick={() => {
              autoplayRemainderRef.current = 0;
              setAutoScroll((current) => !current);
            }}
            aria-label={isAutoScrollActive ? "Pause auto scroll" : "Start auto scroll"}
            className="icon-button icon-button-primary"
          >
            <SymbolIcon name={isAutoScrollActive ? "pause" : "play_arrow"} className="icon-button-glyph" />
          </button>
          <span className="reader-toolbar-label">
            {isAutoScrollActive ? "Auto-reading" : "Scroll to reveal"}
          </span>
        </div>

        <div className="reader-toolbar-group">
          <label className="slider-control">
            <span className="slider-control-icon" aria-hidden="true">
              <SymbolIcon name="speed" className="icon-button-glyph" />
            </span>
            <input
              type="range"
              min="60"
              max="320"
              step="10"
              value={wpm}
              onChange={(event) => {
                autoplayRemainderRef.current = 0;
                const nextWpm = Number(event.target.value);
                setWpm(nextWpm);
                window.localStorage.setItem(WPM_STORAGE_KEY, String(nextWpm));
              }}
              className="reader-wpm-slider"
              aria-label="Words per minute"
            />
            <span className="slider-control-value">{wpm}</span>
          </label>
          <span className="reader-toolbar-page">
            {pageCount > 0 ? `${currentPageIndex + 1} / ${pageCount}` : "—"}
          </span>
        </div>
      </div>

      <div className="scroll-word-progress" aria-hidden="true">
        <div className="scroll-word-progress-bar" style={{ transform: `scaleX(${progress || 0})` }} />
      </div>

      <div ref={viewportRef} className="scroll-word-viewport mt-6">
        <div ref={stageRef} className="scroll-word-stage">
          <article ref={articleRef} className="prose-archive scroll-word-prose scroll-word-page" />
        </div>
        <div ref={sizerRef} className="scroll-word-sizer" aria-hidden="true" />
      </div>

      {nextHref && nextLabel ? (
        <div className={`reader-next ${isComplete ? "reader-next-visible" : ""}`}>
          <Link href={nextHref} className="reader-next-link" aria-label={`Next: ${nextLabel}`}>
            <span className="reader-next-label">
              <span className="reader-next-eyebrow">Next</span>
              <span className="reader-next-title">{nextLabel}</span>
            </span>
            <span className="reader-next-arrow" aria-hidden="true">
              <SymbolIcon name="arrow_forward" className="icon-button-glyph" />
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
