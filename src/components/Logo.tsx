interface LogoProps {
  /** 'header' untuk logo kecil di header, 'hero' untuk logo besar di Beranda. */
  size?: 'header' | 'hero'
}

/**
 * Logo にほんGo: kana dan teks latin sejajar baseline sehingga terbaca satu kata.
 * Animasi inkSoak membuatnya seolah tinta meresap ke kertas.
 */
export function Logo({ size = 'header' }: LogoProps) {
  return (
    <span className={'logo logo--' + size}>
      <span className="logo__kana" lang="ja">
        にほん
      </span>
      <span className="logo__go">Go</span>
    </span>
  )
}
