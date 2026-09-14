/**
 * Contoh kata sederhana untuk halaman detail huruf.
 *
 * Satu kata per huruf dasar hiragana, dipilih dari kosakata pemula dan
 * mengandung huruf yang bersangkutan. Huruf yang belum punya contoh
 * (katakana, dakuten, yōon) tidak menampilkan bagian ini.
 */

export interface ExampleWord {
  /** Kata dalam tulisan Jepang. */
  jp: string
  romaji: string
  /** Artinya dalam Bahasa Indonesia. */
  id: string
}

const EXAMPLES: Record<string, ExampleWord[]> = {
  あ: [{ jp: 'あめ', romaji: 'ame', id: 'hujan' }],
  い: [{ jp: 'いえ', romaji: 'ie', id: 'rumah' }],
  う: [{ jp: 'うみ', romaji: 'umi', id: 'laut' }],
  え: [{ jp: 'えき', romaji: 'eki', id: 'stasiun' }],
  お: [{ jp: 'おかね', romaji: 'okane', id: 'uang' }],

  か: [{ jp: 'かさ', romaji: 'kasa', id: 'payung' }],
  き: [{ jp: 'きって', romaji: 'kitte', id: 'perangko' }],
  く: [{ jp: 'くつ', romaji: 'kutsu', id: 'sepatu' }],
  け: [{ jp: 'けさ', romaji: 'kesa', id: 'pagi ini' }],
  こ: [{ jp: 'こども', romaji: 'kodomo', id: 'anak' }],

  さ: [{ jp: 'さかな', romaji: 'sakana', id: 'ikan' }],
  し: [{ jp: 'しごと', romaji: 'shigoto', id: 'pekerjaan' }],
  す: [{ jp: 'すいか', romaji: 'suika', id: 'semangka' }],
  せ: [{ jp: 'せんせい', romaji: 'sensei', id: 'guru' }],
  そ: [{ jp: 'そら', romaji: 'sora', id: 'langit' }],

  た: [{ jp: 'たまご', romaji: 'tamago', id: 'telur' }],
  ち: [{ jp: 'ちず', romaji: 'chizu', id: 'peta' }],
  つ: [{ jp: 'つくえ', romaji: 'tsukue', id: 'meja' }],
  て: [{ jp: 'てがみ', romaji: 'tegami', id: 'surat' }],
  と: [{ jp: 'とけい', romaji: 'tokei', id: 'jam' }],

  な: [{ jp: 'なつ', romaji: 'natsu', id: 'musim panas' }],
  に: [{ jp: 'にく', romaji: 'niku', id: 'daging' }],
  ぬ: [{ jp: 'ぬの', romaji: 'nuno', id: 'kain' }],
  ね: [{ jp: 'ねこ', romaji: 'neko', id: 'kucing' }],
  の: [{ jp: 'のみもの', romaji: 'nomimono', id: 'minuman' }],

  は: [{ jp: 'はな', romaji: 'hana', id: 'bunga' }],
  ひ: [{ jp: 'ひと', romaji: 'hito', id: 'orang' }],
  ふ: [{ jp: 'ふゆ', romaji: 'fuyu', id: 'musim dingin' }],
  へ: [{ jp: 'へや', romaji: 'heya', id: 'kamar' }],
  ほ: [{ jp: 'ほん', romaji: 'hon', id: 'buku' }],

  ま: [{ jp: 'まど', romaji: 'mado', id: 'jendela' }],
  み: [{ jp: 'みず', romaji: 'mizu', id: 'air' }],
  む: [{ jp: 'むし', romaji: 'mushi', id: 'serangga' }],
  め: [{ jp: 'めがね', romaji: 'megane', id: 'kacamata' }],
  も: [{ jp: 'もり', romaji: 'mori', id: 'hutan' }],

  や: [{ jp: 'やま', romaji: 'yama', id: 'gunung' }],
  ゆ: [{ jp: 'ゆき', romaji: 'yuki', id: 'salju' }],
  よ: [{ jp: 'よる', romaji: 'yoru', id: 'malam' }],

  ら: [{ jp: 'らいねん', romaji: 'rainen', id: 'tahun depan' }],
  り: [{ jp: 'りんご', romaji: 'ringo', id: 'apel' }],
  る: [{ jp: 'るす', romaji: 'rusu', id: 'sedang tidak di rumah' }],
  れ: [{ jp: 'れきし', romaji: 'rekishi', id: 'sejarah' }],
  ろ: [{ jp: 'ろく', romaji: 'roku', id: 'enam' }],

  わ: [{ jp: 'わたし', romaji: 'watashi', id: 'saya' }],
  // を hampir selalu muncul sebagai partikel penanda objek, bukan di dalam kata.
  を: [{ jp: 'ほんをよむ', romaji: 'hon o yomu', id: 'membaca buku' }],
  ん: [{ jp: 'にほん', romaji: 'nihon', id: 'Jepang' }],
}

export function examplesFor(char: string): ExampleWord[] {
  return EXAMPLES[char] ?? []
}
