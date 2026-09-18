/** Brand mark — ascending dot-row + "Solyra" wordmark. */
export function Brand({ tag }: { tag?: string }) {
  return (
    <div className="brand-mark" data-testid="brand">
      <div className="dot-row">
        <i />
        <i />
        <i />
      </div>
      <span data-testid="brand-wordmark">Solyra</span>
      {tag && <small>{tag}</small>}
    </div>
  );
}
