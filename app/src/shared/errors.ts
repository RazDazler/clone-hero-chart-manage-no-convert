/**
 * Práce s chybami typu `unknown` — JEDEN zdroj pravdy sdílený main i rendererem.
 *
 * `catch (e)` má v TS typ `unknown`, takže na každém místě, kde chceme text nebo
 * skutečný `Error`, se opakoval tentýž ternární výraz. Tady je jednou; volání pak
 * čte líp a nemůže se rozejít (dřív žilo 25× po codebase).
 */

/** Bezpečně vytáhne lidsky čitelný text z chycené chyby. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Zaručí `Error` instanci — hodí se před `reject(...)` / `throw ...`, kde chceme
 *  vždy pořádný Error (se stackem), i když nám přišlo něco jiného. */
export function asError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}
