"use client";

/** Persian digit helpers — UI numbers become ۰-۹ in fa, technical fields stay Latin. */

const FA = "۰۱۲۳۴۵۶۷۸۹";

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

/** Only convert when the active language is fa. */
export function num(input: string | number, lang: "fa" | "en"): string {
  return lang === "fa" ? toFa(input) : String(input);
}
