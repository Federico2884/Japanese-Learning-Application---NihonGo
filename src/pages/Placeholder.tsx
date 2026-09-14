interface PlaceholderProps {
  title: string
  description: string
}

/** Layar yang sudah ada di navigasi tetapi isinya sedang dikerjakan. */
export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <section className="card placeholder">
      <span className="placeholder__mark" lang="ja" aria-hidden="true">
        筆
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="placeholder__note">Layar ini sedang disiapkan.</span>
    </section>
  )
}
