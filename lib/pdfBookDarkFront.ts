// 표지·속표지·프롤로그·목차·엔딩·마지막 편지용 다크 스타일(잠긴 다크 토큰 재사용, 새 색 없음).
// 본문 쪽 규칙(lib/pdfBookDark.ts)은 건드리지 않고 이 파일에서만 덧붙인다.
import { buildNotoSerifKrFontFaceCss } from "./pdfBookFonts";
import { DARK_LOCKED_CSS, DARK_FLOW_CSS } from "./pdfBookDark";

export const DARK_FRONT_CSS = `
.pg-hero.tall .himg{height:600px}
.page.pg-cover,.page.pg-end,.page.pg-letter{padding:0;display:block;background:#0E0B08}
.pg-cover .cimg,.pg-end .eimg,.pg-letter .limg{position:absolute;left:0;top:0;width:100%;height:100%}
.pg-cover .cimg img,.pg-end .eimg img,.pg-letter .limg img{width:100%;height:100%;object-fit:cover;display:block}
.pg-cover .cimg:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,11,8,.82) 0%,rgba(14,11,8,0) 26%,rgba(14,11,8,0) 52%,rgba(14,11,8,.92) 82%,#0E0B08 100%)}
.pg-cover .ctop{position:absolute;left:28px;right:28px;top:52px;text-align:center}
.ceye{font-size:14px;font-weight:600;letter-spacing:.42em;color:var(--bronze);margin:0}
.cbrand{font-size:60px;line-height:1.15;font-weight:700;color:var(--gold);margin:10px 0 0;text-shadow:0 0 30px rgba(214,177,115,.3)}
.ckr{font-size:20px;letter-spacing:.5em;color:var(--ivory);margin:4px 0 0;font-weight:600}
.pg-cover .cbot{position:absolute;left:28px;right:28px;bottom:48px}
.pg-cover .ctag{font-size:18px;line-height:1.6;color:var(--mute);margin:0 0 14px}
.pg-cover .cname{font-size:30px;line-height:1.35;font-weight:700;color:var(--gold);margin:0;letter-spacing:-.01em}
.page.pg-title{justify-content:center;text-align:center}
.tbrand{font-size:84px;line-height:1.1;font-weight:700;color:var(--gold);margin:0;text-shadow:0 0 40px rgba(214,177,115,.3)}
.tkr{font-size:16px;letter-spacing:.32em;color:var(--mute);margin:8px 0 0;font-weight:600}
.ttag{font-size:17px;line-height:1.6;color:var(--mute);margin:0 0 28px}
.tname{font-size:30px;line-height:1.35;font-weight:700;color:var(--ivory);margin:0 0 34px}
.tfacts{text-align:left;border-top:1px solid rgba(184,146,90,.3)}
.tfact{padding:12px 0;border-bottom:1px solid rgba(184,146,90,.18);display:flex;flex-direction:column;gap:3px}
.tfact .lab{font-size:13px}
.tfact .tv{font-size:20px;font-weight:600;color:var(--ivory);line-height:1.4}
.page.pg-prolog{justify-content:center}
.pr{font-size:22px;line-height:1.85;color:var(--ivory);margin:0 0 24px}
.pr.pe{color:var(--gold);font-weight:700}
.pg-toc .trow{display:flex;gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px solid rgba(184,146,90,.2)}
.pg-toc .tl{flex:0 0 62px;font-size:17px;font-weight:700;color:var(--bronze);letter-spacing:.04em}
.pg-toc .tt{font-size:20px;line-height:1.5;font-weight:600;color:var(--ivory)}
.pg-end .eimg:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,11,8,.15) 0%,rgba(14,11,8,0) 30%,rgba(14,11,8,.86) 66%,#0E0B08 92%)}
.pg-end .ebody{position:absolute;left:28px;right:28px;bottom:64px;text-align:center}
.ebrand{font-size:44px;line-height:1.1;font-weight:700;color:var(--gold);margin:0}
.emsg{font-size:23px;line-height:1.6;font-weight:700;color:var(--ivory);margin:0 0 12px}
.esub{font-size:16px;line-height:1.6;color:var(--mute);margin:0}
.pg-letter .limg:after{content:"";position:absolute;inset:0;background:rgba(14,11,8,.86)}
.pg-letter .lbody{position:absolute;left:28px;right:28px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
.ltitle{font-size:30px;line-height:1.35;font-weight:700;color:var(--gold);letter-spacing:-.01em;margin:0 0 14px}
.lline{font-size:21px;line-height:1.85;color:var(--ivory);margin:0 0 20px}
`;

/** 1~7장 모바일 검수용 다크 책 전체 HTML. */
export function renderDarkFullBookHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${buildNotoSerifKrFontFaceCss()}
${DARK_LOCKED_CSS}${DARK_FLOW_CSS}${DARK_FRONT_CSS}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
