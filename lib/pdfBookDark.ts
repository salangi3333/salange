// [공통 다크 럭셔리 PDF 스타일] 승인·잠금된 1장 다크 럭셔리 디자인(scripts/_scratch_ch1_v3_render.ts의 CSS)을 그대로 옮긴 것.
// 바꾼 것: (1) 폰트 선언은 파일 경로 방식 대신 상품 PDF의 기존 임베딩(pdfBookFonts.ts, "Noto Serif KR")을 쓴다.
//         (2) 흘러가는 긴 글을 .page에 담기 위한 최소 추가 규칙(DARK_FLOW_CSS)만 덧붙였다.
import { buildNotoSerifKrFontFaceCss } from "./pdfBookFonts";

export const DARK_LOCKED_CSS = `
@page{size:390px 844px;margin:0}
:root{--bg:#14100C;--ivory:#F0E7D4;--mute:#B7AB93;--dim:#8C8168;--bronze:#B8925A;--gold:#D6B173;--rose:#E08A70;
 --fire:#D0624A;--water:#6E8FC9;--wood:#6FAE8B;--earth:#CDAA55;--metal:#AEB3BC}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:"Noto Serif KR",serif;color:var(--ivory);background:var(--bg);word-break:keep-all;overflow-wrap:break-word;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:390px;height:844px;padding:54px 28px 40px;position:relative;overflow:hidden;page-break-after:always;display:flex;flex-direction:column;
 background:radial-gradient(120% 60% at 85% -5%,rgba(184,146,90,.16),rgba(184,146,90,0) 60%),radial-gradient(90% 50% at 0% 100%,rgba(120,60,40,.13),rgba(120,60,40,0) 65%),linear-gradient(180deg,#17120E 0%,#110D0A 100%)}
.page:last-child{page-break-after:auto}
.lab{font-size:14px;font-weight:600;letter-spacing:.14em;color:var(--bronze)}
.q{font-size:20px;line-height:1.5;color:var(--mute);margin:14px 0 6px}
.title{font-size:34px;line-height:1.3;font-weight:700;color:var(--gold);letter-spacing:-.02em;margin:8px 0 16px}
.rule{width:56px;height:2px;background:var(--bronze);margin:0 0 18px}
.lead{font-size:23px;line-height:1.5;font-weight:700;color:var(--ivory);margin-bottom:18px}
p{font-size:18px;line-height:1.8;color:var(--ivory);margin-bottom:14px}
.g{color:var(--gold);font-weight:700}
.item{margin-bottom:20px}.item .lab{display:block;margin-bottom:5px}
.item p{font-size:20px;line-height:1.7;margin:0;font-weight:600}
.basis{margin-top:auto;padding-top:14px;border-top:1px solid rgba(184,146,90,.4)}
.basis .lab{font-size:12px;display:block;margin-bottom:6px}
.basis p{font-size:16px;line-height:1.65;color:var(--mute);margin:0}
.hero{font-size:44px;line-height:1.25;font-weight:700;color:var(--gold);margin:18px 0 8px;letter-spacing:-.02em}
.glyph{font-size:120px;line-height:1;font-weight:700;color:var(--gold);margin:14px 0 4px;text-shadow:0 0 40px rgba(214,177,115,.35)}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);text-align:center;margin:8px 0 6px}
.pgrid .h{font-size:14px;color:var(--dim);font-weight:600;padding-bottom:8px}
.pgrid .c{padding:8px 0 10px;border-top:1px solid rgba(184,146,90,.25)}
.pgrid .gl{font-size:46px;line-height:1.1;font-weight:700;display:block}
.pgrid .sp{font-size:15px;color:var(--mute);display:block;margin-top:2px;font-weight:600}
.pgrid .me .gl{border-bottom:3px solid var(--gold);display:inline-block;padding:0 6px 2px}
.el{display:flex;align-items:center;gap:10px;margin:10px 0 0}
.el .gl{flex:0 0 30px;font-size:26px;font-weight:700;text-align:center;line-height:1}
.el .nm{flex:0 0 46px;font-size:18px;font-weight:700}
.el .tr{flex:1;height:10px;background:rgba(240,231,212,.10)}.el .fl{height:100%;background:var(--bronze)}
.el.top .fl{background:var(--gold)}
.el .pc{flex:0 0 46px;text-align:right;font-size:18px;font-weight:700}
.mean{font-size:15px;color:var(--mute);margin:0 0 0 40px;line-height:1.5}
.pill{display:block;margin:0 0 12px;font-size:21px;line-height:1.5;font-weight:700;color:var(--ivory);padding-left:16px;position:relative}
.pill:before{content:"";position:absolute;left:0;top:.62em;width:8px;height:2px;background:var(--gold)}
.ghead{display:flex;align-items:center;gap:14px;margin:0 0 12px}
.ghead .gt{font-size:22px;font-weight:700;letter-spacing:.08em;color:var(--gold)}
.ghead:after{content:"";flex:1;height:1px;background:rgba(214,177,115,.45)}
.ghead.warn .gt{color:var(--rose)}
.ghead.warn:after{background:rgba(224,138,112,.5)}
.grp+.grp{margin-top:24px}
.pill.warn{font-size:19.5px;font-weight:600}
.pill.warn:before{background:var(--rose)}
`;

export const DARK_FLOW_CSS = `
/* ── 공통 쪽 나눔 구조용 추가(새 디자인 아님: 잠긴 값을 그대로 재사용, 흘러가는 글을 쪽에 담기 위한 최소 규칙) ── */
.page > *{flex:none}
.flow{display:none}
.page .head .title{margin:26px 0 16px}
.page .lab + .head .title{margin-top:14px}
.page .lab + .blk{margin-top:12px}
/* 명리 근거 영역(위계: 장 제목 > 내용 소제목 34px > 본문 18px > 명리 근거) — 소제목보다 작고 약하게 */
.mini{font-size:22px;line-height:1.3;font-weight:600;color:var(--bronze);letter-spacing:.04em;margin:26px 0 8px;break-after:avoid}
.page .lab + .head .mini{margin-top:14px}
.hair{height:1px;background:rgba(184,146,90,.22);margin:0 0 14px}
.sub{font-size:20px;line-height:1.35;font-weight:700;color:var(--bronze);letter-spacing:.01em;margin:0 0 8px}
.grp .basis{border-top:1px solid rgba(184,146,90,.2)}
.grp .basis .lab{color:#A0957D}
.grp .basis p{color:#A0957D}
.grp{margin-bottom:22px}
.grp p{margin-bottom:0}
.grp .basis{margin-top:14px;padding-top:12px}
.intro{font-size:16px;line-height:1.7;color:var(--mute);margin-bottom:22px}
.title,.sub{text-wrap:balance}
.cont{margin-top:0}

/* ── 1~5장 적용용(잠긴 토큰 재사용): 장 표지/인용구 쪽, 데이터 요소·색 태그의 다크 표현 ── */
.sub2{font-size:26px;line-height:1.35;font-weight:700;color:var(--gold);letter-spacing:-.01em;margin:22px 0 10px;text-wrap:balance}
.page .lab + .head2 .sub2{margin-top:14px}
.kick{font-size:14px;font-weight:600;letter-spacing:.14em;color:var(--bronze);margin-top:30px;margin-bottom:2px}
.blk.lead{margin-bottom:18px}
.dd{margin-top:8px;margin-bottom:0}
.item.blk{margin-bottom:20px}
.grp2{margin-bottom:22px}
.pgrid .sp2{font-size:14px;color:var(--gold);display:block;margin-top:2px;font-weight:600}
.el .chip{display:block;width:14px;height:14px;border-radius:50%;margin:0 auto}
.wstrip{display:flex;gap:4px;margin:6px 0 14px}
.wstrip i{flex:1;height:10px;display:block}
.wstrip i.cur{outline:1px solid var(--gold);outline-offset:2px}
.ph{display:flex;gap:16px;align-items:baseline;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(184,146,90,.18)}
.ph .a{flex:0 0 108px;font-size:24px;font-weight:700;color:var(--bronze);line-height:1.2}
.ph .a small{display:block;font-size:13px;color:var(--dim);font-weight:600;letter-spacing:.06em;margin-top:2px}
.ph .t{font-size:18px;line-height:1.6;color:var(--ivory)}
.ph.now .a,.ph.now .a small{color:var(--gold)}
.ph.now .t{font-weight:700}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:var(--mute);margin:4px 0 18px}
.pg-hero,.pg-quote{padding:0;display:block}
.pg-hero .himg,.pg-quote .qimg{position:relative;overflow:hidden}
.pg-hero .himg{height:500px}
.pg-quote .qimg{height:430px}
.pg-hero .himg img,.pg-quote .qimg img{width:100%;height:100%;object-fit:cover;display:block}
.pg-hero .himg:after,.pg-quote .qimg:after{content:"";position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(180deg,rgba(21,17,13,0) 0%,#15110D 100%)}
.pg-hero .hbody{padding:0 28px;margin-top:-26px;position:relative}
.pg-quote .qbody{padding:0 28px;margin-top:-8px;position:relative}
.qmark{display:block;font-size:64px;line-height:1;color:var(--gold);font-weight:700;margin-bottom:6px}
.qtext{font-size:24px;line-height:1.55;font-weight:700;color:var(--ivory);margin:8px 0 0}
.pg-qplain{justify-content:center;padding-top:54px}
.basisline{font-size:16px;line-height:1.65;color:#A0957D;margin-bottom:12px}
`;

/** 다크 상품 PDF용 HTML 조립 — bodyHtml 안의 .flow 구간은 lib/pdfBookPaginate.ts가 .page로 나눈다. */
export function renderDarkBookHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${buildNotoSerifKrFontFaceCss()}
${DARK_LOCKED_CSS}${DARK_FLOW_CSS}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
