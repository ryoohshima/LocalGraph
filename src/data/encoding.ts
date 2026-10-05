/**
 * CSV のバイト列を文字列へ変換する。
 *
 * UTF-8 として厳密にデコードできれば UTF-8、できなければ CP932 と見なす。
 * CP932 の日本語バイト列が偶然 UTF-8 として妥当になることはまず無く、
 * 純 ASCII はどちらで読んでも同じ結果になるため、この 2 段で足りる。
 * BOM は TextDecoder が取り除くので明示的な判定は要らない。
 *
 * ponytail: EUC-JP・UTF-16 は非対応。日本の銀行・カード会社の CSV は実質
 * UTF-8 か CP932 の 2 択ゆえ割り切る。実際に他の文字コードが持ち込まれたら判定を追加する。
 */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}
