/**
 * TanStack Query keeps the last successful `data` when a background refetch
 * fails: `isError` flips to true but `data` is still the old payload. For a
 * response the server has since REFUSED (the playbook 503 for a card set
 * that crossed its max age, stocks #861) that retained payload is exactly
 * the thing that must not render. Read query data through this so an
 * errored query yields nothing, never yesterday's answer.
 */
export function dataUnlessError<T>(data: T | undefined, isError: boolean): T | undefined {
  return isError ? undefined : data;
}
