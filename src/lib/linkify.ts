const URL_RE_SPLIT = /(https?:\/\/[^\s<>"']+)/g;
const URL_RE_TEST = /^https?:\/\/[^\s<>"']+$/;

/**
 * Divide um texto qualquer nas ocorrências de URL e devolve um array de
 * strings (texto normal) e objetos { url } (pra virar link) — não usa JSX
 * aqui pra não acoplar esse arquivo a React, quem chama decide como
 * renderizar cada pedaço.
 *
 * Usa duas regex separadas (uma só pra split, outra só pra test) de
 * propósito: uma regex com flag /g mantém "lastIndex" entre chamadas de
 * .test(), então reusar a mesma instância pra split() e depois test()
 * alternaria resultado errado a cada chamada — bug clássico de regex global.
 */
export function splitTextAndLinks(text: string): Array<string | { url: string }> {
  const parts = text.split(URL_RE_SPLIT);
  return parts.filter((p) => p.length > 0).map((p) => (URL_RE_TEST.test(p) ? { url: p } : p));
}
