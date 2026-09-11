# pdf-assets-fonts — 출처/라이선스 (2026-09-11 추가)

평생운명록(book) PDF 전용 폰트. 고객 웹사이트 전역 폰트와 무관하며,
`lib/pdfBookFonts.ts`를 통해서만 읽힌다(PDF 생성 경로 전용).

## 출처
- 폰트: Google Fonts 공식 배포 저장소(github.com/google/fonts) `ofl/notoserifkr/NotoSerifKR[wght].ttf`
  (variable font, 2026-09-11 다운로드, sha256:
  11f8d5de6f1b79195efba3828aaa2ec95c1178f5ae976fb23c8d53250a9938f3)
- 여기서 실제 PDF가 쓰는 weight(400/600/700)만 `fonttools varLib.instancer`로
  정적 인스턴스 추출 → `fonttools`로 woff2 변환. 글립(문자) 범위는 축소하지
  않았다(고객 이름에 임의의 한글 음절/한자가 올 수 있어 전체 글립을 유지).

## 라이선스
SIL Open Font License 1.1 (OFL.txt 동봉). 임베딩/서브셋/재배포 허용.
Copyright 2012 Google Inc.
