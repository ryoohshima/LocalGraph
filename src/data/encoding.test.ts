import { expect, it } from "vitest";
import { decodeText } from "./encoding";

const bytes = (...values: number[]) => new Uint8Array(values);

it("UTF-8 を BOM の有無によらずデコードする", () => {
  const body = [
    0xe6, 0x97, 0xa5, 0xe4, 0xbb, 0x98, 0x2c, 0xe9, 0x87, 0x91, 0xe9, 0xa1,
    0x8d,
  ];

  expect(decodeText(bytes(...body))).toBe("日付,金額");
  expect(decodeText(bytes(0xef, 0xbb, 0xbf, ...body))).toBe("日付,金額");
});

it("UTF-8 として読めないバイト列は CP932 とみなす", () => {
  expect(
    decodeText(bytes(0x93, 0xfa, 0x95, 0x74, 0x2c, 0x8b, 0xe0, 0x8a, 0x7a)),
  ).toBe("日付,金額");
  // 半角カナ。銀行 CSV の摘要欄で頻出する
  expect(decodeText(bytes(0xb1, 0xb2, 0xb3))).toBe("ｱｲｳ");
});

it("ASCII のみならどちらの解釈でも同じ結果になる", () => {
  expect(
    decodeText(bytes(0x64, 0x61, 0x74, 0x65, 0x2c, 0x31, 0x30, 0x30)),
  ).toBe("date,100");
});
