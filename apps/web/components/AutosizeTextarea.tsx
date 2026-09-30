"use client";

import { useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { clearCache, layout, prepare } from "@chenglou/pretext";

export function AutosizeTextarea({ rows = 2, value, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastWidth = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const sync = (force = false) => {
      if (!force && element.clientWidth === lastWidth.current) return;
      lastWidth.current = element.clientWidth;
      const computed = getComputedStyle(element);
      const lineHeight = Number.parseFloat(computed.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
      const chromeX = Number.parseFloat(computed.paddingLeft) + Number.parseFloat(computed.paddingRight);
      const chromeY = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom) + Number.parseFloat(computed.borderTopWidth) + Number.parseFloat(computed.borderBottomWidth);
      const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
      const prepared = prepare(element.value || "", font, { whiteSpace: "pre-wrap", letterSpacing: Number.parseFloat(computed.letterSpacing) || 0 });
      const min = (rows ?? 2) * lineHeight;
      const max = Number.parseFloat(computed.maxHeight);
      const height = Math.min(Number.isFinite(max) ? max : Number.POSITIVE_INFINITY, Math.max(min, layout(prepared, Math.max(1, element.clientWidth - chromeX), lineHeight).height));
      element.style.height = `${Math.ceil(height + chromeY)}px`;
    };
    sync(true);
    const observer = new ResizeObserver(() => sync());
    observer.observe(element);
    void document.fonts.ready.then(() => { clearCache(); sync(true); });
    return () => observer.disconnect();
  }, [value, rows]);

  return <textarea ref={ref} rows={rows} value={value} {...rest} />;
}
