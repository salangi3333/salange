// [공통 다크 PDF 쪽 나눔기] Chromium(page.evaluate)에서 실행하는 문자열 스크립트.
// .flow 안의 블록(제목/문단/근거 묶음)을 글자 변경 없이 순서대로 .page(390×844 고정)에 담는다.
//  - 글꼴(400/600/700)을 모두 불러온 뒤에 잰다.
//  - data-keep 블록(소제목)은 바로 다음 블록과 같은 쪽에 둔다. 다음 문단이 안 들어가면 그 문단을
//    단어 경계에서 나눠 앞쪽에 최소 2줄, 뒤쪽에 최소 2줄이 남게 한다(한 줄만 남는 쪽을 피함).
//  - 근거 묶음(.grp)은 통째로 넘기되, 현재 쪽 아래 빈 공간이 220px 이상 남는 경우에만 본문 문단을 위 규칙으로 나눈다.
//  - [2026-09-30] 본문 페이지 상단에 자동으로 붙던 장 라벨(.lab)은 더 이상 만들지 않는다(반복해서
//    나타나며 읽는 흐름을 끊는다는 피드백에 따라 제거). 장 시작 히어로/인용 페이지 자체의 라벨(각
//    컴포넌트가 JSX로 직접 그리는 것)은 이 파일과 무관해 그대로 남는다.
// 반환값: { pages, overflow[], splits } — overflow가 비어 있어야 정상.
export const PAGINATE_DARK_JS = `(async () => {
  // .flow는 화면에 안 그려져 굵은 글꼴이 아직 안 불러졌을 수 있으므로, 쓰는 굵기를 먼저 모두 불러온 뒤 잰다.
  await Promise.all([400, 600, 700].map((w) => document.fonts.load(w + ' 18px "Noto Serif KR"', '가나다')));
  await document.fonts.ready;
  const log = { pages: 0, overflow: [], splits: 0 };
  // data-cont 흐름은 바로 앞 형제 .flow가 있으면 그 뒤에 이어 붙인다(쪽을 억지로 새로 시작하지 않음).
  Array.from(document.querySelectorAll('.flow[data-cont]')).forEach((fl) => {
    const prev = fl.previousElementSibling;
    if (prev && prev.classList.contains('flow')) { while (fl.firstChild) prev.appendChild(fl.firstChild); fl.remove(); }
  });
  const flows = Array.from(document.querySelectorAll('.flow'));
  const GAP_MIN = 220;
  const fits = (p) => p.scrollHeight <= p.clientHeight + 1;
  const lineH = (el) => parseFloat(getComputedStyle(el).lineHeight) || 32.4;
  const nLines = (el) => Math.round(el.getBoundingClientRect().height / lineH(el));
  for (const flow of flows) {
    const label = flow.getAttribute('data-label') || '';
    const blocks = Array.from(flow.children);
    const units = [];
    for (let i = 0; i < blocks.length; i++) {
      const u = [blocks[i]];
      while (blocks[i].hasAttribute('data-keep') && i + 1 < blocks.length) { i++; u.push(blocks[i]); if (!blocks[i].hasAttribute('data-keep')) break; }
      units.push(u);
    }
    const mk = () => {
      const p = document.createElement('section'); p.className = 'page';
      flow.parentNode.insertBefore(p, flow); log.pages++; return p;
    };
    let cur = mk();
    const isFresh = () => cur.children.length === 0;
    const place = (unit, guard) => {
      unit.forEach((e) => cur.appendChild(e));
      if (fits(cur)) return;
      unit.forEach((e) => cur.removeChild(e));
      const last = unit[unit.length - 1];
      // 근거 묶음(.grp)은 원래 통째로 넘기지만, 현재 쪽 아래에 큰 빈 공간(GAP_MIN 이상)이 생기는 경우에만
      // 그 묶음의 본문 문단을 다른 문단과 같은 방식(단어 경계, 앞뒤 최소 2줄)으로 나눈다. 명리 근거는 항상 본문 끝쪽과 함께 간다.
      if (last.classList && last.classList.contains('grp') && last.children.length >= 2 && !isFresh()) {
        const kids = Array.from(last.children);
        const gp = kids[1], basisEl = kids[2] || null;
        const lastKid = cur.children[cur.children.length - 1];
        const used = lastKid.getBoundingClientRect().bottom - cur.getBoundingClientRect().top;
        const space = cur.clientHeight - 40 - used;
        if (gp.tagName === 'P' && space >= GAP_MIN) {
          const words = gp.textContent.split(' ');
          if (basisEl) last.removeChild(basisEl);
          unit.forEach((e) => cur.appendChild(e));
          let lo = 0, hi = words.length - 1;
          while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); gp.textContent = words.slice(0, mid).join(' '); if (fits(cur)) lo = mid; else hi = mid - 1; }
          let k = lo; gp.textContent = words.slice(0, k).join(' ');
          let ok = k > 0 && nLines(gp) >= 2;
          let tp = null, g2 = null, p2 = null;
          if (ok) {
            tp = mk(); g2 = document.createElement('div'); g2.className = last.className + ' cont';
            p2 = document.createElement('p'); p2.textContent = words.slice(k).join(' '); g2.appendChild(p2);
            if (basisEl) g2.appendChild(basisEl); tp.appendChild(g2);
            while (nLines(p2) < 2 && k > 1) { k--; gp.textContent = words.slice(0, k).join(' '); p2.textContent = words.slice(k).join(' '); if (nLines(gp) < 2) break; }
            ok = nLines(gp) >= 2 && nLines(p2) >= 2 && fits(cur) && fits(tp);
          }
          if (ok) { log.splits++; log.groupSplits = (log.groupSplits || 0) + 1; cur = tp; return; }
          if (tp) { tp.remove(); log.pages--; }
          gp.textContent = words.join(' ');
          if (basisEl) last.appendChild(basisEl);
          unit.forEach((e) => cur.removeChild(e));
        }
      }
      if (last.tagName === 'P' && last.textContent.split(' ').length > 6) {
        const head = unit.slice(0, -1);
        const words = last.textContent.split(' ');
        head.forEach((e) => cur.appendChild(e)); cur.appendChild(last);
        let lo = 0, hi = words.length - 1;
        while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); last.textContent = words.slice(0, mid).join(' '); if (fits(cur)) lo = mid; else hi = mid - 1; }
        let k = lo;
        last.textContent = words.slice(0, k).join(' ');
        let ok = k > 0 && nLines(last) >= 2;
        let tp = null, rest = null;
        if (ok) {
          tp = mk(); rest = document.createElement('p'); rest.className = last.className + ' cont'; tp.appendChild(rest);
          rest.textContent = words.slice(k).join(' ');
          while (nLines(rest) < 2 && k > 1) { k--; last.textContent = words.slice(0, k).join(' '); rest.textContent = words.slice(k).join(' '); if (nLines(last) < 2) break; }
          ok = nLines(last) >= 2 && nLines(rest) >= 2 && fits(cur);
        }
        if (ok) {
          tp.removeChild(rest); cur = tp; log.splits++;
          place([rest], guard);
          return;
        }
        if (tp) { tp.remove(); log.pages--; }
        last.textContent = words.join(' ');
        cur.removeChild(last); head.forEach((e) => cur.removeChild(e));
      }
      if (!isFresh()) { cur = mk(); place(unit, guard + 1); return; }
      unit.forEach((e) => cur.appendChild(e));
      if (!fits(cur)) log.overflow.push(label + ' : ' + (last.textContent || '').slice(0, 30));
    };
    for (const u of units) place(u, 0);
    flow.remove();
  }
  const pages = Array.from(document.querySelectorAll('.page'));
  pages.forEach((p, i) => { if (p.scrollHeight > p.clientHeight + 1) log.overflow.push('page ' + (i + 1)); });
  return log;
})()`;
