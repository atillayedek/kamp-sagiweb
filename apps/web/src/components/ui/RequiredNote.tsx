export function RequiredNote() {
  return (
    <p className="text-sm text-ink-muted">
      <span aria-hidden="true" className="text-danger">
        *
      </span>{" "}
      ile işaretli alanlar zorunludur.
    </p>
  );
}
