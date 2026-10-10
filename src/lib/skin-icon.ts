import { useEffect, useState } from "react";
import promo from "@/assets/brand-promo.svg?no-inline";
import royal from "@/assets/brand-royal.svg?no-inline";
import retro from "@/assets/brand-retro.svg?no-inline";
import defaultMarkup from "@/assets/brand-promo.svg?raw";

const icons: Record<string, string> = { promo, neon: royal, retro };
const normalize = (markup: string) => markup.replace(/\r/g, "").trim();

/** The Hub serves uploaded site icons at /favicon.svg. Only replace our own
 * default artwork; unknown/custom icons and failed checks keep the Hub URL. */
export function useSkinIcon(variant: string) {
  const [usesDefault, setUsesDefault] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/favicon.svg", { signal: controller.signal, cache: "no-cache" })
      .then(async response => response.ok ? response.text() : "")
      .then(markup => {
        if (!controller.signal.aborted) setUsesDefault(normalize(markup) === normalize(defaultMarkup));
      })
      .catch(() => { /* Preserve the site's icon when its source is unavailable. */ });
    return () => controller.abort();
  }, []);
  const icon = usesDefault ? (icons[variant] || promo) : "/favicon.svg";
  useEffect(() => {
    if (usesDefault) document.querySelector('link[rel="icon"]')?.setAttribute("href", icon);
  }, [usesDefault, icon]);
  return icon;
}
