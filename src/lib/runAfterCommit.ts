/**
 * Starts `task` in the next task instead of inside the effect body, so the
 * loading state a fetch sets doesn't cause a synchronous cascading render.
 * Returns the cleanup that cancels it; pair it with the request's own abort.
 *
 *   useEffect(() => {
 *     const controller = new AbortController();
 *     const cancel = runAfterCommit(() => void load(controller.signal));
 *     return () => { cancel(); controller.abort(); };
 *   }, [load]);
 */
export function runAfterCommit(task: () => void): () => void {
  const id = setTimeout(task, 0);
  return () => clearTimeout(id);
}
