import manifest from "../../theme.json"
import { api } from "@/lib/api"
import { resolveConfig } from "./config-values"

/**
 * The operator's settings over the defaults declared in theme.json, which the
 * hub does not store. A saved value of another type -- left by an older version
 * of this theme -- counts as unsaved. Any failure, a hub predating settings (404)
 * included, renders the defaults rather than an error.
 */
export function loadConfig(): Promise<Record<string, unknown>> {
  return api<unknown>(`/themes/${manifest.short}/config`)
    .then((saved) => resolveConfig(manifest.config, saved))
    .catch(() => resolveConfig(manifest.config, {}))
}
