# 버튼 애니메이션 리서치: 웹 전수 수집과 쇼트리스트

- 조사일: **2026-09-23** (모든 URL 이 날짜에 접속 확인)
- 목적: Wow Units 카탈로그를 채울 후보 발굴. 현재 유닛 3개(press · success-check · reward-burst)
- 방법: 9개 소스 클러스터 병렬 수집 → 오케스트레이터가 1차 검증·중복 제거·판정
- 규모: 9개 클러스터에서 **129건 수집 → 84건 등재** (state 31 · minimal 26 · showy 27). 중복·플랫폼 변종·비버튼 항목은 통합하거나 제외했고, 제외 사유는 4장에 남겼다
- 기록 규칙: 인기 수치는 **화면에 보이는 것만** 적었다. 안 보이면 `unknown`. 추정치 없음.
  타이밍도 마찬가지로 **출처가 공개한 값만** 적고, 내 추정은 `(추정)`으로 표시했다.

## 오케스트레이터 1차 검증 기록

서브에이전트 보고 중 **판정에 직접 영향을 주는 것**은 내가 원본에서 다시 확인했다.

| 검증 항목 | 방법 | 결과 |
|---|---|---|
| motion.dev 카테고리 전수 | 브라우저에서 각 카테고리 직접 열람 | Buttons = 15 entries = **6 concepts**. 452 패턴 중 버튼 3.3% |
| MotionScore의 의미 | 사이트 툴팁 원문 | **렌더 비용 등급**이지 인기 지표가 아님 ("an S-to-F grade based on its animation render cost") |
| Apple 햅틱 3계열 | HIG JSON API 직접 파싱 | Notification(Success/Warning/Error) · Impact(Light/Medium/Heavy/Rigid/Soft) · Selection |
| `SensoryFeedback` 전 케이스 | Apple 문서 JSON | 17개 케이스 확인. **iOS 17.0+** |
| iOS 17 API 게이트 | Apple 문서 플랫폼 필드 | `sensoryFeedback`·`phaseAnimator`·`keyframeAnimator`·`symbolEffect` 전부 iOS 17.0 |
| Apple Buttons HIG 인용 | HIG JSON API | "a button needs a hit region of at least 44x44 pt", "Always include a press state for a custom button" 원문 확인 |
| Emil hold-to-delete 수치 | 원문 페이지 직접 열람 | `clip-path 2s linear`(누름) / `200ms ease-out`(뗌) 원문 확인 |
| 스프링 환산 3건 | 내가 재계산 | E 클러스터 환산값과 소수 둘째 자리까지 일치 |
| ReactBits 라이선스 | GitHub API `/license` | **MIT + Commons Clause.** "ported version" 재배포 금지 |
| Aceternity 라이선스 | 라이선스 페이지 원문 | 파생물의 마켓플레이스 배포 금지 |
| uiverse 라이선스 | 사이트 푸터 | MIT 확인 |
| Pow 라이선스·스타 | GitHub API | **MIT · 4,397★.** 무료 |

---

## 1. 요약

1. **최고 밀도의 자료는 갤러리가 아니라 개인 장인의 산문과 MIT 소스에 있다.** Emil Kowalski의 글과 Sonner/Vaul 소스는 `2s linear` / `200ms ease-out` / `cubic-bezier(0.32,0.72,0,1)` 같은 **그대로 쓸 수 있는 수치**를 공개한다. Dribbble·uiverse는 수치가 없고 hover 의존이라 이식 가치가 낮다.
2. **경쟁 카탈로그는 실제로는 작다.** motion.dev 452 패턴 중 버튼 concept은 6개뿐이고, cursor 카테고리 29개 + hover 의존 항목은 iOS에 존재하지 않는 입력을 전제한다. "452 vs 3"은 비교가 아니다.
3. **진짜 경쟁자는 motion.dev가 아니라 Pow다.** 같은 SwiftUI, 같은 modifier 형식, 이펙트 33개, **MIT·무료**(4,397★). 아이디어 노트의 경쟁 좌표에 없던 항목이다.
4. **그런데 Pow에 체크마크를 그리는 이펙트가 없다.** 30개가 넘는 목록에 check/checkmark라는 이름이 하나도 없다. 우리 success-check는 우연히 빈칸에 서 있다.
5. **Pow는 햅틱을 "또 하나의 이펙트"로 제공한다.** 시각과 촉각을 각각 붙이고 둘의 시간 관계는 개발자 몫이다. 우리 정의는 정반대다: 모션·햅틱·타이밍이 안무된 한 세트. **여기가 우리 자리다.**
6. **반복되는 패턴 상위 5개**: ① loading→결과 모프(6개 소스에서 독립 발견) ② hold-to-confirm(5개) ③ copy→copied 아이콘 스왑+체크 드로우(4개) ④ 라벨 롤/모프(4개) ⑤ 카운터 롤(4개). 이 다섯이 수렴 지점이다.
7. **포화된 것**: 테두리를 도는 그라디언트/샤인(5개 라이브러리 중 4개), 클릭 리플(3개), 어텐션 펄스 루프. 앞 둘은 웹에서 이미 클리셰고, 셋째는 우리 규칙 위반이다.
8. **지속시간에 합의가 있다.** 피드백은 **300ms 이하**, 실질 수렴값 **200ms ease-out**. 표면이 이동할 때만 400~500ms(Sonner 400, Vaul 500). 우리 스펙 시트는 "응답 개시 지연"(촉각 50/시각 85ms)과 "완료까지 지속"을 분리해서 적어야 한다.
9. **비대칭 규칙의 방향은 되돌릴 수 있는지가 결정한다.** Comeau는 장식적 hover에 빠르게 들어가고(125ms) 느리게 나오게(450ms) 하고, Emil은 파괴적 hold에 느리게 들어가고(2s) 빠르게 나오게(200ms) 한다. 둘은 충돌하지 않는다. **커밋하는 방향이 느리고, 포기하는 방향이 빠르다.** 어느 저자도 이렇게 쓰지 않았다. 우리 문서에 우리 기여로 적을 값어치가 있다.
10. **햅틱 자체는 이제 해자가 아니다.** iOS 17부터 `.sensoryFeedback(.success, trigger:)` 한 줄이면 된다. 남는 해자는 넷뿐이다: **발화 시점의 안무 · ≤150ms 패턴 설계 · iOS 16 폴백 · 실측 공개.** 제품 카피는 이 넷 위에 서야 한다.

---

## 2. 전체 카탈로그 (84)

### 읽는 법

```
N. 이름 · category · 난이도 1-5 · minIOS
   URL · 작성자 · 날짜 · 라이선스
   무엇:  일어나는 일 (공개된 타이밍은 그대로, 내 추정은 (추정))
   신호:  화면에 보인 수치 그대로. 없으면 unknown
   Swift: 필요한 API / 웹 전용 트릭이면 "Swift 불충실"
   햅틱:  tap|success|error|burst|selection @ 타임라인 위치
   태그:  surface / trigger / intent
   규칙:  OK 또는 flag + 사유
```

- `category`: **minimal**(절제·정교) / **showy**(축하·주목) / **state**(상태 전이)
- `라이선스`는 "코드를 가져올 수 있나"가 아니라 **"이 디자인을 출발점으로 삼아도 되나"**로 읽는다. 우리는 전부 Swift로 새로 쓰므로 코드 복사 위험은 낮고, 진짜 위험은 ① "포팅 금지" 조항 ② 특정 기업 trade dress다.
- `신호`에 MotionScore를 적은 경우 그것은 **인기가 아니라 렌더 비용 등급**이다.

---

### 2.1 state: 상태 전이 (31)

**1. Multi-state Badge** · state · 3 · iOS 17
`https://motion.dev/examples/react-multi-state-badge` · BKMN · 2025-03-10 · Motion+ 유료 게이트(형식 라이선스 없음)
무엇: 하나의 알약형 배지가 idle → processing → success → error를 순환. `overflow:hidden` + `borderRadius:999`로 폭이 내용에 맞춰 변하고, AnimatePresence가 이전 상태의 퇴장과 다음 상태의 입장을 한 프레임에 조율.
신호: MotionScore B (렌더 비용 등급)
Swift: `enum` + `.transition(.asymmetric)` / iOS 17 `phaseAnimator([.idle,.processing,.success], trigger:)`
햅틱: success @ success 진입 / error @ error 진입. 로딩 진입에는 **없음**(방금 탭했으므로 이미 안다)
태그: button / tap / confirm
규칙: OK. **loading→결과 모프의 정본 참조**

**2. Hold to Confirm** · state · 3 · iOS 16
`https://motion.dev/examples/react-hold-to-confirm` · BKMN (bakemono.space) · 2025-03-12 · Motion+ 유료 게이트
무엇: 길게 누르는 동안 하나의 progress 값이 올라가고, 그 값 하나가 `useTransform`으로 여러 애니메이션(채움 스윕·라벨·링)을 동시에 구동. 전부 뗐을 때 완주면 확정, 미달이면 리셋.
신호: MotionScore B
Swift: `DragGesture(minimumDistance:0)` + `TimelineView` 선형 램프 → `Path.trim(from:0,to:progress)` 링 + 폭 마스크 `Rectangle`
햅틱: selection @ 홀드 시작 → success @ 100% 채움. 조기 해제 시 조용히(또는 light impact 1회)
태그: button / long-press / confirm
규칙: OK

**3. Hold to Delete (clip-path fill)** · state · 2 · iOS 16
`https://emilkowal.ski/ui/building-a-hold-to-delete-component` · Emil Kowalski · unknown · 산문(기법 자체는 비구속)
무엇: 오버레이를 `clip-path: inset(0px 100% 0px 0px)`로 숨겼다가 왼쪽→오른쪽으로 연다. **누름 `transition: clip-path 2s linear`**(고르게 카운트다운되도록 linear), **뗌 `200ms ease-out`**으로 오버라이드. 버튼 자체는 `scale(0.97)` / `transform 160ms ease-out`. 원문 확인함.
신호: 저자 신뢰도. Linear 디자인 엔지니어, 전 Vercel. Sonner 12,995★ / Vaul 8,619★
Swift: `.mask(Rectangle())` 폭 애니메이션 또는 `Path.trim`. `.linear(duration:2)` 누름 / `.easeOut(duration:0.2)` 뗌
햅틱: selection @ 홀드 시작, **success @ 100%(시각 피크)**, 중간에는 아무것도 없음
태그: button / long-press / confirm
규칙: OK. **hold-fill 프리미티브의 완성된 설계도.** 저자의 근거: 누름은 선택을 확인할 수 있게 느려야 하고, 뗌은 훨씬 빨라도 된다

**4. Button · Hold to confirm**. state · 3 · iOS 16
`https://codepen.io/aaroniker/pen/WNNWQbM` · Aaron Iker · unknown · CodePen 기본 MIT(펜에 명시 없음)
무엇: `mousedown`/`touchstart`/스페이스바가 `.process`를 붙이고 링의 `stroke-dasharray`가 0→52로 `--duration: 1600ms` linear 진행. 조기 해제 시 타이머 클리어 후 즉시 복귀. 완주 시 링이 점으로 줄고 체크가 `stroke-dashoffset` 18→0으로 그려짐(`.4s ease`, `.7s` 지연).
신호: unknown (CodePen의 하트·조회수는 클라이언트 렌더라 정적으로 안 잡힘. 브라우저로도 재확인했으나 에디터 뷰에 카운트 미표시)
Swift: `DragGesture` + 타이머 → `Path.trim` 링 → 체크 `trim`
햅틱: 홀드 중 selection 틱(선택) / success @ 링 완주 1.6s / 조기 해제 시 light impact
태그: button / long-press / confirm
규칙: OK. 2·3번과 같은 패턴의 세 번째 독립 구현. **수렴 확인**

**5. 펜딩/성공/실패 버튼** · state · 2 · iOS 16
`https://codepen.io/fxm90/pen/wJLjgB` · Felix M. (mytaxi 용으로 Alexander Szyperrek와 제작) · unknown · CodePen 기본 MIT
무엇: 제출 버튼이 240px 알약 → 40px 원으로 수축(`.33s ease-in-out`), 링 스피너(`.66s linear infinite`), 그 뒤 체크 또는 X로 교체(`.6s ease` 페이드인). 상태당 1500ms.
신호: unknown
Swift: 폭 애니메이션 + `ProgressView` + `Path.trim`. 웹 전용 트릭 없음(X의 CSS 그라디언트 마스크는 Path 2개로 대체)
햅틱: success @ 체크 등장 / error @ X 등장
태그: button / tap / confirm
규칙: OK. **실무에 실제로 쓰인 3상태 버튼**(택시 호출 앱)

**6. Stateful Button** · state · 2 · iOS 16
`https://ui.aceternity.com/components/stateful-button` · Aceternity UI · unknown · **Aceternity License. 파생물의 마켓 배포 금지**
무엇: onClick(동기·비동기)이 idle → 스피너 → 체크 시퀀스를 버튼 안에서 구동, promise가 settle되면 해소. 문서 스스로 **"Inspired by Family.co"**라고 밝힘.
신호: unknown
Swift: `@State enum` + `.contentTransition` + `ProgressView` + `symbolEffect(.bounce)`
햅틱: success @ 완료
태그: button / tap / confirm
규칙: flag: **라이선스**. 출발점으로 삼지 않는다. 단 패턴의 원천은 Family이며 Aceternity의 발명이 아니다

**7. Fuse Button** · state · 4 · iOS 17
`https://reactbits.dev/c/micro/fuse-button` · ReactBits (David Haz) · unknown · **MIT + Commons Clause. "ported version" 재배포 금지**
무엇: 누르면 "실행 취소" 상태가 무장되고 도화선이 알약 테두리를 타며 탄다(`undoWindow` 기본 4000ms). idle/armed/done 사이 200ms 블러 크로스페이드. `commitOn`으로 즉시 실행 후 되돌리기 vs 다 타야 실행을 선택.
신호: 라이브러리 전체 47,901★ (GitHub API). 컴포넌트별 수치는 unknown
Swift: `Path.trim` + `TimelineView` 4초 램프, 라벨 스왑 `.opacity`+`.blur` 200ms, enum 상태 기계
햅틱: tap @ 무장 / selection @ 취소 / success @ 커밋
태그: button / tap / confirm
규칙: flag: **라이선스로 차단.** 아이디어(취소 유예창)는 유효하나 이 구현을 출발점으로 쓸 수 없다

**8. Hold Button** · state · 4 · iOS 17
`https://reactbits.dev/c/micro/hold-button` · ReactBits (David Haz) · unknown · **MIT + Commons Clause. 포팅 재배포 금지**
무엇: 길게 누르면 액체처럼 채워짐(`holdTime` 기본 2000ms, 등속), 스크롤하는 파고 마루와 홀드 내내 충전되다 완료 시 1회 펄스하는 글로우. `pressScale` 0.97, 조기 해제 시 `releaseTime` 200ms 복귀. 250ms 미만 + 드리프트 없으면 별도 `onTap`.
신호: 위와 동일
Swift: 진행값 + `GeometryReader` 폭 마스크 + 사인 오프셋 `Shape`
햅틱: selection @ 시작, success/burst @ 완료
태그: button / long-press / confirm
규칙: flag: **라이선스로 차단.** 파라미터(2000ms/0.97/200ms/250ms)는 2·3·4번과 독립적으로 같은 대역이라 수렴 증거로만 사용

**9. Day/Night Toggle Switch** · state · 3 · iOS 16
`https://uiverse.io/Galahhad/strong-squid-82` · Galahhad · 2023-07-14 · **MIT**
무엇: 해/달 썸이 알약 트랙을 가로지르고 트랙 색이 파랑→남색으로 전환(`:checked` 구동, hover 아님). 컨테이너·해달 `0.5s cubic-bezier(0,-0.02,0.4,1.25)`(살짝 오버슈트), 썸 위치 `0.3s cubic-bezier(0,-0.02,0.35,1.17)`.
신호: **5.4K 좋아요 / 108K 조회**. 이번 조사 전체 최고 좋아요
Swift: 커스텀 `ToggleStyle` + `.timingCurve`. **부분 불충실**: 구름이 box-shadow 15겹 복제라 SwiftUI 등가물 없음 → 도형 2~3개로 재작화
햅틱: selection @ 0.3s 썸 슬라이드 시작
태그: toggle / tap / delight
규칙: OK. uiverse에서 **탭 네이티브이면서 최고 신호**인 유일한 항목

**10. Hamburger-to-X Menu Checkbox** · state · 1 · iOS 16
`https://uiverse.io/Cevorob/good-wolverine-51` · Cevorob · 2022-12-20 · **MIT**
무엇: 막대 3개 중 위·아래가 45°/-45°로 회전해 X가 되고 가운데가 폭 0으로 수축. `0.25s ease-in-out`, 숨은 체크박스의 `:checked` 구동.
신호: **3.5K 좋아요 / 100K 조회**
Swift: `Capsule` 3개 + `.rotationEffect` + `.frame(width:)` / `.opacity`
햅틱: tap(light) @ 토글 순간
태그: toggle / tap / guide
규칙: OK. 완전 탭 네이티브, 1:1 매핑

**11. Like Button (하트 + 카운터)** · state · 1 · iOS 16
`https://uiverse.io/Priyanshu02020/popular-puma-87` · Priyanshu02020 · 2024-10-15 · **MIT**
무엇: 하트가 빨강으로 바뀌며 팝(scale 0.5→1.2), 카운트 열이 위로 밀려 올라오며 크로스페이드. `:checked` 구동. 하트 확대 `0.2s ease-out`, 카운트 슬라이드 `0.5s ease-out`.
신호: **1.6K 좋아요 / 10K 조회**. 주의: 위젯 내부에 "Likes 6869" 문자열이 보이지만 그건 컴포넌트의 **샘플 데이터**이지 uiverse 집계가 아님
Swift: `Image(systemName:)` + `.scaleEffect` + `.contentTransition(.numericText())`
햅틱: 0.2s 확대 피크에 impact(medium) 1회. 되돌릴 수 있고 빈번하므로 **success 아님**
태그: toggle / tap / reward
규칙: OK

**12. Switch loading animation** · state · 3 · iOS 16
`https://codepen.io/aaroniker/pen/BVMxVp` · Aaron Iker · unknown · CodePen 기본 MIT
무엇: 스위치를 켜면 트랙이 원으로 접히며 부분 링 스피너(`rotate .9s infinite linear`, .2s 지연)를 보이고, 가짜 ajax 2000ms 후 체크된 알약으로 복귀(`transition: all .4s ease`). **끄기는 즉시**, 로딩 없음.
신호: unknown
Swift: 커스텀 `ToggleStyle` + `Path.trim` + 폭 애니메이션
햅틱: selection @ 탭 / success @ 2000ms 정착
태그: toggle / tap / confirm
규칙: OK. **비대칭 규칙의 실물**(커밋 방향만 느리다)

**13. Smooth Tabs (세그먼트 알약 모프)** · state · 2 · iOS 16
`https://motion.dev/examples/react-smooth-tabs` · Matt Perry · 2025-01-20 · Motion+ 유료 게이트
무엇: 선택된 탭 뒤로 알약 인디케이터가 미끄러지고, 콘텐츠는 새 탭이 이전보다 왼쪽인지 오른쪽인지에 따라 방향을 정해 슬라이드.
신호: MotionScore A (렌더 비용)
Swift: `matchedGeometryEffect` + 공유 `Capsule` + `.transition(.asymmetric(insertion:.move(edge:.trailing), removal:.move(edge:.leading)))`
햅틱: selection @ 탭 변경
태그: toggle / tap / guide
규칙: OK

**14. Clip-path 탭/세그먼트 모프** · state · 3 · iOS 16
`https://emilkowal.ski/ui/the-magic-of-clip-path` · Emil Kowalski (기법은 Paco Coursey 공로로 표기) · unknown · 산문
무엇: 활성 탭의 **글자색을 전환하지 않는다.** 목록 전체를 복제해 사본을 영구 활성(채워진 배경·반전 글자) 스타일로 두고 활성 항목만큼만 클립한다. `clip-path: inset(0 93% 0 3% round 17px)`. 선택 시 inset만 애니메이션. 저자: 색 전환 타이밍을 걱정할 필요가 없어진다. Stripe 블로그에 실제 적용.
신호: Paco Coursey의 cmdk 12,984★ MIT / 주 3,303만 npm 다운로드
Swift: 반전 사본을 `.overlay`하고 `RoundedRectangle`로 `.mask()`, 프레임을 `matchedGeometryEffect`로 이동
햅틱: selection @ 탭 변경
태그: toggle / tap / guide
규칙: OK. **색 보간의 추함을 아예 우회하는 기법.** 우리 Toggle 레시피에 바로 맞음

**15. Vaul drawer · iOS 시트 커브**. state · 2 · iOS 16
`https://github.com/emilkowalski/vaul/blob/main/src/constants.ts` · Emil Kowalski · 소스 최종 푸시 2025-10-03 · **MIT**
무엇: 소스의 튜닝 상수 전량. `DURATION: 0.5`, `EASE: [0.32, 0.72, 0, 1]`, `VELOCITY_THRESHOLD: 0.4`, `CLOSE_THRESHOLD: 0.25`, `SCROLL_LOCK_TIMEOUT: 100`, `BORDER_RADIUS: 8`, `NESTED_DISPLACEMENT: 16`. Family의 iOS 드로어를 웹으로 역설계한 것.
신호: **8,619★ · 주 28,630,372 npm 다운로드** (2026-09-23 API 조회)
Swift: `.timingCurve(0.32, 0.72, 0, 1, duration: 0.5)` **문자 그대로 이식 가능**. 임계값은 `DragGesture` + `predictedEndTranslation`
햅틱: selection @ 스냅 포인트 교차
태그: sheet / swipe / guide
규칙: OK. **이번 조사에서 단일 수치로는 가장 레버리지가 큰 값.** 표면이 이동하는 모든 유닛의 기본 커브로 쓸 것

**16. Sonner swipe-to-dismiss** · state · 3 · iOS 16
`https://github.com/emilkowalski/sonner/blob/main/src/styles.css` · Emil Kowalski · 2026-08-10 · **MIT**
무엇: 드래그 중에는 **명시적으로 애니메이션을 끈다**(`transition: none`). transform이 손가락을 1:1 추종. 놓는 순간 `200ms ease-out forwards`로 인계. 해제 판정은 속도 임계값 `0.11`(`|swipeAmount| / timeTaken`). 저자는 CSS keyframes를 주 전환에 안 쓴 이유로 **중단 불가능성**을 든다.
신호: **12,995★ · 주 37,931,079 npm 다운로드**
Swift: `DragGesture` → 드래그 중 애니메이션 **없이** `.offset`, 놓을 때 `.easeOut(duration:0.2)`, 속도는 `predictedEndTranslation`
햅틱: selection **@ 임계값 교차 순간**(놓기 전에 확정을 손으로 느끼게). 놓는 시점이 아님
태그: card / swipe / confirm
규칙: OK. 햅틱 위치 선택이 특히 좋다

**17. Sonner toast 입장 + 스택 리프트** · state · 3 · iOS 16
`https://github.com/emilkowalski/sonner/blob/main/src/styles.css` · Emil Kowalski · 2026-08-10 · **MIT**
무엇: 소스 실측. `transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms`. **box-shadow만 기하 변형의 절반 시간**으로 의도적으로 돌린다. 뒤 토스트는 `--toasts-before * 0.05 + 1`로 축소되고 lift만큼 밀려남. 펼침 상태는 `transform 500ms, opacity 200ms`.
신호: 위와 동일
Swift: 인덱스별 `.offset(y:)` + `.scaleEffect`, `.animation(.easeInOut(duration:0.4))`
햅틱: selection @ 도착
태그: card / appear / guide
규칙: flag: `appear` 트리거는 그 자체로는 우리 규칙 밖. **완료된 사용자 액션의 응답일 때만** 허용(= Sonner의 실제 용법). 주변 알림 모션으로는 불가
메모: **box-shadow를 기하의 절반 속도로 돌린다**. 작고 공짜이며 아무도 글로 쓰지 않은 디테일

**18. App Store GET → 다운로드 링 → OPEN** · state · 4 · iOS 17
`https://developer.apple.com/design/human-interface-guidelines/progress-indicators` + MIT 재현 `https://github.com/amerhukic/AHDownloadButton` · Apple / Amer Hukić · HIG 변경로그 2023-09-12 · 패턴은 무라이선스 / 재현물은 **MIT**
무엇: 알약 CTA가 **움직이지 않은 채로** 정체를 세 번 바꾼다. 라벨 알약 → 가운데 정지 사각형이 있는 결정형 링 → 다른 문구의 알약. Apple HIG가 명시하는 건 링 규칙("clockwise direction")과 중단 수단 제공뿐. **타이밍 미공개.**
신호: 모든 iPhone의 App Store에 탑재. 설치·평점 수치는 unknown
Swift: `matchedGeometryEffect`(알약↔원) + `Circle().trim` + `.rotationEffect(.degrees(-90))` + enum 상태
햅틱: selection @ 탭 → success @ 링이 100%로 닫히는 프레임
태그: button / tap / convert
규칙: OK. 단 flag: **Apple의 "GET"/"OPEN" 문구와 배지 아트워크는 쓰지 않는다.** 3상태 알약 구조만 재해석. HIG 경고도 지킬 것. 90%에서 멈추는 가짜 링은 기만적으로 느껴질 수 있다

**19. Apple Pay · 이중 클릭 확인 후 Done + 체크마크**. state · 3 · iOS 17
`https://developer.apple.com/design/human-interface-guidelines/apple-pay` · Apple · HIG 변경로그 2026-06-08 · 패턴은 무라이선스, **강한 trade dress 경계**
무엇: 의도적인 물리 제스처가 되돌릴 수 없는 행동을 통제하고("Double-click the side button"), 해소는 작고 모호하지 않은 글리프 하나다("you'll see Done and a checkmark"). Apple의 Feedback HIG가 이것이 축하를 받을 자격이 있는 이유를 말한다. 충분히 중요한 활동에만 이런 확인을 남겨두라. **타이밍 미공개.**
신호: 지원되는 모든 iPhone의 Wallet에 탑재
Swift: arming → verifying → confirmed 2단 상태 기계 + `Path.trim` 체크 드로우
햅틱: **success @ 체크마크 등장, 탭이 아니다.** 촉각과 글리프가 같이 착지해야 한다
태그: button / tap / confirm
규칙: flag: **trade dress. 재해석만.** Apple Pay 유사 버튼·마크·로고를 절대 렌더하지 않는다. 가져올 것은 **gate-then-glyph 구조**: 되돌릴 수 없는 행동에 두 번째 의도적 제스처를 요구하고, 작은 체크 하나로 해소

**20. 버튼 내장 활동 표시기** · state · 2 · iOS 16
`https://developer.apple.com/design/human-interface-guidelines/buttons` · Apple · 변경로그 2025-12-16 · 패턴, 무라이선스
무엇: 별도 스피너나 차단 오버레이 대신 **버튼이 대기를 흡수한다.** Apple 원문 확인: 즉시 끝나지 않는 액션의 피드백이 필요하면 버튼에 활동 표시기를 넣도록 구성하라, UI 공간을 아끼면서 지연 이유를 분명히 전달한다. 문구 변경도 명시. "Checkout"이 "Checking out…"으로. 시스템은 표시기가 보이는 동안 버튼 이미지를 숨긴다. **타이밍 미공개.**
신호: iOS/iPadOS 표준 `UIButton` 동작
Swift: `ProgressView().controlSize(.small)` + `.contentTransition(.opacity)` + `.disabled(isLoading)`. **프레임을 고정**해 행이 재배치되지 않게
햅틱: 로딩 진입에는 **없음**. 해소 시 success 또는 error
태그: button / tap / convert
규칙: OK. 단 교차 확인: 시스템 시트가 이미 대기를 소유한 경우(Apple Pay) 추가 스피너는 혼란을 만든다. **버튼이 대기를 소유할 때만** 흡수

**21. Things 3 · Magic Plus Button**. state · 4 · iOS 17(26에서 액체 변형)
`https://culturedcode.com/things/features/` · Cultured Code · 기능 페이지 날짜 미상 / OS 26 글 2025-09-15 · 패턴, 무라이선스
무엇: 생성 버튼이 동시에 배치 컨트롤이다. 탭하면 새 할 일이 생기고, 다른 곳에 넣고 싶으면 손가락으로 버튼을 들어 올려 원하는 자리로 끌고 놓는다. 2025 업데이트는 재질 응답을 더했다. 끌고 다니면 형태가 아주 약간 변형된다. Cultured Code는 애니메이션 계층이 자체 제작 툴킷이라고 밝힌다. **타이밍 미공개.**
신호: App Store 리스팅에 **4.8 · 28K Ratings** 표시. **2017 Apple Design Award** 수상(Apple 뉴스룸 2017-06-07에 "Things 3 (Germany)" 등재)
Swift: `DragGesture(.updating)` 1:1 추종 + `.offset`/`.scaleEffect` + 리프트 높이에 비례하는 그림자 + `matchedGeometryEffect` 드롭
햅틱: impact(.light) @ 들어올림 / **selection @ 삽입 지점이 새 행으로 스냅될 때마다**(Apple 정의: 값이 변하는 중) / impact(.soft) @ 드롭
태그: button / long-press / guide
규칙: OK. flag: Things 고유 버튼 외형과 "Magic Plus" 이름은 재현하지 않는다
메모: **이번 조사에서 가장 강한 패턴 신호.** 이 구조("하나의 컨트롤, 두 개의 의도, 압력으로 드러남")가 Messages 전송 버튼과 **독립적으로 수렴**한다. 서로 다른 팀, 둘 다 수상작

**22. Add to Basket (호 경로 비행)** · state · 4 · iOS 17
`https://motion.dev/examples/react-add-to-basket` · Matt Perry · 2026-06-05 · 소스 무료 노출(형식 라이선스 없음)
무엇: 복제된 상품 이미지가 `arc()` 곡선 경로(arc strength 0.5, peak 0.15, rotation 0.9)를 따라 0.45s, 이징 `[0.74, 0.18, 0.93, 0.69]`로 장바구니로 날아가고, 바구니가 스프링 충격(stiffness 500, damping 12. 강하게 저감쇠, 1~2회 오버슈트)으로 받아낸다.
신호: MotionScore S (렌더 비용 최상)
Swift: iOS 17 `keyframeAnimator`(x/y/scale/opacity/rotation 트랙) 또는 `Canvas`+`TimelineView` 베지어. 충격은 `.spring(response:0.45, dampingFraction:0.35)`
햅틱: burst @ 바구니 충돌 순간
태그: button / tap / reward
규칙: OK

**23. "Toss" Add to Cart** · state · 4 · iOS 17
`https://codepen.io/designcouch/pen/OJPdZxg` · Jesse Couch · unknown · CodePen 기본 MIT
무엇: 카운트 배지가 버튼에서 고정된 장바구니 아이콘으로 날아간다. X축은 `1s cubic-bezier(1.000,.440,.840,.165)`, Y축은 **거울 대칭 커브** `cubic-bezier(.165,.840,.440,1.000)`. 독립된 두 이징이 호를 그린다. 도착 시 장바구니가 흔들리고(`.4s`, 6→-4→2→0px) 배지 숫자가 증가.
신호: unknown
Swift: `keyframeAnimator`의 축별 독립 트랙이 이 이중 커브에 정확히 대응
햅틱: impact(rigid) @ 착지·흔들림 순간(~1s)
태그: button / tap / convert
규칙: OK. 22번과 독립 수렴. **축마다 다른 이징으로 호를 만든다**는 기법이 핵심

**24. Add To Cart (아이콘 인계)** · state · 3 · iOS 17
`https://codepen.io/MinzCode/pen/pogqVVX` · MinzCode · unknown · CodePen 기본 MIT
무엇: 장바구니 아이콘이 -10%→50%(40~60%에서 정지)→110%로 `1.5s ease-in-out` 이동하고, 상자 아이콘이 -20%→40%로 맞춰 올라오며, "Add to cart"/"Added" 라벨이 같은 타임라인에서 반대 opacity로 교차.
신호: unknown
Swift: `keyframeAnimator` 다중 트랙
햅틱: success @ 아이콘 착지·라벨 전환(~1.5s)
태그: button / tap / convert
규칙: flag: **1.5s는 우리 예산(피드백 ≤300ms) 초과.** 아이콘 인계라는 아이디어만 취하고 지속시간은 절반 이하로

**25. 원형 로더 → 체크마크 완료** · state · 2 · iOS 16
`https://codepen.io/scottloway/pen/yVRpQp` · Scott Galloway · unknown · CodePen 기본 MIT
무엇: 한쪽 테두리만 강조된 원이 `1s linear infinite` 회전하다, 완료 시 회전이 멈추고 테두리 색이 `500ms ease-out` 전환되며 체크가 높이·폭 키프레임(0→20%→40%→100%)으로 `1.2s ease` 그려진다. 실패는 정적 X.
신호: unknown
Swift: `Path.trim(from:to:)`이 CSS의 높이/폭 해킹보다 **더 깨끗한 구현**
햅틱: success @ 체크 드로우 완료 / error @ 실패
태그: button / complete / confirm
규칙: OK

**26. Swipe Actions** · state · 2(네이티브) / 4(커스텀) · iOS 16
`https://motion.dev/examples/react-swipe-actions` · BKMN · 2025-01-28 · Motion+ 유료 게이트
무엇: iOS식 스와이프 액션. 드래그 위치를 실시간 추적해 스프링(stiffness 900, damping 80. 비율 ≈1.3, **과감쇠**: 튕김 없이 빠르게 정착)으로 액션 버튼의 노출 폭·불투명도를 유도. 전체 스와이프 또는 노출 후 탭으로 실행.
신호: MotionScore A
Swift: `.swipeActions(edge:)`(iOS 15+)가 표준 케이스를 네이티브로 커버. 커스텀은 `DragGesture` + `.spring(dampingFraction: 1.0)`
햅틱: selection @ 액션 노출 임계값 교차
태그: list-item / swipe / confirm
규칙: OK. 단 **SwiftUI에 이미 네이티브가 있다.** 유닛화 가치 낮음

**27. Slide to Confirm** · state · 3 · iOS 16
`https://codepen.io/arjunkalburgi/pen/dyyJMKO` · Arjun Kalburgi · unknown · CodePen 기본 MIT
무엇: `<input type=range>`를 슬라이드-확인 알약으로 재스타일. 라벨에 `-webkit-mask-image` 그라디언트 스포트라이트. **다만 `@keyframes text-spotlight` 블록도 완료 JS도 소스에 없다**. 껍데기만 있는 시각 목업.
신호: unknown
Swift: `DragGesture` + 임계값. **불충실**: 셔머 키프레임 수식이 소스에서 해소되지 않고, 확인 로직은 처음부터 작성해야 함
햅틱: success @ 약 90% 드래그 임계값(소스에 없음, 설계 제안)
태그: button / swipe / confirm
규칙: flag: **주목 유도**. 4s 무한 셔머가 정지 상태에서도 돈다(드래그 진행과 무관). 우리 규칙 위반

**28. exyte/PopupView** · state · 2 · iOS 16
`https://github.com/exyte/PopupView` · Exyte · 최종 푸시 2026-09-22 · **MIT**
무엇: `.popup(isPresented:)`가 토스트·플로팅·바텀시트·센터 팝업을 슬라이드+페이드 입장, 자동 해제 타이머, 드래그 해제와 함께 제시.
신호: **4,060★** (GitHub API)
Swift: `.popup(isPresented:view:)`
햅틱: success. 패키지에 내장돼 있지 않아 같은 트리거에서 수동 발화
태그: button / tap / confirm
규칙: OK

**29. exyte/AnimatedTabBar** · state · 2 · iOS 16
`https://github.com/exyte/AnimatedTabBar` · Exyte · 최종 푸시 2026-07-08 · **MIT**
무엇: 순수 SwiftUI 탭바 대체. 선택 인덱스가 바뀔 때 탭한 탭에서 재생되는 프리셋 선택 애니메이션 약 10종(bounce/flip/drop 등).
신호: **553★**
Swift: 커스텀 탭 아이템 전환 프로토콜
햅틱: selection. 내장 아님. `.sensoryFeedback(.selection, trigger: selectedIndex)` 권장
태그: toggle / tap / guide
규칙: OK

**30. `contentTransition(.numericText)` 카운터** · state · 2 · iOS 17
`https://developer.apple.com/documentation/swiftui/contenttransition/numerictext(value:)` · Apple · WWDC23 · 플랫폼 API
무엇: 숫자를 보여주는 `Text`의 자릿수 변화가 크로스페이드 대신 **오도미터처럼 굴러간다.** 방향은 이전-이후 델타로 추론. `withAnimation` 안에 있어야 실제로 움직이며, 폭 흔들림 방지를 위해 `.monospacedDigit()` 권장.
신호: 플랫폼 API(별점 없음)
Swift: `.contentTransition(.numericText(value:))`
햅틱: 없음. 증분당 selection 선택적
태그: button / tap / guide
규칙: flag: **모든 SwiftUI 튜토리얼에 나오는 포화 패턴.** 유닛 단독으로는 차별화 불가, 다른 유닛의 구성 요소로만

**31. Family · 모프하는 버튼 라벨**. state · 4 · iOS 16(진짜 글리프 지속은 18)
`https://benji.org/family-values` · Benji Taylor (Family, 현 X 디자인 총괄) · 2024-07-08 · 디자인 에세이, 코드 미공개
무엇: 기본 버튼의 **라벨이 크로스페이드가 아니라 모프한다**. "Continue"를 "Confirm"으로 진화시키면서 공유된 "Con" 접두를 의도적으로 활용해, 유지되는 글자는 제자리에 있고 꼬리만 바뀐다. 같은 체계가 숫자도 옮긴다. 빈도가 높은 흐름에서는 일부러 절제한다(쉼표 위치 이동 정도). **타이밍·스프링·햅틱 사양 전부 미공개.**
신호: Family는 이 클러스터 전체의 기준 앱. Emil Kowalski가 드로어(Vaul)와 트레이 체계를 재현했고 animations.dev가 별도 강의를 할애
Swift: 숫자는 `.contentTransition(.numericText())`, 라벨은 `.contentTransition(.interpolate)`. 진짜 글리프 단위 지속은 문자 분할 `Text` + `matchedGeometryEffect` 또는 `TextRenderer`(iOS 18)
햅틱: selection @ 라벨 변경 / success @ 최종 확인
태그: button / tap / confirm
규칙: OK
메모: **가장 차별화되는 후보.** 사람들이 "Family 같다"고 말할 때 가리키는 인터랙션이고, **아무도 수치를 공개하지 않았으므로 베낄 무료 대안이 없다**

---

### 2.2 minimal: 절제되고 정교한 것 (26)

**32. Press (motion.dev 기본형)** · minimal · 1 · iOS 16
`https://motion.dev/examples/js-press` · Matt Perry · 2025-02-04 · 소스 무료 노출(형식 라이선스 없음)
무엇: 누르면 scale 0.8까지 압축(스프링 stiffness **1000**, 날카롭게), 떼면 1.0으로 복귀(stiffness **500**, 느리고 더 튕김). `press()`가 우클릭·보조 터치를 자동 필터하고 키보드 접근성을 기본 제공.
신호: MotionScore S (렌더 비용)
Swift: `ButtonStyle` + `configuration.isPressed` + 비대칭 스프링 2개
햅틱: tap @ 터치다운
태그: button / tap / confirm
규칙: OK. **누름과 뗌에 다른 스프링을 쓴다**는 것이 핵심. 우리 press는 현재 단일 스프링

**33. Press scale-down 0.97** · minimal · 1 · iOS 16
`https://emilkowal.ski/ui/7-practical-animation-tips` · Emil Kowalski · unknown · 산문
무엇: `:active`에 scale **0.97**이면 충분하다. 같은 저자가 다른 곳에서 `transition: transform 160ms ease-out`과 짝지음. 근거: 인터페이스가 사용자의 말을 듣고 있는 것처럼 느껴져야 한다.
신호: 저자 신뢰도. Linear 디자인 엔지니어. Sonner 12,995★ / Vaul 8,619★
Swift: `.scaleEffect(pressed ? 0.97 : 1)` + `.easeOut(duration: 0.16)`
햅틱: tap @ t=0, 시각 작업보다 먼저(촉각 5~50ms 창)
태그: button / tap / convert
규칙: OK. 우리 press의 기본값과 대조할 기준점

**34. 비대칭 프레스: 빠르게 들어가고 느리게 나오기** · minimal · 1 · iOS 16
`https://www.joshwcomeau.com/animation/css-transitions/` · Josh W. Comeau · 2021-02-09 (2026-05-05 갱신) · 산문
무엇: 들어가는 애니메이션은 빠르고 경쾌하게(**125ms**), 나오는 것은 느긋하게(**450ms**). 구현은 느린 값을 기본 상태에, 빠른 값을 활성 상태에 둔다. 저자는 `transition: all`을 코드가 바뀔 때 예상 못 한 애니메이션이 생긴다는 이유로 경고.
신호: `use-sound` 3,154★ MIT. 5년간 유지보수된 글
Swift: `isPressed`에 따라 `.easeOut(duration: 0.125)` / `.easeOut(duration: 0.45)`
햅틱: tap @ 터치다운
태그: button / tap / convert
규칙: OK
메모: 3번(Emil, 느리게 2s 들어가고 빠르게 200ms 나옴)과 **방향이 반대**다. 충돌이 아니다. **커밋하는 방향이 느리고 포기하는 방향이 빠르다**로 통합된다

**35. Press state (Apple HIG 원칙)** · minimal · 1 · iOS 16
`https://developer.apple.com/design/human-interface-guidelines/buttons` · Apple · 변경로그 2025-12-16 · 패턴, 무라이선스
무엇: 원문 직접 확인. 커스텀 버튼에는 **항상** press state를 넣어라. 없으면 버튼이 무반응으로 느껴져 입력을 받고 있는지 의심하게 만든다. 히트 영역은 **최소 44×44 pt**(visionOS 60×60). WWDC 2018 세션 803이 전체 계약을 준다. 터치다운에 즉시 강조, 터치업에만 확정, 손가락이 밖으로 끌리면 취소, 다시 들어오면 재결합. 같은 세션의 공개 수치: **탭(운동량 없음) = 댐핑 100%, 스와이프(운동량 있음) = 댐핑 80%**.
신호: 모든 iOS 표준 컨트롤의 동작
Swift: `ButtonStyle` + `.contentShape(Rectangle())`로 히트 영역 확대
햅틱: **기본 없음.** press는 빈번한 인터랙션이고 Apple Motion HIG는 빈번한 인터랙션에 모션 추가를 일반적으로 피하라고 한다. 촉각은 커밋에 남겨둘 것
태그: button / tap / guide
규칙: OK. **모든 Wow Unit의 의무 기반 계층.** `isPressed` 처리·44pt·드래그아웃 취소를 빠뜨린 유닛은 축하가 아무리 좋아도 망가진 것

**36. `ButtonStyle` scale press (SwiftUI 정석)** · minimal · 1 · iOS 16
`https://www.hackingwithswift.com/quick-start/swiftui/customizing-button-with-buttonstyle` · Paul Hudson · unknown · 무료 튜토리얼
무엇: `makeBody(configuration:)`이 `configuration.isPressed`를 읽어 `.scaleEffect(0.95)`. 고정 지속시간 없음. 위에 얹는 `.animation()`이 결정.
신호: 튜토리얼(별점 없음)
Swift: 위와 동일
햅틱: 튜토리얼에는 없음
태그: button / tap / confirm
규칙: flag: **모든 SwiftUI 튜토리얼에 있는 포화 패턴.** 차별화 요소가 아님

**37. `.spring(duration:bounce:)`** · minimal · 1 · iOS 17
`https://developer.apple.com/documentation/swiftui/animation/spring(duration:bounce:blendduration:)` · Apple · WWDC23 · 플랫폼 API
무엇: `bounce` 범위 -1.0…1.0. **0 = 임계 감쇠(튕김 없음)**, 1 = 무감쇠 진동, 음수 = 과감쇠. WWDC23 샘플이 버튼 프레스에 `.spring(duration: 0.5, bounce: 0.15)`를 쓴다.
신호: 플랫폼 API
Swift: 그 자체
햅틱: 내재 없음. `.sensoryFeedback`과 수동 결합 필요
태그: button / tap / confirm
규칙: flag: 포화(WWDC23 버튼 프레스 레퍼런스 데모 그 자체)

**38. 스프링 파라미터 기준값 (mass/tension/friction)** · minimal · 1 · iOS 16
`https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/` · Josh W. Comeau · 2020-09-21 (2025-11-03 갱신) · 산문
무엇: 글의 샌드박스가 **mass 1.75 / tension 200 / friction 12**를 쓴다. 프레이밍이 더 중요하다. CSS 전환의 사고 모델은 시간과 커브지만 스프링은 물리 파라미터로 대체하고, 그 대가로 CSS 전환이 복제할 수 없는 방식으로 감속해 멈춘다.
신호: 위와 동일
Swift: `interpolatingSpring(mass:1.75, stiffness:200, damping:12)`이 정확히 세 파라미터를 받는다. 환산 → `.spring(duration: 0.59, bounce: 0.68)` (**내가 재계산해 검증함**)
햅틱: 해당 없음(파라미터 레퍼런스)
태그: button / tap / convert
규칙: OK
메모: 저자의 제약. CSS 안에서는 스프링을 쓸 수 없고 JavaScript로 해야 한다. 이 **SwiftUI에는 적용되지 않는다.** 스프링이 기본 커브다. iOS가 유리한 지점

**39. Material 3 Motion Physics (스프링 토큰)** · minimal · 2 · iOS 17
`https://m3.material.io/styles/motion/overview/how-it-works` · Google · **2025년 5월**(M3 Expressive와 함께 도입) · 가이드라인
무엇: 고정 duration+easing을 **물리 스프링**(stiffness, damping, 초기 속도)으로 대체. 두 scheme(expressive=오버슈트·바운스 / standard=최소 바운스) × spatial(위치·크기·회전) / effects(색·투명도) × 3속도(fast/default/slow). **버튼과 스위치는 fast 계층**으로 명시. Compose에서 21개 컴포넌트가 기본 채택.
신호: material-components-android **17,397★**
Swift: `spring(duration:bounce:)`이 Compose 스프링 토큰과 **동일한 물리 모델**, 매개변수화만 다름
햅틱: selection @ 스프링 정착(컴포넌트별)
태그: button / tap / delight
규칙: OK. **이 클러스터 전체에서 SwiftUI로 가장 직접 이식되는 사양**

**40. Material 3 state layer 불투명도** · minimal · 1 · iOS 16
`https://m3.material.io/foundations/interaction/states/state-layers` · Google · 장기 유지 사양 · 가이드라인(참조 구현은 Apache-2.0)
무엇: press/hover/focus/drag가 콘텐츠 자체 색의 평면 오버레이를 고정 불투명도로 얹는다. **Hover +8% / Focus +10% / Press +10% / Dragged +16%**.
신호: 위와 동일 17,397★
Swift: `.overlay(Color.primary.opacity(isPressed ? 0.10 : 0))`
햅틱: tap @ 터치다운
태그: button / tap / confirm
규칙: OK. 우리 press는 `brightness`를 쓴다. 이 수치는 대안 기준으로 유용

**41. Copy Button** · minimal · 2 · iOS 17
`https://motion.dev/examples/react-copy-button` · Matt Perry · 2026-03-08 · Motion+ 유료 게이트
무엇: 탭하면 클립보드 아이콘이 체크마크로 교체된다. 아이콘은 **블러 전환**으로 빠지고 체크는 `pathLength`로 그려 들어온 뒤, 일정 시간 후 되돌아간다.
신호: MotionScore A
Swift: `.contentTransition(.symbolEffect(.replace))`(iOS 17) 또는 `Path.trim` + `.blur` 크로스페이드
햅틱: success @ 체크마크 등장
태그: button / tap / confirm
규칙: OK. **개발자 도구에서 가장 수요가 확실한 작은 유닛**

**42. Copy to Clipboard + 툴팁** · minimal · 1 · iOS 16
`https://codepen.io/MrBlank/pen/joQomM` · Josh Nichols · unknown · CodePen 기본 MIT
무엇: 복사 시 툴팁이 `slide-up 0.15s cubic-bezier(.51,.92,.265,1.55)`(translateY 0→-35px, scale .8→1, opacity 0→1. 오버슈트 팝)로 나타나 **2000ms** 머문 뒤 `0.1s cubic-bezier(.25,.46,.45,.94)`로 역재생.
신호: unknown
Swift: `.transition(.scale(scale:0.8).combined(with:.opacity))` + `.spring(response:0.15, dampingFraction:0.55)`
햅틱: success @ 툴팁 등장 t=0
태그: button / tap / confirm
규칙: OK. 나타남 0.15s / 사라짐 0.1s. **여기서도 비대칭**

**43. 블러로 이어 붙인 상태 크로스페이드 (2px)** · minimal · 2 · iOS 16
`https://emilkowal.ski/ui/7-practical-animation-tips` · Emil Kowalski · unknown · 산문
무엇: 이징과 지속시간을 이미 다 맞췄는데도 어색하면 `filter: blur()`를 더한다. 예시는 2상태 버튼 크로스페이드에 **2px**, 0.97 프레스 스케일과 결합. 근거: 블러가 옛 상태와 새 상태 사이의 시각적 간극을 메운다. 없으면 별개의 두 물체로 보여 덜 자연스럽다.
신호: 위와 동일
Swift: `.blur(radius:)`를 전환 진행도에 연동 + `.transition(.opacity)`
햅틱: success @ 새 상태가 착지하는 순간(블러 시작이 아님)
태그: button / complete / confirm
규칙: OK. **loading morph·success check·icon swap 전부에 얹을 수 있는 횡단 기법**

**44. scale 0으로 나타내지 말 것 · 0.93에서 시작**. minimal · 1 · iOS 16
`https://emilkowal.ski/ui/7-practical-animation-tips` · Emil Kowalski · unknown · 산문
무엇: 더 높은 초기 스케일(0.9 이상)에서 애니메이션하라. 저자는 **0.93**을 쓴다. 근거: scale(0)은 요소가 무(無)에서 나온 것처럼 보여 어색하다. 풍선은 바람이 빠져도 보이는 형태를 가지며 완전히 사라지지 않는다.
신호: 위와 동일
Swift: `.transition(.scale(scale: 0.93).combined(with: .opacity))`
햅틱: 나타남에는 없음. tap은 트리거 쪽에 속한다
태그: sheet / tap / guide
규칙: OK

**45. 툴팁 0.125s ease-out, 그 다음은 즉시** · minimal · 2 · iOS 16
`https://emilkowal.ski/ui/7-practical-animation-tips` · Emil Kowalski · unknown · 산문
무엇: 원문 CSS. `transition: transform 0.125s ease-out, opacity 0.125s ease-out`, 숨김 상태는 `opacity: 0; transform: scale(0.97)`. 그룹 내 어떤 툴팁이 이미 열려 있으면 이후 것들은 지연과 애니메이션을 **둘 다 건너뛴다**(`transition-duration: 0ms`). 근거: 초기 지연의 목적을 해치지 않으면서 더 빠르게 느껴진다.
신호: 위와 동일. Radix·Base UI 양쪽에 탑재된 동작
Swift: **hover 인터랙션으로는 불충실**(iOS에 hover 없음). 이식 가능한 것은 **값 집합**. 0.125s ease-out + 시작 스케일 0.97을, 붙어 나타나는 일시적 라벨·인라인 확인에 적용
햅틱: 없음. 일시적 라벨은 진동하지 않는다
태그: button / tap / guide
규칙: OK

**46. Sonner 12-bar 로더** · minimal · 2 · iOS 16
`https://github.com/emilkowalski/sonner/blob/main/src/styles.css` · Emil Kowalski · 2026-08-10 · **MIT**
무엇: `animation: sonner-spin 1.2s linear infinite`, 막대 12개가 30° 간격(`rotate(Ndeg) translate(146%)`)으로 배치되고 `animation-delay`가 0.1s씩 **전부 음수**라 첫 페인트에 이미 사이클 중간이다. 로더로의 아이콘 교체는 `scale(0.8)`에서 `300ms ease forwards` 진입, 퇴장 `0.2s`.
신호: 12,995★ · 주 3,793만 npm 다운로드
Swift: `Canvas`+`TimelineView` 한 번의 draw call, 또는 `Capsule` 12개 + `.rotationEffect(.degrees(i*30))`
햅틱: 회전 중에는 없음. 해소 시에만 success
태그: button / tap / guide
규칙: flag: `infinite` 루프는 문자 그대로는 우리 규칙 위반. **진행 중인 사용자 액션에 묶여 종료되는 로딩 상태일 때만** 허용(= loading morph의 정의). 대기 상태에서 절대 돌지 않을 것
메모: **음수 delay로 첫 프레임부터 사이클 중간에 시작**하는 디테일이 좋다. 로더가 "방금 켜졌다"는 티를 안 낸다

**47. Rolling Text Button** · minimal · 2 · iOS 16
`https://motion.dev/examples/react-rolling-text-button` · Matt Perry · 2026-07-29 · 소스 무료 노출
무엇: 복제된 라벨이 굴러 들어온다. 원본이 0%→100% 아래로, 사본이 -100%→0% 위로 동시 이동. **0.3s, cubic-bezier(0.338, 0.015, 0.395, 0.959)**. 셰브론이 동반. `useReducedMotion()`을 지키고 포인터 hover뿐 아니라 **키보드 포커스에서도** 작동.
신호: MotionScore S
Swift: `.clipped()` 컨테이너 안 `Text` 2개 + `.offset(y:)` + `.timingCurve(0.338, 0.015, 0.395, 0.959, duration: 0.3)`
햅틱: 롤 자체에는 없음(hover 티저이지 확인이 아님). 실제 눌림에 tap
태그: button / tap / delight
규칙: OK. 단 **트리거를 hover에서 상태 변화·프레스로 재바인딩**해야 한다

**48. Base UI: Switch** · minimal · 2 · iOS 16
`https://motion.dev/examples/react-base-switch` · Matt Perry · 2025-07-30 · Motion+ 유료 게이트
무엇: 썸이 raw x-offset이 아니라 **레이아웃 속성**(CSS `justify-content`)을 애니메이션해 양 끝 사이를 이동. 스프링 + 레이아웃 애니메이션 구동.
신호: MotionScore B
Swift: 커스텀 `ToggleStyle` + `HStack` 안 조건부 `Spacer()` 배치, 또는 `matchedGeometryEffect`
햅틱: selection @ 토글
태그: toggle / tap / confirm
규칙: OK. 단 **iOS 표준 `Toggle`은 이미 시스템 햅틱을 자동 재생한다.** 그 위에 우리 햅틱을 덧대면 이중 발화

**49. Base UI: Checkbox** · minimal · 2 · iOS 16
`https://motion.dev/examples/react-base-checkbox` · Matt Perry · 2025-07-30 · Motion+ 유료 게이트
무엇: 체크하면 체크마크가 페이드인이 아니라 **획 단위로 그려진다**(path line 애니메이션).
신호: MotionScore C (렌더 비용 최하위 등급. 확인함)
Swift: `Path.trim(from:0,to:progress)` + `StrokeStyle(lineCap:.round, lineJoin:.round)`
햅틱: selection @ 체크
태그: toggle / tap / confirm
규칙: OK. 우리 success-check와 같은 기법의 작은 표면 버전

**50. Toggle Switch Animation (오버슈트 커브)** · minimal · 1 · iOS 16
`https://codepen.io/hnjungElis/pen/jOemoGv` · Hana · unknown · CodePen 기본 MIT
무엇: 순수 CSS 체크박스 스위치. 트랙 색 `.3s cubic-bezier(.4,0,.1,1.4)`(살짝 오버슈트), 썸 위치 `.3s cubic-bezier(.175,.885,.32,1.275)`(전형적 ease-out-back). `:active`가 방향성 패딩을 더해 쥐었다 눌리는 느낌.
신호: unknown
Swift: 커스텀 `ToggleStyle` + 스프링
햅틱: selection @ 썸이 중앙을 넘는 순간(0.3s의 약 50%)
태그: toggle / tap / guide
규칙: OK. 이 세트에서 **네이티브 iOS 토글 물리에 가장 가까운** 값

**51. SF Symbols `symbolEffect` 전 계열** · minimal · 1 · iOS 17/18/26
`https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Animations` · Apple · 변경로그 2025-07-28(SF Symbols 7) · API는 무라이선스, **심볼 아트워크는 별도 약관**
무엇: 한 줄짜리 심볼 애니메이션 어휘가 버튼 상태에 그대로 대응한다. **Bounce**(이산, 완료 비트). 탄성 있게 잠깐 확대했다 복귀, 기본 1회 재생, 액션이 일어났음을 전달. **Pulse**(무기한, 진행 중). 투명도만 변화. **Breathe**. Apple이 차이를 명시: pulse는 투명도만, breathe는 투명도와 크기를 함께. **Variable color**. 레이어별 투명도를 점증. **Replace**(상태 전환). down-up(상태 변화 전달) / up-up(전진감) / off-up(다음 상태 강조), Magic Replace가 새 기본값. **Wiggle**. 놓칠 수 있는 변화나 CTA를 강조. **Draw On/Off**(SF Symbols 7). 가이드 포인트를 따라 그림. **타이밍 미공개**. ms 대신 `options`(`.repeat`, `.speed`)를 노출.
신호: iOS 17 이후 Apple 자체 앱 전반에 탑재
Swift: 가용성 **항목별로 다름**. bounce/pulse/variableColor/scale/appear/disappear/replace = **iOS 17**, wiggle/breathe/rotate = **iOS 18**, drawOn/drawOff = **iOS 26**
햅틱: `.bounce`+success(완료), `.wiggle`+error(거부), `.replace`+selection(토글). `SensoryFeedback`이 같은 의미 이름을 써서 **심볼 이펙트와 햅틱이 트리거 값 하나를 공유**할 수 있다. 정확히 우리가 노출해야 할 프리미티브
태그: button / tap·complete·error / guide
규칙: OK. **가장 싸고 안전하고 시스템 네이티브한 승리.** Apple 자체 한계: 애니메이션을 분별 있게 적용하라, 수가 너무 많으면 인터페이스를 압도한다. 대기 화면에 무기한 이펙트(pulse/breathe/rotate)를 켜두지 말 것

**52. `.sensoryFeedback(_:trigger:)`** · minimal · 1 · iOS 17
`https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:)` · Apple / 해설 `https://swiftwithmajid.com/2023/10/10/sensory-feedback-in-swiftui/` (Majid Jabrayilov, 2023-10-10) · 플랫폼 API
무엇: 바인딩된 `Equatable` 트리거가 바뀔 때마다 시스템 햅틱을 재생. 클로저 오버로드로 전환 방향에 따라 피드백 종류를 바꿀 수 있다.
신호: 플랫폼 API
Swift: 전 케이스(내가 문서에서 직접 확인): `alignment` · `decrease` · `error` · `impact` · `impact(flexibility:intensity:)` · `impact(weight:intensity:)` · `increase` · `levelChange` · **`pathComplete`** · `press(_:)` · `release(_:)` · `selection` · `selection(_:)` · `start` · `stop` · `success` · `warning`
햅틱: 이 항목이 곧 햅틱 계층
태그: button / tap / confirm
규칙: flag: **포화.** 한 줄이면 끝나므로 단독 차별화 요소가 아니다
메모: `pathComplete`는 **스트로크 완주에 정확히 대응**하는 케이스다. 우리 success-check의 iOS 17 경로로 `.success`보다 의미가 정확하다

**53. 시스템 햅틱 어휘 (Notification / Impact / Selection)** · minimal · 1 · iOS 16
`https://developer.apple.com/design/human-interface-guidelines/playing-haptics` · Apple · 변경로그 2024-05-07 · 패턴, 무라이선스
무엇: 내가 직접 파싱해 확인한 3계열. **Notification**: Success(태스크·액션이 완료됨) / Warning / Error. **Impact**: Light / Medium / Heavy / Rigid(단단하고 비탄성인 객체의 충돌) / Soft(부드럽고 탄성 있는 객체). **Selection**: UI 요소의 값이 변하는 중. 커스텀은 **transient**(탭·충격)와 **continuous**(지속 진동) 두 블록에 sharpness·intensity를 조합.
신호: 지원되는 모든 iPhone의 시스템 햅틱 계층
Swift: iOS 16은 `UIFeedbackGenerator` + `prepare()`, 커스텀이 진짜 필요할 때만 `CHHapticEngine`
햅틱: 이 항목이 곧 어휘 정의
태그: button / tap·complete·error / confirm
규칙: OK. Apple의 네 제약을 API에 강제할 것: ① 문서화된 의미대로만 ② 햅틱의 intensity·sharpness를 동반 애니메이션의 그것에 맞출 것 ③ 남용 금지 ④ 끌 수 있게 할 것
메모: **주의**. 표준 switch·slider·picker는 지원 iPhone에서 이미 시스템 햅틱을 자동 재생한다. toggle 계열 유닛은 이중 발화를 반드시 확인할 것

**54. iOS Messages 전송 버튼 (탭 = 전송, 길게 = 이펙트)** · minimal · 3 · iOS 17
`https://support.apple.com/en-us/104970` · Apple · 2026-09-15 · 패턴, 무라이선스
무엇: 작은 원형 버튼 하나가 두 의도를 지닌다. 탭하면 전송. 두 번째는 Apple의 지시 그대로. 메시지를 입력한 뒤 전송 버튼을 **길게 누르면** 커밋 전에 미리 볼 수 있는 이펙트 선택기가 열린다. 크래프트 교훈은 **표현적 경로가 기본 경로와 같은 픽셀 위의 롱프레스 뒤에 숨어 있다**는 것. 99%에게 비용이 0이다. **타이밍 미공개.**
신호: 모든 iPhone의 Messages에 탑재
Swift: `Button` + `LongPressGesture`를 `simultaneousGesture`로 합성(탭 보존) + `matchedGeometryEffect`로 시트 확대
햅틱: selection @ 롱프레스 임계값을 넘어 선택기가 나타나는 순간. "숨은 걸 찾았다"의 비트. **평범한 탭 전송에는 햅틱 불필요**
태그: button / long-press / delight
규칙: OK. flag: Messages 특유의 파란 원형 화살표 외형은 재현하지 않는다. Apple Motion HIG: 앱에서는 빈번히 일어나는 UI 인터랙션에 모션을 더하는 것을 일반적으로 피하라. 전송은 빈번하다 → **기본 탭은 조용하고, 장식은 의도적 롱프레스에만**

**55. 카메라 셔터 버튼** · minimal · 4 · iOS 17
`https://developer.apple.com/documentation/avfoundation/avcapturephotocapturedelegate/photooutput(_:willcapturephotofor:)` · Apple · 미상(API는 iOS 10.0+) · 패턴, 무라이선스
무엇: **플랫폼이 애니메이션을 걸 정확한 프레임을 준다.** Apple 문서: photo output이 이 메서드를 촬영의 최초 순간에 최대한 가깝게 호출하며, 셔터음이 켜져 있으면 셔터음 재생 직후에 호출된다. 즉 시각 셔터(링 수축·흰 플래시·썸네일 비행)는 탭 핸들러가 아니라 **`willCapturePhotoFor`가 구동**해야 하고 오디오와 동기화된다. **타이밍 미공개.**
신호: 모든 iPhone의 Camera에 탑재. 델리게이트 훅은 공개 AVFoundation API
Swift: 2겹 링/디스크 `.scaleEffect`+`.opacity`, 흰 플래시 오버레이, `matchedGeometryEffect` 썸네일 비행, `keyframeAnimator` 수축→유지→해제
햅틱: **impact(rigid)** @ `willCapturePhotoFor`. Apple 정의상 단단하고 비탄성인 객체의 충돌, 셔터가 정확히 그것이다
태그: button / tap / confirm
규칙: OK. 일부 지역에서 셔터**음**은 법적 의무이며 음소거할 수 없다. 햅틱은 대체재가 아니라 가산이어야 한다
메모: **"시각과 촉각을 무엇에 동기화할 것인가"의 모범 사례.** 우리 타이밍 층 주장을 플랫폼이 직접 뒷받침한다

**56. Airbnb 위시리스트 하트** · minimal · 1 · iOS 17
`https://medium.com/airbnb-engineering/introducing-lottie-4ff4a0afac0e` · Airbnb (Brandon Withrow 외) · 2017-02-01 · 패턴 무라이선스 / lottie-ios는 **Apache-2.0**
무엇: Airbnb가 위시리스트 하트를 캐싱할 가치가 있는 작고 빈번한 애니메이션의 원형으로 직접 지목한다. 더 중요한 주장은 **왜 Lottie를 만들었는가**. 디자이너가 After Effects 애니메이션을 iOS/Android/RN/Web에 네이티브로 보내게 해서 엔지니어가 재구현하지 않게 하려고. **타이밍 미공개.**
신호: Airbnb에 탑재. 다운로드·평점 수치는 unknown
Swift: 손으로 짜면 `Image(systemName:"heart.fill").symbolEffect(.bounce, value: isSaved)` + `.foregroundStyle` 크로스페이드 + 1회 `scaleEffect` 오버슈트. 난이도 1
햅틱: **selection** @ 상태 반전. 되돌릴 수 있고 빈번하므로 success를 받을 자격이 없다
태그: card / tap / delight
규칙: OK. flag: Lottie를 실제로 탑재한다면 Apache-2.0 귀속 고지 준수
메모: **전략적으로 우리와 정반대 갈림길.** Airbnb는 디자이너가 저작해야 한다고 결정했고 우리는 코드를 택했다. 이유를 말할 수 있어야 한다. **Lottie JSON은 우리 타겟 유저가 명시적으로 사지 않겠다고 한 블랙박스다**

**57. Things 3 체크박스 완료** · minimal · 2 · iOS 17
`https://culturedcode.com/things/blog/2023/09/interactive-widgets-and-more/` · Cultured Code · 2023-09-18 · 패턴, 무라이선스
무엇: **증거 한계를 먼저 밝힌다**. 찾은 1차 자료는 홈 화면 **위젯** 체크박스에 대한 것이고 앱 내 리스트 체크박스가 아니다. 앱 내 모션에 대한 1차 진술은 일반론뿐이다(모든 동작이 pop을 위해 잘 애니메이션되며, 자체 제작 애니메이션 툴킷으로 구현). 체크 획의 정확한 커브에 대한 더 구체적인 것은 관찰이나 역공학이므로 **의도적으로 생략**. **타이밍 미공개.**
신호: App Store 리스팅 **4.8 · 28K Ratings**, 2017 Apple Design Award
Swift: `Path.trim` + `StrokeStyle(lineCap:.round)` + 박스의 짧은 `scaleEffect` 오버슈트. 한 줄 버전은 `.contentTransition(.symbolEffect(.replace))`
햅틱: 의미 있는 태스크면 success. **빠르게 연속 체크하는 목록이면 impact(.light)로 강등**. 열 개를 끝내는 것이 열 번의 결제처럼 느껴지면 안 된다
태그: list-item / tap / confirm
규칙: OK. flag: 이 항목은 위젯 글 + 일반 진술에 기대므로 21번(Magic Plus)보다 **근거가 약하다**

---

### 2.3 showy: 축하하고 주목을 끄는 것 (27)

**58. Spotify · 하트/좋아요 버튼**. showy(절제됨) · 3 · iOS 17
`https://medium.com/spotify-design/bringing-the-spotify-heart-to-life-e31440625d7` · Spotify Design (Heiko Winter, Roy Marmelstein, Fabiano Souza) · 2020-07-08 · 패턴 무라이선스, 하트 아트워크·브랜드 그린은 브랜드 자산
무엇: **이번 조사 전체에서 유일하게 숫자를 공개한 서드파티 자료.** Spotify 원문: 스냅함과 유려함의 균형을 찾기 위해 **최대 500밀리초, 60fps**를 목표로 삼았다. 해커톤 과제로 시작해 Encore 디자인 시스템의 모션 원칙("Move with purpose", "Provide feedback", "Add delight")에 맞춰 설계, 프레임 수가 아니라 **밀리초 단위로 작업하려고** Inspector Spacetime 플러그인으로 After Effects 작업 후 Lottie로 내보냄. 햅틱은 의도적으로 단순하게. **커스텀 Core Haptics 대신 "iOS 네이티브 피드백"**을 택했다(하위 호환성과 단순성).
신호: App Store 리스팅 원본 스크레이프 **4.8 · 42M Ratings · Chart #1 Music**. 통화성 주의: 같은 리스팅의 리뷰들이 하트가 이후 플러스로 교체됐다고 언급 → **설계 과정과 타이밍 예산의 출처**로 쓰고 현재 UI 설명으로 쓰지 말 것
Swift: 싼 버전은 `symbolEffect(.bounce, value:)`, 진짜는 `keyframeAnimator`(예비동작-오버슈트-정착) + `Canvas` 파티클 링 + `foregroundStyle` 크로스페이드. 전부 500ms 천장 안에서
햅틱: selection 또는 impact(.light) @ 스케일 피크
태그: button / tap / delight
규칙: OK. flag: Spotify 고유 하트 실루엣·브랜드 그린 복제 금지
메모: **500ms / 60fps를 공개 예산으로 채택할 것.** 이 클러스터에서 유일하게 공개된 서드파티 타이밍이고, 우리 실측치를 비교할 공개 벤치마크가 된다. 그리고 **Spotify가 커스텀 햅틱 대신 시스템 피드백을 택한 것은 우리 접근의 직접 검증**이다

**59. Instagram / X · 하트와 더블탭 버스트**. showy · 4 · iOS 17
`https://blog.x.com/2015/hearts-on-twitter` + `https://www.instagram.com/reel/DHTj46Ppu9q/?hl=en` (Adam Mosseri, 인스타그램 총괄) · Twitter 2015-11-03 / Mosseri 2025-03-17 · 패턴 무라이선스, **두 시각 서명 모두 강하게 브랜드 식별됨**
무엇: Twitter 2015 글은 **근거 자료이지 애니메이션 자료가 아니다**. 하트가 언어·문화·시간대를 가로질러 통하는 보편적 기호라는 주장. Instagram 쪽 유일한 1차 자료는 Mosseri가 더블탭 좋아요 애니메이션을 최근 갱신했고 **플랫폼에 따라 Android와 iOS가 조금 다르다**고 확인한 것. 크로스플랫폼 라이브러리에 의미 있는 확인이다. Instagram은 공유 에셋 하나가 아니라 **플랫폼별로 다른 좋아요 애니메이션을 의도적으로 배포**한다. **양사 모두 타이밍 미공개.** 유명한 Twitter 스프라이트시트 버스트는 Twitter가 공개한 적이 없고 관련 레포도 없다. 유통되는 모든 해부는 서드파티 역공학이다
신호: unknown (조회 안 함, 추정 안 함)
Swift: `.onTapGesture(count: 2)` + 큰 일시적 `heart.fill` 오버레이 + `keyframeAnimator`(0→오버슈트→정착→페이드) + `Canvas` 파티클 링 + **`.allowsHitTesting(false)`로 버스트가 다음 탭을 먹지 않게**
햅틱: impact(.light) @ 버스트 스케일 피크. 좋아요는 되돌릴 수 있고 빈번하므로 **success 자격 없음**
태그: card / tap / delight
규칙: flag: **trade dress. 재해석만.** 메커니즘(하트가 차고 오버슈트하고 파티클을 뿜음)은 일반적이다. 일반적이지 않은 것은 Instagram·X 하트의 **특정 실루엣 + 버스트 안무**이며, 문서나 마케팅에서 "Instagram 스타일"이라 부르는 순간 일반 메커니즘이 브랜드 연상으로 바뀐다

**60. Robinhood · 밀어 올려 제출, 그리고 철회된 축하**. showy · 4 · iOS 17
`https://robinhood.com/us/en/support/articles/buying-a-stock/` + `https://robinhood.com/us/en/newsroom/a-new-way-to-celebrate-with-robinhood/` · Robinhood · 지원 문서 날짜 미상 / 뉴스룸 2021-03-31 · 패턴, 무라이선스
무엇: 같은 회사에서 나온 **두 발견이 짝을 이룰 때 이 카탈로그에서 가장 교훈적이다.** ⑴ **확인 슬라이드는 실재하고 1차 문서화돼 있다**. 주문을 검토한 뒤 "swipe up to submit your order". 주목할 비대칭: **웹 흐름은 평범한 Buy 버튼 탭**이고, 의도적 제스처는 오탭 가능성이 높은 **폰에만** 남겨뒀다. ⑵ **축하는 제거됐다**. 과거에는 첫 거래·첫 현금관리·추천 성공에 **같은 컨페티 디자인을 재사용**했고, 이제는 이정표별로 다른 동적 경험을 도입한다고 자사 발표. **Robinhood는 컨페티를 뺀 이유를 명시하지 않았다**. 널리 유통되는 게임화 설명은 그 페이지에 없으며 여기서 출처로 쓰지 않는다. 1차 사실은 **고침의 형태**다: 모든 "처음"에 재사용되던 하나의 범용 축하가 이정표별 축하로 대체됐다
신호: unknown
Swift: `DragGesture` 1:1 추종 + 임계값 + 노브 뒤를 채우는 트랙 + 끝을 넘을 때 고무줄 반응(WWDC18-803의 soft boundaries) + `matchedGeometryEffect`로 노브를 성공 글리프로 모프
햅틱: selection @ 노브가 커밋 임계값을 넘을 때(놓기 전에 커밋 지점을 느끼게) → success @ 해소 글리프. 축하 내내 반복 패턴은 절대 금지
태그: button / swipe / confirm
규칙: flag. trade dress가 아니라 **판단의 경계.** 우리는 reward burst를 히어로 유닛으로 지목했고 Robinhood는 공개된 반례다: 균일하고 빈번하며 **금전적으로 중대한 행동에 붙은 축하는 딜라이트가 아니라 조작으로 읽힌다.** Apple Feedback HIG의 한계와 합치면 결론은 "컨페티를 만들지 마라"가 아니라 **"버스트를 벌어서 받게, 맥락에 맞게, 드물게, 건너뛸 수 있게 만들어라"**

**61. Material Design: Ripple** · showy · 3 · iOS 16
`https://motion.dev/examples/react-material-design-ripple` · Matt Perry · 2025-08-16 · Motion+ 유료 게이트
무엇: 탭하면 **정확한 접촉 지점에서** 원형 리플이 퍼져 나가며 사라진다. 누를 때마다 마운트/언마운트.
신호: MotionScore A
Swift: 탭 지점(`DragGesture(minimumDistance:0)`)에 `Circle()` 배치 → `.scaleEffect` 0→약 3 + `.opacity` 1→0
햅틱: tap @ 터치다운
태그: button / tap / confirm
규칙: flag: **포화**(아래 62번). 그리고 리플은 **Android의 언어이지 iOS의 언어가 아니다**

**62. 클릭 리플 계열 (포화 확인)** · showy · 2~3 · iOS 16
`https://animate-ui.com/docs/components/buttons/ripple` (Animate UI) · `https://magicui.design/docs/components/ripple-button` (Magic UI, MIT) · `https://ui.aceternity.com/components/background-ripple-effect` (Aceternity) · `https://www.framer.com/marketplace/components/rippler-button/` (Framer, 무료)
무엇: 같은 메커니즘의 네 가지 구현. **Animate UI가 가장 정확한 수치를 공개**한다. 리플 **0.6s, easeOut, 기본 확장 10배**, 버튼은 `hoverScale` 1.05 / `tapScale` 0.95. Aceternity는 8×27 셀 격자에서 클릭한 셀부터 방사형 `--delay`로 opacity 0.4→0.8→0.4를 **200ms ease-out**으로 퍼뜨린다. Framer판은 리플 원점이 **커서 진입 지점**이라 터치에는 그대로 맞지 않는다(터치다운 좌표로 바꾸는 편이 오히려 정확하다. Android 자체 리플이 그렇다).
신호: Animate UI **4,326★**(GitHub API, 단 라이선스 배지는 MIT인데 GitHub 감지는 NOASSERTION. 재사용 전 원문 확인 필요) / Magic UI **22,359★ MIT** / Aceternity·Framer unknown
Swift: `Canvas`+`TimelineView` 확장 원, `.easeOut(duration: 0.6)`
햅틱: tap @ 터치다운, 리플 확장 시작 전
태그: button / tap / confirm
규칙: flag: **포화**(조사한 라이브러리 5곳 중 3곳 이상에 존재). 더 중요한 건 iOS 사용자에게 리플은 **낯선 플랫폼의 문법**이라는 점

**63. Kokonut UI · Particle Button**. showy · 4 · iOS 17
`https://kokonutui.com/docs/components/particle-button` · Dorian Baffier · unknown · **MIT**
무엇: 클릭이 **100ms 스케일 95% 퀵 프레스**를 발동한 뒤 **파티클 6개 버스트**. 각 파티클이 `[0, 1, 0]`으로 스케일하며 **0.1s 간격 스태거**, x축 ±20~70px / y축 위로 20~70px 이동, **총 600ms easeOut**, 이후 **1000ms 성공 상태**로 정착.
신호: **2,115★** (GitHub API)
Swift: `keyframeAnimator` 6개 파티클 뷰 + `.scaleEffect(0.95)` `duration: 0.1`
햅틱: burst @ 파티클 방출 t=0, success @ 600~1000ms 정착 구간
태그: button / tap / reward
규칙: OK. **Material 외에 가장 정확하게 명세된 타이밍.** 우리 reward-burst 파라미터의 직접 비교군(우리는 12~40 조각, 여기는 6개)

**64. Cool Mode (파티클 샤워)** · showy · 3 · iOS 16
`https://magicui.design/docs/components/cool-mode` · Magic UI · unknown · **MIT**
무엇: 클릭 지점에서 파티클 소나기(기본 원형, 커스텀 이모지·아바타 이미지 교체 가능)가 바깥으로 터진다. 수평 속도·상승 속도·크기·개수 조절 가능.
신호: 라이브러리 **22,359★** (컴포넌트별 수치 unknown)
Swift: `ZStack`에 파티클 N개, 랜덤 (vx, vy) → `.offset` + `.easeOut(0.6~0.8)` + 페이드. 개수가 많으면 `Canvas`+`TimelineView`가 효율적
햅틱: burst @ 탭
태그: button / tap / reward
규칙: OK

**65. ConfettiSwiftUI** · showy · 2 · iOS 16
`https://github.com/simibac/ConfettiSwiftUI` · Simon Bachmann · 최종 푸시 2026-01-05 · **MIT**
무엇: `.confettiCannon(trigger:num:confettis:colors:confettiSize:rainHeight:fadesOut:opacity:openingAngle:closingAngle:radius:repetitions:repetitionInterval:)`. `Int` 트리거가 증가하면 뷰 원점에서 설정 가능한 컨페티 버스트 발사. 조각 모양은 원/삼각형/사각형/슬림라인.
신호: **2,459★** (GitHub API)
Swift: 그 자체(Canvas 기반 파티클 렌더링)
햅틱: 내장 없음. 같은 트리거에서 `.success`를 수동 결합하는 것이 통상
태그: button / complete / reward
규칙: flag: **SwiftUI 튜토리얼에서 포화.** 게임화 튜토리얼의 기본 "축하" 참조 구현이 대개 이 패키지다
메모: **우리 reward-burst의 직접 경쟁자.** 우리 차별점은 조각별 질량·항력·회전 물리와 실측 공개

**66. Pow · SwiftUI 이펙트 라이브러리 전체**. showy · 1(사용) · iOS 16
`https://github.com/EmergeTools/Pow` (구 `movingparts-io/Pow`) · Moving Parts → EmergeTools · 생성 2022-07-25, 최종 푸시 2026-04-13 · **MIT**
무엇: **우리의 가장 가까운 직접 경쟁자.** 같은 SwiftUI, 같은 modifier 형식, 같은 목적. 이펙트 약 33개:
*Transitions*: Anvil, Blinds, Blur, Boing, Clock, Film Exposure, Flicker, Flip, Glare, Iris, Move, Pop, Poof, Rotate3D, Skid, Smoke, Snapshot, Swoosh, Vanish, Wipe
*Change Effects*: Glow, **Haptic Feedback**, Jump, Ping, Pulse, Rise, Shake, Shine, **Sound Effect Feedback**, Spin, Spray, Wiggle
*Conditional*: Push Down
신호: **4,397★ · 197 forks · MIT** (내가 GitHub API로 직접 확인)
Swift: `.changeEffect(.movingParts.boing, value:)`, `.transition(.movingParts.anvil)` 등 한 줄
햅틱: **별도 이펙트로 제공.** 즉 시각과 촉각을 각각 붙이고 **둘의 시간 관계는 개발자 몫**
태그: button / tap·complete / delight
규칙: flag: 개별 이펙트는 패키지를 임포트하면 난이도 1. 차별화 요소가 아님
메모: **전략적으로 가장 중요한 항목.** ① "SwiftUI로 버튼 이펙트를 만들었다"는 해자가 아니다(인디 1명이 무료로 증명) ② 우리 press와는 **부분 중복**(Pow는 값 변화에 발화, 실시간 `isPressed` 추종 아님. 사용자 ButtonStyle 위 합성도 없음) ③ **Spray가 우리 reward-burst와 정면 충돌** ④ **check/checkmark라는 이름의 이펙트가 하나도 없다. success-check는 빈칸** ⑤ Pow는 성능·레이턴시 수치를 공개하지 않는다

**67. Heart Burst** · showy · 4 · iOS 16
`https://codepen.io/mattrothenberg/pen/apjZXz` · Matt Rothenberg · unknown · CodePen 기본 MIT
무엇: SVG 하트가 커스텀 `matrix3d` 스쿼시/오버슈트 바운스(**1s linear, 약 15개 키프레임 스톱으로 스프링 모사**)를 재생하며 빨강으로 차고, 동시에 mo.js가 ±90°/±45° 3조각 선형 "날개" 버스트 2세트(반경 0→150, **500ms**)와 8조각 점 버스트(반경 4→150, `quad.in`)를 **셋 다 동시에** 쏜다.
신호: unknown
Swift: **부분 불충실**. mo.js의 파티클별 커스텀 베지어 경로 이징에 SwiftUI 등가물 없음. `.spring(response:0.3, dampingFraction:0.45)` + 스태거된 `.easeOut` 파티클 8~12개로 근사
햅틱: burst(light+rigid 상승형 더블탭) @ 탭, 바운스 피크에 동기
태그: button / tap / reward
규칙: OK. 단 **1s는 Spotify의 500ms 천장을 두 배 초과**

**68. "Boop" 원샷 스프링** · showy · 2 · iOS 16
`https://www.joshwcomeau.com/react/boop/` · Josh W. Comeau · 2020-11-23 (2025-08-21 갱신) · 산문 내 훅
무엇: 스스로 리셋되는 원샷 탄력 넛지. 스프링 설정 **tension 300, friction 10**, booped 상태는 기본 **150ms** 후 리셋. rotation(10~20deg)·scale(1.4, 1.1)·translate(y:10)을 조합. **접근성이 훅에 내장**. `usePrefersReducedMotion()`이 빈 스타일 객체를 반환해 모션이 아예 생기지 않는다.
신호: 저자 신뢰도. 훅 자체의 별점은 unknown(독립 레포 아님)
Swift: 환산 **`.spring(duration: 0.36, bounce: 0.71)`** (내가 재계산 검증). 아이콘이면 `.symbolEffect(.bounce)`가 가장 가까운 1st-party 유사물
햅틱: tap @ boop 시작
태그: button / tap / delight
규칙: flag: 웹판은 **hover에 발화**. iOS에서는 tap으로 재바인딩. 150ms 자동 리셋과 reduced-motion 탈출구는 둘 다 우리 규칙에 부합

**69. Jhey의 계량된 바운스 커브 + 80ms 스태거** · showy · 2 · iOS 17
`https://www.jhey.dev/demos/2025/apple-disclosures/` · Jhey Tompkins · 2025 · 데모 페이지, LICENSE 없음
무엇: 스프링을 측정된 제어점으로 인코딩한 CSS `linear()` 이징. **36.95%에서 1.0527로 오버슈트**(약 5.3%) 후 1.0468(42.53%) → 1.015(58.45%) → 1.0045(67.2%) → .9987(80.44%) → 1로 정착. 항목별 스태거는 **80ms**. 상태 변화에는 이 커브를 안 쓰고 평탄한 `transition: background .2s`를 쓴다.
신호: 저자는 전 Google Chrome CSS/UI 팀, 현 Vercel 디자인 엔지니어. 구체 수치는 unknown
Swift: `linear()` 스톱은 샘플링된 스프링이므로 키프레임 표가 아니라 **스프링으로 이식** → **`.spring(duration: 0.6, bounce: 0.31)`** (내가 재계산 검증). 스태거는 `.delay(Double(index) * 0.08)`
햅틱: 트리거에 tap **1회만**. 스태거된 항목마다 하나씩은 절대 금지
태그: list-item / appear / guide
규칙: flag: `appear` 트리거 + 총 약 1.85s는 응답 예산 초과. **이식할 부분은 bounce 0.31 값과 80ms 스태거**이고, 1.05s/1.25s 진입 지연은 아니다

**70. Dots Morph Button** · showy · 4 · iOS 16
`https://motion.dev/examples/react-dots-morph-button` · Yenis Lebzar · 2026-03-06 · Motion+ 유료 게이트
무엇: 점 4개가 스프링 SVG path 모핑으로 교차하는 선(X/닫기 글리프)이 된다. 막대가 아니라 점에서 만든 햄버거→닫기 변환.
신호: MotionScore B
Swift: **점대점 path 모핑은 SwiftUI `Shape`에 네이티브가 아님.** `Canvas`+`TimelineView`로 매 프레임 점 위치를 보간하거나, 독립 도형 4개를 각각 애니메이션
햅틱: selection @ 모프(토글 의미)
태그: button / tap / guide
규칙: OK

**71. Floating Action Button (스태거 펼침)** · showy · 3 · iOS 16
`https://motion.dev/examples/react-floating-action-button` · Matt Perry · 2026-03-05 · Motion+ 유료 게이트
무엇: FAB를 탭하면 액션 항목들이 한꺼번에가 아니라 **차례로** 스프링하며 세로 스택으로 펼쳐진다(각자 툴팁 라벨 보유).
신호: MotionScore A
Swift: `.transition(.move(edge:.bottom).combined(with:.opacity))` + `withAnimation(.spring().delay(Double(index) * 0.05))`
햅틱: tap @ FAB 프레스 / 항목 선택 시 selection
태그: button / tap / guide
규칙: OK
메모: Cult UI에 **FamilyButton**(Family에서 영감받은 확장 FAB, `https://www.cult-ui.com/docs/components/family-button`, MIT)이라는 같은 패턴의 사촌이 있다. 후속 조사 가치 있음

**72. Radial Menu** · showy · 3 · iOS 16
`https://motion.dev/examples/react-radial-menu` · Matt Perry · 2026-03-05 · Motion+ 유료 게이트
무엇: 중앙 버튼을 탭하면 메뉴 옵션이 원형 배치로 부채꼴 펼쳐지고, 각 항목이 극좌표 위치로 항목별 지연을 두고 스프링.
신호: MotionScore S
Swift: `x = r·cos(θᵢ)`, `y = r·sin(θᵢ)` 사전 계산 후 중앙에서 `.offset` + `.spring()` + 인덱스별 `.delay()`
햅틱: tap @ 열림 / 선택한 항목에 selection
태그: button / tap / guide
규칙: OK

**73. Context Menu (safe-zone cone)** · showy · 4(커스텀)/1(네이티브) · iOS 16
`https://motion.dev/examples/react-context-menu` · Matt Perry · 2026-03-03 · Motion+ 유료 게이트
무엇: 롱프레스/우클릭으로 계단식 서브메뉴가 있는 맞춤 컨텍스트 메뉴를 연다. 대각선 **safe-zone 원뿔**이 인접 서브메뉴로 향하는 포인터 이동을 추적해 대각선 이동 도중 메뉴가 조기에 닫히지 않게 한다.
신호: MotionScore A
Swift: 네이티브 `.contextMenu { }`(iOS 13+)가 기본 케이스 커버. **불충실**: safe-zone 원뿔은 메뉴와 서브메뉴 사이의 연속 추적 마우스 궤적을 전제한다. **직접 터치에는 그런 hover 경로가 없어** 붙일 데가 없고 평범한 롱프레스 메뉴로 퇴화한다(시각적 계단식 스프링은 재현 가능, 원뿔 로직은 불가)
햅틱: selection @ 롱프레스 인식
태그: list-item / long-press / guide
규칙: OK. 단 iOS에 네이티브가 있고 핵심 기법이 이식 불가

**74. Skiper UI · Apple Play Button**. showy · 3 · iOS 17
`https://skiper-ui.com/v1/skiper3` · Gurvinder Singh · unknown · **상업. 무료 티어 + $129 / $549 원타임**
무엇: 탭하면 원형 **60px** 재생 버튼이 전체 폭 **330px** "재생 중" 바로 펼쳐진다. 코드 샘플 원문: `width` 60→330, `scale: 0→1`, `y: "100%"→0`, `transition={{ type: "spring", bounce: 0.16 }}`. 테두리 반경은 내내 `9999`(알약).
신호: unknown (공개 GitHub 레포 미확인. 상업 컴포넌트 숍)
Swift: **`withAnimation(.spring(duration: 0.5, bounce: 0.16))`가 거의 1:1 이식**. iOS 17의 `spring(duration:bounce:)`이 bounce를 직접 받는다. `.frame(width:)` 모프 또는 `matchedGeometryEffect`
햅틱: tap @ 토글
태그: button / tap / delight
규칙: OK. iOS 자체 음악/팟캐스트 미니플레이어 확장을 그대로 본뜬 것이라 이 클러스터에서 가장 "제자리에 있는" 패턴
메모: **bounce 0.16**. Material 버튼(0.10)과 우리 success-check(0.28) 사이. 절제 대역의 또 하나의 독립 표본

**75. SmoothUI · Unlock Face ID**. showy · 4 · iOS 17
`https://smoothui.dev/docs/components/unlock-face-id` · Eduardo Calvo · unknown · **MIT**
무엇: 탭하면 Face ID 풍 시퀀스. 모서리 괄호와 도식적 얼굴 획이 `pathLength`로 스태거 드로잉, 스캔 중에는 클립된 둥근 프레임 안에서 스캔 밴드가 위아래로 스윕, 성공 시 글리프 전체가 **바깥으로 스프링**하고 체크마크가 `pathLength`로 자가 드로잉, 실패 시 destructive 레드 + **1회 셰이크**. `prefers-reduced-motion` 폴백 완비: 획은 다 그려진 상태로 렌더(스태거 없음), 스캔 밴드 없음, 셰이크 없음, 전환은 즉시 스냅.
신호: **979★** (GitHub API)
Swift: `Path.trim` 드로잉 + `phaseAnimator`(idle/scanning/success/error) + `keyframeAnimator` x축 셰이크
햅틱: success @ 글리프 스프링아웃 / error @ 셰이크 시작
태그: button / tap / confirm
규칙: OK. **reduced-motion 폴백 서술이 그대로 Swift `accessibilityReduceMotion` 분기로 옮길 만큼 충실하다.** 이 클러스터에서 접근성을 1급으로 다룬 드문 사례

**76. SmoothUI · Dot Morph Button**. showy · 3 · iOS 17
`https://smoothui.dev/docs/components/dot-morph-button` · Eduardo Calvo · unknown · **MIT**
무엇: 제출형 버튼의 idle → loading → success "모핑 점" 시퀀스. **터치 기기에서 hover 효과를 명시적으로 비활성화**하고 `prefers-reduced-motion`을 지킨다(기기 능력 감지를 문서가 명시).
신호: **979★**
Swift: `phaseAnimator([.idle,.loading,.success])` + `contentTransition(.symbolEffect)`
햅틱: success @ 모프 완료
태그: button / tap / confirm
규칙: OK. **이 조사 전체에서 터치 기기 hover 억제를 부가기능이 아니라 1급 기능으로 문서화한 거의 유일한 컴포넌트**

**77. Cult UI · Neumorph Button**. showy · 2 · iOS 16
`https://www.cult-ui.com/docs/components/neumorph-button` · nolly-studio · unknown · **MIT**
무엇: 3가지 크기의 뉴모픽 버튼. 누르면 부드러운 이중 그림자가 접히며 "눌려 들어간" 것으로 읽힌다. 문서가 animations.dev를 영감으로 표기하나 정확한 ms/이징은 미공개.
신호: **6,161★** (GitHub API)
Swift: `ButtonStyle`에서 shadow radius/offset 보간 + `.scaleEffect`. **SwiftUI에 진짜 inset shadow가 없어** 마스크 오버레이 트릭 필요
햅틱: tap @ 터치다운
태그: button / tap / delight
규칙: OK. 단 뉴모피즘은 특정 미감에 대한 강한 약속이라 컴포넌트 라이브러리의 중립 기본값은 아니다

**78. Squishy Button** · showy · 3 · iOS 16
`https://www.framer.com/marketplace/components/squishy-button/` · Nora Salem · unknown · Framer 마켓플레이스 **무료**
무엇: 젤리 같은 가장자리가 커서 근접도에 계속 반응하는 "소프트 피직스" 버튼. **반응 반경·부드러움·stiffness·damping을 조절 파라미터로 노출.**
신호: unknown (설치 수 미표시)
Swift: stiffness/damping이 `.spring(response:dampingFraction:)`에 거의 1:1. **이 조사에서 가장 깨끗한 소스→SwiftUI 번역.** 단 연속 커서 추종 변형은 터치 등가물 없음 → 프레스 1회 스쿼시&스트레치로 단순화
햅틱: tap @ 프레스(스쿼시) / selection @ 해제(반동 정착)
태그: button / long-press / delight
규칙: flag: **too showy**. 연속 커서 추종 변형은 웹 hover 장식. 이식 가능한 핵심은 프레스 시 스쿼시&스트레치뿐

**79. Motion Button / Shift Button (Framer)** · showy/minimal · 1~2 · iOS 16
`https://www.framer.com/marketplace/components/motion-button/` (Kimaya M, **상업 $3**) · `https://www.framer.com/marketplace/components/shift-button/` (Soyeb, 무료)
무엇: Motion Button은 hover 시 이중 텍스트 교체 + 밑줄 전환 + 애니메이션 화살표, 속도·이징을 커스터마이즈 파라미터로 노출. Shift Button은 hover 시 스프링 바운스로 왼쪽 이동하며 방향 화살표 노출("optimized spring transitions"). **양쪽 다 정확한 타이밍 미공개.**
신호: unknown (구매·설치 수 미표시)
Swift: 밑줄은 `matchedGeometryEffect`, 텍스트 교체는 `contentTransition`, 이동은 `.offset(x:)` + 스프링
햅틱: selection @ 프레스(hover 대체)
태그: button / tap / convert
규칙: flag: **hover 트리거를 프레스로 재바인딩 필요**

**80. Brutal Button / Rive 커뮤니티 상태 기계 3종** · showy · 2~3 · iOS 16
`https://rive.app/community/files/7022-13491-brutal-button/` (hardik.dhandhaliya, 2023-12-06) · `https://rive.app/community/files/7427-14273-like-button/` (hansel, 2024-01-05) · `https://rive.app/community/files/24681-46129-interactive-light-and-dark-mode-toggle/` (piyushkacha, 2025-10-27) · 전부 **CC BY 4.0**
무엇: 세 파일 모두 **불린 입력 + 트리거로 구동되는 상태 기계**다. Brutal Button은 `Hovered?` + `Click`(Fire), Like Button은 `Button_hover` + `Button_pressed`, 토글은 불린 `mode`. Like Button은 "웹이나 앱 사용"을 명시적 용도로 밝힌다. **전부 타이밍 미공개.**
신호: Like Button 리믹스 수 **1**(표시된 그대로). 나머지는 unknown(좋아요·조회 수 미표시)
Swift: **Rive 런타임 의존성 불필요**. 이미 상태 기계이고 그것이 SwiftUI의 사고 모델과 같다. 트리거→탭 제스처→`phaseAnimator`, 불린→`@State`. `hover` 입력은 터치 등가물이 없으니 버리거나 press-down 단계로 전용
햅틱: selection @ 프레스다운 / success @ Like 발화
태그: button·toggle / tap / reward·guide
규칙: Brutal Button만 flag: too showy(네오브루탈리즘 하드 섀도는 강한 미감 약속). 나머지 OK
메모: **Rive가 Dribbble보다 이식 가치가 높은 이유**. 렌더된 루프가 아니라 **이산 입력과 상태를 이미 명세**하고 있어서다

**81. Duolingo · 스트릭 이정표 축하**. showy · 5 · iOS 17
`https://blog.duolingo.com/streak-milestone-design-animation/` · Duolingo(자사 디자인 블로그) · 2022-01-21 · 패턴 무라이선스, **Duo와 피닉스 변신은 브랜드 캐릭터. 마스코트는 금지**
무엇: 축하가 이정표(7/30/100/365일)에 따라 **점증**하고, Duo가 피닉스로 변신하는 의도적 "파워업" 비트에 안착. 글은 채택되지 않은 컨셉들(Duo가 마시멜로를 굽는 안, 촛불을 든 안)을 거쳐 피닉스에 도달한 과정을 서술하며 **애니메이션에서는 타이밍이 전부**라고 명시하고 리듬과 에너지를 맞추려 여러 차례 패스를 돌렸다고 밝힌다. **타이밍 미공개**. 리듬 반복은 논하지만 프레임 수·지속시간·이징 곡선은 없음
신호: App Store 리스팅 **4.7 · 5.5M Ratings** + Editors' Choice 배지(페이지에 보이는 수치 그대로). DAU·다운로드 주장 없음
Swift: `Canvas`+`TimelineView` 파티클/에너지 필드, `keyframeAnimator` 다중 비트(예비동작→버스트→정착), `matchedGeometryEffect`로 탭한 요소에서 발사
햅틱: **success @ 첫 시각 피크, 그리고 멈춘다.** 수초짜리 축하 내내 임팩트를 난사하지 말 것
태그: card / complete / reward
규칙: flag: **trade dress. 재해석만.** Duo 유사 마스코트나 피닉스는 절대 금지. 이식 가능한 원리는 **계층적 축하**. 같은 완료 이벤트라도 더 희귀한 이정표에 더 큰 응답을 주어 평상시를 싸게 유지
메모: 정직한 공백. **Duolingo의 CHECK 버튼과 콤보/XP 카운터에는 1차 자료가 없다.** 유통되는 설명은 전부 역공학이며 출처로 쓸 수 없다

**82. Apple Watch 활동 링 · 닫아서 축하하기**. showy · 5 · iOS 17
`https://www.apple.com/watch/close-your-rings/` + MIT 재현 `https://github.com/maxkonovalov/MKRingProgressView` · Apple / Max Konovalov · 날짜 미상 · 패턴 무라이선스 / 재현물 **MIT**
무엇: 보상 체계 전체가 **링 하나가 100%를 넘는 순간**이다. 링을 닫는 순간 전체 화면 축하가 발사되고 **지속되는 기록**(Fitness 앱의 트로피 케이스)이 남는다. 버튼 라이브러리에 주는 교훈: 축하는 탭이 아니라 **임계값 교차**로 벌어지며, 느낌이 애니메이션보다 오래 살도록 **지속되는 산물**을 남긴다. **Apple은 타이밍 미공개**(재현물 README의 0.5s는 데모 코드이지 사양이 아님)
신호: 모든 Apple Watch의 watchOS 활동/iOS 피트니스에 탑재. 사용자 수는 unknown
Swift: `Circle().trim` ×3 + `.rotationEffect(.degrees(-90))` + `StrokeStyle(lineCap:.round)` + `AngularGradient` + 끝점이 꼬리를 덮는 그림자 + `Canvas`+`TimelineView` 파티클 + `keyframeAnimator` 오버슈트 정착
햅틱: success @ 링 끝이 자기 시작점을 넘는 프레임. 닫힌 링은 "태스크 완료"의 문자 그대로의 사례
태그: card / complete / reward
규칙: flag: **Move/Exercise/Stand 3링 외형은 복제 금지**(강하게 Apple 식별됨). 가져올 것은 **임계값 교차 축하 + 지속되는 산물** 구조

**83. iOS 26 Liquid Glass 버튼 모프** · showy · 2(채택)/4(다중 형태 안무) · **iOS 26**
`https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views` + WWDC25 세션 219 · Apple · WWDC 2025-06, Materials HIG 갱신 2025-09-09 · 패턴 무라이선스. **API가 Apple 것이고 재질은 시스템 렌더라 `glassEffect` 사용은 모방이 아니라 승인된 것**
무엇: 컨트롤이 사각형이 아니라 부드러운 물성처럼 행동한다. 문서: 뒤 콘텐츠를 흐리고, 주변 색과 빛을 반사하며, 터치와 포인터에 **실시간 반응**한다. WWDC25 219 원문: 상호작용하면 재질이 **안에서부터 빛을 낸다**. 손끝 바로 아래에서 시작해 요소 전체와 인근 Liquid Glass 요소로 번진다. `GlassEffectContainer` 안의 개별 유리 형태들은 서로 섞이고 모프한다. **타이밍 미공개**. 대신 **간격** 수치를 준다(`GlassEffectContainer(spacing: 40.0)`, 값이 클수록 효과가 더 빨리 섞인다)
신호: iOS 26 / WWDC 2025부터 시스템 전반의 디자인 언어로 탑재. 채택 수치는 unknown
Swift: `.glassEffect(.regular.tint(.orange).interactive())`, `GlassEffectContainer(spacing:)`, `@Namespace` + `.glassEffectID(_:in:)`, `.glassEffectTransition(_:)`(기본 전환 타입이 `matchedGeometry`), `.glassEffectUnion(id:namespace:)`, `.buttonStyle(.glass)` / `.glassProminent`
햅틱: Apple이 유리 응답 자체에 문서화한 햅틱 **없음. 발광이 곧 피드백이다.** 모프가 상태 변화를 커밋할 때만 selection 추가. 유리 프레스마다 햅틱을 쌓지 말 것
태그: button / tap / delight
규칙: OK. Apple이 진짜 API를 쓰기를 원한다. Apple 자신의 과용 경고: 효과를 **아껴서** 쓰라, 여러 커스텀 컨트롤에 남용하면 콘텐츠에서 주의를 빼앗아 경험을 떨어뜨린다. 콘텐츠 레이어에는 쓰지 말라. 성능도. 컨테이너를 너무 많이 만들면 성능이 저하된다. **하드 버전 게이트: iOS 26+**이므로 우리는 비-유리 폴백 경로가 반드시 필요

**84. LottieFiles "Check Mark - Success"** · showy · 2 · iOS 16
`https://lottiefiles.com/free-animation/check-mark-success-h9SJbwh6ky` · Travis Gregory · 날짜 미상 · Lottie Simple License. **우리는 Lottie를 쓰지 않으며 인기 신호로만 참조**
무엇: 체크마크 드로우온 / 성공 아이콘 애니메이션. 태그는 button + icon + check + success. **타이밍 미공개.**
신호: **6.2K**. `/free-animations/button` 목록을 "Popular"로 정렬했을 때 **1위**(확인 시점 해당 카테고리 1,453개 중). 같은 목록 3위는 "Subscribe button animation" **2.9K**
Swift: **에셋을 임베드하지 말 것.** `Path` + `.trim(from:to:)` 또는 `symbolEffect(.bounce)`로 네이티브 재구현
햅틱: success @ 드로우온 완료
태그: button / complete / confirm
규칙: OK
메모: **이 조사 전체에서 가장 결정적인 단일 수치.** 최대 에셋 마켓에서 "button" 태그 **1위가 체크마크 성공**이고, 가장 가까운 SwiftUI 경쟁자(Pow)에는 **체크 이펙트가 아예 없다.** 수요 1위 × 경쟁 공백 = 우리 success-check가 서 있는 자리

---

## 3. 쇼트리스트: Swift로 먼저 만들 것 (13)

순위 기준은 넷의 곱이다: **신뢰**(독립 수렴 횟수 + 출처의 1차성) × **반응**(실제 인기 신호) × **적합**(우리 규칙과 장인 포지셔닝) × **실현**(난이도와 iOS 16 폴백 비용).

기존 프리미티브 = `press` · `success-check` · `reward-burst`. 아래에서 **NEW**는 새로 만들어야 하는 프리미티브다.

---

### 1위. `loading-morph`: 버튼이 대기를 삼킨다
**왜**: **6개 출처가 서로 모르고 같은 곳에 도착했다**. motion.dev Multi-state Badge, Aceternity Stateful Button(스스로 "Inspired by Family"), CodePen fxm90(실제 택시 호출 앱에 탑재), SmoothUI Dot Morph, Family의 라벨 모프, 그리고 **Apple HIG가 공식 권장**한다(버튼에 활동 표시기를 넣어 지연 이유를 전달하고 UI 공간을 아껴라, "Checkout" → "Checking out…"). 이 정도 수렴은 이번 조사에 다시 없다. 게다가 우리 v1 계획에 이미 있고 Primary CTA 레시피의 심장이다.
**프리미티브**: NEW `loading-morph` (+ 43번 blur-bridge를 얹으면 완성)
**태그**: surface=button / trigger=tap / intent=convert
**난이도 3** · minIOS 16(iOS 17이면 `phaseAnimator`로 훨씬 깨끗)
**햅틱 안무**: 로딩 **진입에는 아무것도 쏘지 않는다**(사용자가 방금 눌렀고 이미 안다) → 해소 시점에만 `.success` 또는 `.error`. 성공 햅틱은 **새 상태가 시각적으로 착지하는 프레임**에 붙인다(블러 시작이 아니라).
**주의**: 프레임을 고정해 행이 재배치되지 않게 할 것. 시스템 시트가 대기를 소유한 경우(결제 시트 등)에는 쓰지 않는다. Apple이 이중 표시기를 명시적으로 경고한다.

### 2위. `success-check`: 이미 가진 것이 가장 좋은 자리에 있다
**왜**: **수요 1위 × 경쟁 공백.** LottieFiles에서 "button" 태그 **인기 1위가 체크마크 성공(6.2K, 1,453개 중)**이고, 가장 가까운 SwiftUI 경쟁자 **Pow의 33개 이펙트에 check라는 이름이 하나도 없다.** 여기에 Apple Pay(gate-then-glyph), Things 3 체크박스, Base UI Checkbox, CodePen 원형로더, SmoothUI Face ID가 전부 같은 해소 형태로 수렴한다. **새로 만들 것이 아니라 근거를 붙이고 다듬을 것.**
**프리미티브**: 기존 `success-check`
**태그**: surface=button / trigger=complete / intent=confirm
**난이도 2**(개선) · minIOS 16
**햅틱 안무**: 현재 t=0.34에 `.success`(스트로크 완료 20ms 앞). 유지. **iOS 17 경로를 `.pathComplete`로 바꿀 것.** Apple이 이 케이스를 위해 만든 이름이고 `.success`보다 의미가 정확하다. iOS 16은 `UINotificationFeedbackGenerator(.success)` 폴백.
**추가할 것**: 스펙 시트에 **Spotify의 500ms / 60fps 천장**을 공개 벤치마크로 병기. 이 클러스터에서 유일하게 공개된 서드파티 타이밍이다.

### 3위. `hold-fill`: 파괴적 행동에는 시간을 요구한다
**왜**: **5개 독립 수렴**(motion.dev BKMN, Emil Kowalski, CodePen Aaron Iker, ReactBits Hold Button, Robinhood) 위에 **Emil이 완성된 설계도를 공개했다**. `clip-path 2s linear`(누름) / `200ms ease-out`(뗌) / `scale(0.97) 160ms ease-out`. 내가 원문에서 직접 확인했다. 그리고 **Robinhood의 1차 문서가 실제 배포를 입증**한다(폰에서는 밀어 올려 제출, 웹에서는 평범한 탭. 오탭 위험이 높은 곳에만 의도적 제스처). Apple Pay의 gate-then-glyph도 같은 구조다.
**프리미티브**: NEW `hold-fill`
**태그**: surface=button / trigger=long-press / intent=confirm
**난이도 3** · minIOS 16
**햅틱 안무**: `.start`(iOS17) 또는 impact(.light) @ 홀드 시작 → **중간에는 아무것도 없음**(틱을 넣고 싶어지지만 Apple의 남용 경고에 걸린다) → **`.success` @ 100% 채움, 시각 피크와 같은 프레임** → 중단 시 `.stop`(iOS17) 또는 무음.
**설계 주의**: **ReactBits의 고유 설계(액체 파고 마루, 글로우 충전, 그들의 파라미터 조합)는 가져오지 않는다**. 라이선스가 포팅 재배포를 금지한다(4장 참조). 출처를 Emil의 산문과 일반 패턴으로 기록할 것.

### 4위. `icon-swap` + `copy-confirm` 레시피: 개발자가 매일 누르는 버튼
**왜**: 수요가 가장 확실한 작은 표면이다. motion.dev Copy Button(MotionScore A), CodePen MrBlank, Vercel Geist가 전부 갖고 있다. **그리고 iOS 17의 `symbolEffect(.replace)`가 Magic Replace를 기본값으로 주므로 난이도가 낮다.** Apple이 down-up(상태 변화) / up-up(전진) / off-up(다음 액션 강조) 세 가지 의미까지 문서화해 놓았다. 우리가 의미별로 고를 수 있다.
**프리미티브**: NEW `icon-swap`
**태그**: surface=button / trigger=tap / intent=confirm
**난이도 2** · minIOS 16(17이면 한 줄)
**햅틱 안무**: `.success` @ 체크마크 등장 프레임. 되돌아가는 전환(체크 → 클립보드)에는 **햅틱 없음**. 사용자가 유발한 것이 아니라 타이머가 유발한 것이다.

### 5위. `label-roll`: 숫자와 라벨이 바뀌는 방식
**왜**: `contentTransition(.numericText(value:))`가 **방향을 델타에서 자동 추론**한다. 숫자가 오르면 위로, 내리면 아래로 굴러간다. 즉 **모션이 자릿수를 읽기도 전에 변화의 부호를 전달한다.** Cash App이 이것을 "Slide" / "Sequence"로 명명했고, Family가 같은 체계로 라벨을 모프하며, motion.dev의 Rolling Text Button이 MotionScore S다.
**프리미티브**: NEW `label-roll`
**태그**: surface=button / trigger=tap·complete / intent=guide
**난이도 2** · minIOS 17(16은 수동 오프셋 폴백)
**햅틱 안무**: **연속 업데이트에는 없음**(Apple의 남용 경고에 정면으로 걸린다). `.increase` / `.decrease`는 **사용자가 실제로 신경 쓰는 임계값을 넘을 때만**. Apple의 정의 자체가 "중요한 값이 유의미한 임계값을 넘어 증가/감소"다.
**주의**: `.monospacedDigit()` 필수. 안 하면 자릿수 폭이 흔들린다.

### 6위. `dual-intent`: 하나의 컨트롤, 두 개의 의도
**왜**: **이번 조사에서 가장 강한 구조 신호.** 독립적으로 설계된 Apple Design Award 급 제품 둘이 같은 형태에 도달했다. iOS Messages(탭=전송, 길게=이펙트 선택기)와 Things 3(탭=생성, 들어서=위치 지정). **기본 사용자에게 비용이 0**이고, 정밀한 버전은 압력으로 드러난다. 단일 축하보다 플래그십에 더 어울리는 근거다.
**프리미티브**: NEW `dual-intent`(제스처 합성 계층. 모션이 아니라 구조)
**태그**: surface=button / trigger=tap+long-press / intent=guide
**난이도 3** · minIOS 16
**햅틱 안무**: **기본 탭은 조용하다**(빈번한 인터랙션. Apple Motion HIG가 명시적으로 경고) → `.selection` @ 롱프레스 임계값을 넘어 두 번째 의도가 드러나는 순간. 이것이 "숨은 걸 찾았다"의 비트다.
**메모**: 이 유닛은 시각 효과가 거의 없다. **그래서 좋다**. "와우는 튀는 것이 아니라 정확한 것"의 실물 증거가 된다.

### 7위. `press` 정교화: 가진 것 중 가장 많이 쓰이는 것
**왜**: Apple이 원문으로 **의무화**한다("Always include a press state for a custom button"). 그런데 우리 현재 구현은 **단일 스프링**이고, 조사된 모든 좋은 구현은 **비대칭**이다. motion.dev press는 누름 stiffness 1000 / 뗌 500, Comeau는 들어감 125ms / 나옴 450ms, Emil은 0.97 @ 160ms ease-out.
**프리미티브**: 기존 `press` 개선
**태그**: surface=button / trigger=tap / intent=convert
**난이도 1** · minIOS 16
**햅틱 안무**: 현재대로 tap @ t=0, 시각보다 먼저(실측 3.3~6.0ms 웜). **iOS 17 경로를 `.press(.button)` / `.release(.button)`로 분기**하면 의미가 정확해진다.
**추가할 것**: 히트 영역 **44×44pt 보장**과 드래그아웃 취소·재결합(WWDC18-803 계약). 지금 이게 없으면 축하가 아무리 좋아도 기본이 깨진 것이다.

### 8위. `failure-shake`: 성공만 만들면 반쪽이다
**왜**: v1 프리미티브 계획에 이미 있고, SmoothUI Face ID가 성공/실패를 **한 쌍으로** 설계한 좋은 참조를 준다(성공=글리프 스프링아웃, 실패=destructive 레드 + 1회 셰이크). iOS 18의 `symbolEffect(.wiggle)`이 Apple 공식 경로이고 `.error` 햅틱과 의미가 정확히 맞는다.
**프리미티브**: NEW `failure-shake`
**태그**: surface=button / trigger=error / intent=guide
**난이도 2** · minIOS 16(iOS 18이면 `.wiggle` 한 줄, 그 이하는 `keyframeAnimator` x축)
**햅틱 안무**: `.error` @ 셰이크 **시작** 프레임(성공과 반대다. 실패는 즉시 알려야 하고 기다리게 하면 안 된다).
**규칙 주의**: `.wiggle`은 **진짜 검증 실패가 있을 때만.** 이유 없이 쏘면 주목 유도가 되어 우리 규칙 위반이다.

### 9위. `segment-morph`: 토글과 세그먼트의 정본
**왜**: 세 출처가 같은 기법으로 수렴한다. motion.dev Smooth Tabs(MotionScore A), Emil/Paco Coursey의 clip-path 트릭(Stripe 블로그에 실제 적용), motion-primitives Animated Background(**6,362★**). **Emil/Paco의 기법이 특히 좋다**: 활성 탭의 글자색을 전환하지 않고, 목록 전체를 복제해 사본을 영구 활성 스타일로 두고 활성 항목만큼만 클립한다. 색 보간의 추함을 아예 우회한다.
**프리미티브**: NEW `segment-morph` (`matchedGeometryEffect` + 마스크된 반전 사본)
**태그**: surface=toggle / trigger=tap / intent=guide
**난이도 3** · minIOS 16
**햅틱 안무**: `.selection` @ 선택 변경.
**⚠ 반드시 확인할 것**: **표준 `Toggle`·`Slider`·`Picker`는 지원 iPhone에서 이미 시스템 햅틱을 자동 재생한다**(Apple HIG 명시). 그 위에 우리 햅틱을 덧대면 **이중 발화**가 된다. 커스텀 `ToggleStyle`로 시스템 컨트롤을 대체하는 경우에만 우리가 쏜다.

### 10위. `swipe-confirm`: hold-fill의 형제
**왜**: Robinhood가 **1차 문서로** 배포를 입증한 유일한 확인 제스처다. 그리고 Sonner가 **속도 임계값 기법**(0.11 = |이동량|/소요시간, 드래그 중에는 `transition: none`으로 손가락 1:1 추종)을 MIT 소스로 공개했다. hold-fill과 프리미티브를 공유하므로 추가 비용이 작다.
**프리미티브**: `hold-fill` 재사용 + `DragGesture`
**태그**: surface=button / trigger=swipe / intent=confirm
**난이도 3** · minIOS 16
**햅틱 안무**: **`.selection` @ 커밋 임계값을 넘는 순간. 놓기 전이다.** 사용자가 손을 떼기 전에 커밋 지점을 촉각으로 확인하게 하는 것이 이 패턴의 핵심이고, Sonner의 선택도 같다. 그다음 `.success` @ 해소 글리프.
**구현 메모**: 드래그 중에는 애니메이션을 걸지 않는다(Emil이 중단 불가능성을 이유로 CSS keyframes를 거부한 것과 같은 이유). 끝을 넘어가면 고무줄 반응(WWDC18-803의 soft boundaries).

### 11위. `blur-bridge`: 유닛이 아니라 횡단 기법
**왜**: Emil이 공개한 작은 트릭 하나가 **위 유닛 셋을 동시에 개선한다.** 이징과 지속시간을 다 맞췄는데도 어색하면 `filter: blur()` **2px**를 상태 크로스페이드에 더한다. 근거: 블러가 옛 상태와 새 상태 사이의 시각적 간극을 메운다, 없으면 별개의 두 물체로 보인다. motion.dev Copy Button도 독립적으로 블러 전환을 쓴다.
**프리미티브**: NEW 횡단 modifier (`loading-morph` · `icon-swap` · `success-check`에 적용)
**태그**: 해당 유닛을 따름
**난이도 1** · minIOS 16
**햅틱 안무**: 없음. 이것은 시각 계층 전용이다. **단 햅틱 발화 시점을 블러 시작이 아니라 새 상태 착지에 맞출 것.**

### 12위. `reward-burst` 맥락화: 히어로 유닛을 방어 가능하게
**왜**: 이미 만들었지만 **조사가 위험을 하나 드러냈다.** Robinhood는 모든 "처음"에 같은 컨페티를 재사용하다가 이정표별 축하로 교체했다. 축하가 균일하고 빈번하며 중대한 행동에 붙으면 딜라이트가 아니라 조작으로 읽힌다. Apple도 같은 선을 긋는다(충분히 중요한 활동에만 남겨둘 것). Duolingo가 **반대 방향의 해법**을 보여준다. 이정표(7/30/100/365일)에 따라 **점증하는 계층적 축하**.
**프리미티브**: 기존 `reward-burst` + `tier` / `skippable` 파라미터
**태그**: surface=button / trigger=complete / intent=reward
**난이도 3** · minIOS 16
**햅틱 안무**: **`.success` @ 첫 시각 피크, 그리고 멈춘다.** 수초짜리 축하 내내 임팩트를 난사하지 않는다(Apple 남용 경고 직격).
**비교군**: Kokonut Particle Button은 파티클 **6개** / 총 600ms. 우리는 12~40개 / ≤1s. Spotify 천장은 500ms. **우리가 가장 화려한 쪽에 있다**. 의도한 것인지 스펙 시트에 명시할 것.

### 13위. `glass-morph`: iOS 26 대응 (조건부)
**왜**: 재웅의 "최신 버전 기준" 지시에 따른 항목이고, **Apple이 진짜 API를 쓰기를 원한다**(재질이 시스템 렌더라 `glassEffect` 사용은 모방이 아니라 승인된 것). `GlassEffectContainer` 안의 형태들이 서로 모프하는 것은 우리 `matchedGeometryEffect` 모델과 정확히 같다(기본 전환 타입이 실제로 `matchedGeometry`다).
**프리미티브**: NEW. 기존 유닛 위에 얹는 선택 레이어
**태그**: surface=button / trigger=tap / intent=delight
**난이도 2**(채택) / 4(다중 형태 안무) · **minIOS 26**
**햅틱 안무**: **없음이 기본.** Apple은 유리 응답 자체에 햅틱을 문서화하지 않았다. **발광이 곧 피드백**이다. 모프가 실제 상태 변화를 커밋할 때만 `.selection`.
**조건**: iOS 26 하드 게이트이므로 **비-유리 폴백 경로가 필수**다. 그리고 Apple 자신의 과용 경고(아껴 쓸 것, 콘텐츠 레이어에 쓰지 말 것, 컨테이너를 너무 많이 만들면 성능 저하)를 유닛 문서에 그대로 실을 것. **13위인 이유**: 게이트가 높고 우리 iOS 16 계약과 가장 멀다.

---

### 쇼트리스트가 만드는 카탈로그 (현재 3 → 12)

| 층 | 유닛 | 상태 |
|---|---|---|
| 프리미티브 | `press` | 있음 → 비대칭 스프링·44pt·취소 보강 |
| | `success-check` | 있음 → `pathComplete` 적용 |
| | `reward-burst` | 있음 → tier·skippable 추가 |
| | `loading-morph` | **NEW 1위** |
| | `hold-fill` | **NEW 3위** |
| | `icon-swap` | **NEW 4위** |
| | `label-roll` | **NEW 5위** |
| | `failure-shake` | **NEW 8위** |
| | `segment-morph` | **NEW 9위** |
| | `blur-bridge`(횡단) | **NEW 11위** |
| 구조 | `dual-intent` | **NEW 6위** |
| 레시피 | Primary CTA · Copy · Hold to Confirm · Swipe to Confirm · Toggle | 프리미티브 조합으로 도출 |

v1 계획의 프리미티브 9개(press · loading morph · success check · failure shake · reward burst · label roll · hold fill · icon swap · enable fade) 중 **8개가 이 조사로 독립 검증됐다.** 계획에 없던 새 항목은 `segment-morph` · `blur-bridge` · `dual-intent` 셋이고, 계획에 있었으나 이번 조사에서 근거를 못 찾은 것은 `enable fade` 하나다.

### 값의 스펙트럼: 우리가 어디에 서 있는가

내가 각 출처의 스프링을 SwiftUI `bounce`로 환산해 정렬한 것이다(변환식과 검증은 5장 부록).

| bounce | 출처 | 성격 |
|---|---|---|
| 0.00 | Material `fast.effects`(damping 1, stiffness 3800) → `.spring(duration: 0.10, bounce: 0)` | 색·투명도, 튕김 없음 |
| 0.10 | **Material `fast.spatial`(damping 0.9, stiffness 1400) → `.spring(duration: 0.17, bounce: 0.10)`, Google이 버튼에 쓰는 값** | 극도로 절제 |
| 0.15 | Apple WWDC23 버튼 프레스 샘플 `.spring(duration: 0.5, bounce: 0.15)` | 절제 |
| 0.16 | Skiper UI Apple Play Button(원문 `bounce: 0.16`) | 절제 |
| **0.28** | **우리 `success-check` 링(response 0.28 / dampingFraction 0.72)** | **절제~중간** |
| 0.31 | Jhey의 계량 바운스 커브(오버슈트 5.27%) | 중간 |
| 0.68 | Comeau 스프링 입문(mass 1.75 / tension 200 / friction 12) | 장난기 |
| 0.71 | Comeau "boop"(tension 300 / friction 10) | 장난기 |

**판정: 우리 기본값은 이미 웹 크래프트 평균보다 절제돼 있고 Apple·Google 대역에 가깝다.** 장인 포지셔닝과 정합한다. 새 유닛은 **0.10~0.31 대역을 기본**으로 하고, `reward-burst` 계열만 예외적으로 위로 올린다.

### 지속시간 예산: 두 축을 분리할 것

| 축 | 값 | 출처 |
|---|---|---|
| 응답 **개시** 지연 (촉각) | ≤ 50ms | Kaaresoja 2014 (기존) |
| 응답 **개시** 지연 (시각) | ≤ 85ms | Kaaresoja 2014 (기존) |
| **피드백 완료**(제자리에서 변하는 것) | ≤ 300ms, 수렴값 **200ms ease-out** | Emil 2회 독립 진술 · Sonner 스와이프 해제 200ms · Emil 홀드 해제 200ms · Jhey 상태 변화 .2s |
| **운송 완료**(표면이 이동하는 것) | 400~500ms | Sonner 400 · Vaul 500(둘 다 저자가 의도적 예외로 방어) |
| 좋아요류 마이크로 인터랙션 천장 | **500ms / 60fps** | Spotify Design 2020(공개된 유일한 서드파티 수치) |
| 햅틱 패턴 길이 | ≤ 150ms | Hampton & Hildebrand 2026 (기존) |
| Google 키클릭 햅틱 | 10~20ms | Android 햅틱 원칙 |

**현재 스펙 시트는 개시 지연만 적고 있다.** 완료 지속시간 축을 추가해야 "타이밍 층"이 완성된다.

---

## 4. 하지 않을 것

매력적이지만 뺀다. 사유별로 묶었다. **뺀 이유를 적어두는 목적은 나중에 같은 항목을 다시 검토할 때 처음부터 다시 판단하지 않기 위해서다.**

### 4.1 우리 규칙 위반 (자동 재생 · 루프 · 주목 유도)

| 항목 | URL | 사유 |
|---|---|---|
| Pulsating Button | `https://magicui.design/docs/components/pulsating-button` | **가장 명확한 위반.** 동심원이 1.5s 주기로 무한 확산, 인터랙션 불필요. 문서가 스스로 "for capturing attention"이라고 밝힌다. NN/g가 주목 유도 애니메이션을 다크 패턴으로 지목한 바로 그 형태 |
| Moving Border | `https://ui.aceternity.com/components/moving-border` | 마운트부터 2000ms 루프. 사용자 행동과 무관 |
| Shimmer Button | `https://magicui.design/docs/components/shimmer-button` | `shimmerDuration` 기본 3s 무한 루프 |
| Rainbow Button | `https://magicui.design/docs/components/rainbow-button` | 무지개 색상 무한 순환 |
| Skeleton shimmer | `https://motion.dev/examples/react-skeleton-shimmer` | 자동 루프 + **motion.dev 자체 렌더 비용 등급이 C**(내가 확인한 최저 등급) |
| Slide to Confirm의 셔머 | `https://codepen.io/arjunkalburgi/pen/dyyJMKO` | 4s 무한 셔머가 **드래그 진행과 무관하게** 정지 상태에서도 돈다. 슬라이드 제스처 자체는 10위로 채택하되 이 장식은 뺀다 |
| Tilt Card | `https://motion.dev/examples/react-tilt-card` | **다축 회전.** Apple Reduced Motion 평가 기준이 명시적으로 끄거나 대체하라고 지목한 형태. 우리 규칙에서 처음부터 제외 |
| GLITCH (RGB 분할) | `https://uiverse.io/212004ALJI/fat-eagle-24` | 어포던스가 아니라 기믹. 장인 포지셔닝과 정면 충돌 |

### 4.2 iOS에 존재하지 않는 입력에 의존 (hover / 커서)

**이것이 이번 조사의 가장 큰 발견 중 하나다.** 웹 카탈로그의 상당 부분이 **iPhone에 없는 입력을 전제**한다.

- motion.dev **cursor 카테고리 29개 전부**. cursor-follow, cursor-magnetic, magnetic-filings, bobble-hover, ios-pointer, cursor-trail, cursor-trail-velocity 등
- **uiverse 상위 12개 중 8개(67%)가 hover 전용**. Learn More, MENU, Hover me, P L A Y, Hover Over, Generate, GLITCH, Click me!. 노출·글로우·확장이 탭 기기에서는 **아예 발화하지 않는다**
- **Hover.dev 버튼 데모 18개 중 최소 12개**가 자기 프리뷰 텍스트에 문자 그대로 "Hover me"라고 적혀 있다
- Aceternity **Magnetic Button**. 커서를 향해 표류, 지속적 커서가 없으면 의미 없음
- Animate UI **Liquid Button**. 대표 효과인 액체 채움이 hover 전용
- Framer **Squishy Button** / **Rippler Button**. 연속 커서 근접도·진입 지점 의존
- motion.dev **Context Menu의 safe-zone 원뿔**. 메뉴와 서브메뉴 사이 마우스 궤적을 전제, **직접 터치에는 붙을 데가 없다**
- Emil의 **툴팁 그룹 즉시 표시**. hover 지연 개념 자체가 터치에 없음

**판정**: 이들을 "탭으로 재바인딩"하면 대개 **다른 인터랙션이 된다**(미리보기였던 것이 커밋이 된다). 개별적으로 가치를 재평가해야 하며, 목록째 이식할 대상이 아니다. 예외는 47번 Rolling Text Button과 C 클러스터의 Click me!(채움 스윕). 이 둘은 오히려 **프레스에 더 잘 맞는다**.

### 4.3 Swift에서 충실하지 못함

| 항목 | 웹 전용 트릭 | 대안 |
|---|---|---|
| Tactile Button (21st.dev) | **WebGL 프래그먼트 셰이더** 액체 출렁임 | iOS 17 Metal `Shader`/`.layerEffect`로만 가능. 난이도 5, 이식성 계약 위반(자기완결 파일 하나 불가) |
| Apple Intelligence Ripple | `mix-blend-mode` + `filter` + `mask-image` 조합 | 화면 왜곡 정체성을 잃지 않으려면 Core Image/Metal 필요. motion.dev 자체가 "Experimental"로 분류 |
| Day/Night Toggle의 구름 | `box-shadow` **15겹 복제** | 도형 2~3개로 재작화(토글 자체는 9번으로 채택) |
| Generate / Hover me의 inset glow | CSS `inset box-shadow` | **SwiftUI에 inset shadow 네이티브 없음.** 마스크 오버레이 해킹 필요 |
| Heart Burst의 파티클 경로 | mo.js 파티클별 **커스텀 베지어 경로 이징** | 스태거된 `.easeOut`으로 근사만 가능 |
| Download Button | 점진적 `backdrop-filter` blur + `letter-spacing` 애니메이션 | 전자는 `.ultraThinMaterial` 크로스페이드로 근사, 후자는 커스텀 Layout 필요 |
| Dots Morph Button | SVG **점대점 path 모핑** | SwiftUI `Shape`에 네이티브 아님. `Canvas` 프레임별 보간 필요 |

### 4.4 라이선스로 차단

| 출처 | 라이선스 | 판정 |
|---|---|---|
| **ReactBits** (Hold Button, Fuse Button) | **MIT + Commons Clause** | 원문: 컴포넌트 자체를 단독으로든 번들로든 **"as a ported version"**으로든 판매·서브라이선스·재배포할 수 없다. **"ported version"이 정확히 우리가 하려던 것.** 우리 카탈로그는 컴포넌트를 배포하는 것이므로 직격이다. → **출발점으로 쓰지 않는다.** 단 hold-to-confirm 패턴 자체는 ReactBits의 발명이 아니다(motion.dev BKMN 2025-03, iOS·게임 UI에 오래 존재), 일반 패턴으로 독립 구현은 가능 |
| **Aceternity UI** (Stateful Button 등) | Aceternity License | 원문: Item이나 **파생물을 어떤 마켓플레이스에서도** 판매·재판매·배포할 수 없고, 수정 여부와 무관하게 소스 파일을 재배포할 수 없다. ReactBits와 같은 구조의 문제 → **출발점으로 쓰지 않는다.** Stateful Button의 원천은 Aceternity가 스스로 밝힌 대로 Family다 |
| **motion.dev examples** | 형식 라이선스 문구가 사이트 어디에도 없음, 대부분 Motion+ 유료 게이트 | "무료로 볼 수 있다" ≠ "재사용 허가". → **"무엇이 존재하는가"의 지도로만 쓴다. 코드 출처로 쓰지 않는다** |
| **Dribbble 샷 전체** | 라이선스 없음 | 영감 전용. 게다가 조사한 4건 중 3건이 **에이전시 포트폴리오·데일리 챌린지 습작**이고 4건 전부 자동 재생 루프다. 데이터 소스가 아니라 무드보드 |
| **Skiper UI** | 상업($129/$549 원타임) | 공개 소스 레포 미확인. 다만 **공개된 코드 조각의 `bounce: 0.16` 값은 사실 참조로 인용 가능**(수치는 저작 대상이 아니다) |
| **Coss UI**(구 Origin UI) | **AGPL-3.0** | Origin UI 시절의 관대한 복붙 모델에서 변경됐다. 폐쇄 제품에 재사용 전 반드시 확인 |
| **Animate UI** | README 배지는 MIT, **GitHub 감지는 NOASSERTION** | 불일치. 재사용 전 라이선스 원문 확인 필요 |

**쓸 수 있는 것**: uiverse(**MIT**, 사이트 푸터 확인) · Magic UI(**MIT** 22,359★) · Sonner/Vaul(**MIT**) · ConfettiSwiftUI(**MIT**) · Pow(**MIT**) · exyte 계열(**MIT**) · SmoothUI(**MIT**) · Cult UI(**MIT**) · Kokonut UI(**MIT**) · Rive 커뮤니티(**CC BY 4.0**) · CodePen 공개 펜(기본 MIT, 펜별 확인) · Apple/Google 문서(패턴은 자유).

### 4.5 Trade dress: 재해석만, 복제 금지

1. **Apple Pay**. 가장 단단한 경계. Apple HIG 원문이 명시적으로 금지한다: 커스텀 Apple Pay 버튼 디자인을 만들거나 Apple 제공 디자인을 복제하려 하지 말 것, Apple Pay 마크를 뒤집거나 회전시키거나 애니메이션하지 말 것. → **gate-then-glyph 구조만** 가져온다
2. **Instagram / X 하트**. 메커니즘은 일반적이나 특정 실루엣 + 버스트 안무는 아니다. 문서·마케팅에서 "Instagram 스타일"이라 부르는 순간 일반 메커니즘이 브랜드 연상으로 바뀐다
3. **Duolingo**. Duo와 피닉스는 브랜드 캐릭터. **계층적 축하** 아이디어만
4. **App Store GET / OPEN**. 3상태 알약은 자유, **동사 쌍과 배지 아트워크는 아니다**
5. **Things 3 Magic Plus Button**. 버튼 외형과 "Magic Plus" 이름 재현 금지
6. **iOS Messages 전송 버튼**. 파란 원형 화살표는 Apple 식별, 이중 목적 컨트롤은 아니다
7. **SF Symbols 아트워크**. API로 애니메이션하는 건 승인되지만, 심볼이나 **혼동될 만큼 유사한 이미지를 앱 아이콘·로고·기타 상표 용도로** 쓰는 것은 금지
8. **Spotify 하트 실루엣·브랜드 그린**. 500ms/60fps 수치는 인용 가능, 외형은 아니다
9. **Apple Watch 활동 3링**(Move/Exercise/Stand 색 조합). 임계값 교차 구조만

### 4.6 포화 / 클리셰

- **테두리를 도는 그라디언트·샤인**. 조사한 라이브러리 **5곳 중 4곳**에 존재(Aceternity Moving Border·Hover Border Gradient, Magic UI Rainbow·Shimmer·Shine Border·Border Beam, 21st.dev Border Beam/Spinning Border/Glow Effect, Cult UI Border Beam). **이 클러스터 전체에서 가장 과대표된 버튼 애니메이션.** 게다가 전부 자동 루프
- **클릭 리플**. 5곳 중 3곳 이상. 그리고 더 중요한 건 **리플이 Android의 문법이지 iOS의 문법이 아니라는 것**. iOS 사용자에게는 낯선 플랫폼의 억양으로 읽힌다
- **`ButtonStyle` scale-on-press / `.spring(duration:bounce:)` / `symbolEffect(.bounce)` / `contentTransition(.numericText)` / `.sensoryFeedback`**. 전부 SwiftUI 튜토리얼 포화. **개별 API로는 차별화 불가.** 우리 가치는 이들을 안무하는 데 있지 보유하는 데 있지 않다
- **ConfettiSwiftUI 식 컨페티**. 게임화 튜토리얼의 기본 참조 구현. 우리 차별점은 조각별 물리와 실측 공개뿐이므로 **그 둘을 전면에 내지 않으면 구별되지 않는다**

### 4.7 이미 네이티브가 있어서 뺀 것

- **Swipe Actions**. `.swipeActions(edge:)`가 iOS 15부터 표준 케이스를 커버
- **Context Menu**. `.contextMenu { }`가 iOS 13부터 존재하고, 커스텀판의 핵심 기법(safe-zone 원뿔)은 터치에 이식 불가
- **Material state layer 8/10/10/16%**. 값은 유용하나 iOS는 `brightness`/`opacity` 관행이 이미 있다. 참조로만 보관

### 4.8 런타임 의존 (기존 결정 재확인)

**Lottie / Rive 런타임은 채택하지 않는다.** 이번 조사가 기존 결정을 보강한다:
- Airbnb가 Lottie를 만든 이유는 **디자이너가 저작하게 하려는 것**이었다. 우리 타겟 유저(코드가 읽히고 고쳐져야 산다)와 정반대 방향이다
- Spotify조차 하트를 Lottie로 내보내면서 **햅틱은 iOS 네이티브 피드백을 썼다**(하위 호환성과 단순성)
- Instagram은 좋아요 애니메이션을 **플랫폼별로 다르게** 배포한다. 단일 크로스플랫폼 에셋이라는 전제 자체가 최상위 제품에서 지켜지지 않는다
- **단, Rive의 상태 기계 모델은 배울 가치가 있다.** 런타임 없이 아이디어만. 모든 유닛을 명시적 `enum State` + 단일 `trigger` 값으로 모델링하면 햅틱이 상태 전이의 부수효과가 되어 **시각과 절대 어긋날 수 없다.** Duolingo가 Lottie 대신 Rive를 택한 이유도 실시간 상태 전이였다

---

## 5. 출처 목록

전부 **2026-09-23** 접속 확인. 클러스터별로 묶었다.

### motion.dev (경쟁 카탈로그 지도)
`https://motion.dev/examples`. 452 패턴, Buttons 15 entries = 6 concepts
`https://motion.dev/examples/react-multi-state-badge` · `/react-hold-to-confirm` · `/react-copy-button` · `/react-dots-morph-button` · `/react-material-design-ripple` · `/react-confetti` · `/react-add-to-basket` · `/react-rolling-text-button` · `/react-swipe-actions` · `/react-smooth-tabs` · `/react-base-switch` · `/react-base-checkbox` · `/react-floating-action-button` · `/react-radial-menu` · `/react-context-menu` · `/js-press` · `/react-number-counter` · `/react-loading-ripple` · `/react-todo-list` · `/react-skeleton-shimmer` · `/react-tilt-card` · `/react-apple-intelligence`

### 개인 장인 (가장 밀도 높은 수치 출처)
`https://emilkowal.ski/ui/7-practical-animation-tips` · `/building-a-hold-to-delete-component` · `/the-magic-of-clip-path` · `/great-animations` · `/you-dont-need-animations`. Emil Kowalski
`https://github.com/emilkowalski/sonner/blob/main/src/styles.css`. MIT, 12,995★, 주 37,931,079 npm
`https://github.com/emilkowalski/vaul/blob/main/src/constants.ts`. MIT, 8,619★, 주 28,630,372 npm
`https://animations.dev`. Emil의 강의(`/learn`은 로그인 게이트)
`https://www.joshwcomeau.com/animation/css-transitions/` · `/react/boop/` · `/animation/a-friendly-introduction-to-spring-physics/`. Josh W. Comeau
`https://rauno.me/craft/interaction-design` · `https://www.devouringdetails.com`. Rauno Freiberg
`https://www.jhey.dev/demos/2025/apple-disclosures/`. Jhey Tompkins
`https://benji.org/family-values`. Benji Taylor (Family), 2024-07-08
`https://paco.me/craft`. Paco Coursey (수치 없음, cmdk 12,984★ MIT)

### Apple 1차 자료
`https://developer.apple.com/design/human-interface-guidelines/buttons`. 44×44pt, press state 의무, 버튼 내 활동 표시기
`https://developer.apple.com/design/human-interface-guidelines/playing-haptics`. Notification/Impact/Selection 3계열
`https://developer.apple.com/documentation/swiftui/sensoryfeedback`. 17개 케이스, iOS 17.0+
`https://developer.apple.com/design/human-interface-guidelines/sf-symbols#Animations` · `https://developer.apple.com/documentation/symbols`. symbolEffect 가용성
`https://developer.apple.com/documentation/swiftui/contenttransition/numerictext(value:)`
`https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views` + WWDC25 세션 219
`https://developer.apple.com/videos/play/wwdc2018/803/`. Designing Fluid Interfaces (댐핑 100%/80%)
`https://developer.apple.com/design/human-interface-guidelines/apple-pay` · `/progress-indicators` · `/materials`
`https://developer.apple.com/documentation/avfoundation/avcapturephotocapturedelegate/photooutput(_:willcapturephotofor:)`

### 배포된 앱 (1차 자료만)
`https://medium.com/spotify-design/bringing-the-spotify-heart-to-life-e31440625d7`. **500ms / 60fps**, 2020-07-08
`https://blog.duolingo.com/streak-milestone-design-animation/` · `/world-character-visemes/`
`https://culturedcode.com/things/features/` · `/things/blog/2025/09/things-for-os-26/` · `/things/blog/2023/09/interactive-widgets-and-more/`
`https://robinhood.com/us/en/support/articles/buying-a-stock/` · `https://robinhood.com/us/en/newsroom/a-new-way-to-celebrate-with-robinhood/`
`https://medium.com/airbnb-engineering/introducing-lottie-4ff4a0afac0e`
`https://design.cash.app/motion`. 어휘 출처(자사가 제품 사양 아님을 명시)
`https://blog.x.com/2015/hearts-on-twitter` · `https://www.instagram.com/reel/DHTj46Ppu9q/?hl=en`
`https://www.apple.com/watch/close-your-rings/`

### SwiftUI 생태계 (GitHub API 실측)
`https://github.com/EmergeTools/Pow`. **MIT, 4,397★, 197 forks**, 생성 2022-07-25, 최종 2026-04-13
`https://github.com/simibac/ConfettiSwiftUI`. MIT, 2,459★
`https://github.com/exyte/PopupView`. MIT, 4,060★ · `https://github.com/exyte/AnimatedTabBar`. MIT, 553★
`https://github.com/GetStream/effects-library`. Apache-2.0, 364★(2023-02 이후 정체)
`https://www.hackingwithswift.com/quick-start/swiftui/` · `https://swiftwithmajid.com/2023/10/10/sensory-feedback-in-swiftui/` · `https://kavsoft.dev` · `https://designcode.io`

### 컴포넌트 레지스트리
`https://magicui.design/docs/components/`. **MIT, 22,359★**
`https://ui.aceternity.com/components/` + `https://ui.aceternity.com/licence`. 독자 라이선스
`https://reactbits.dev/c/micro/` + `https://api.github.com/repos/DavidHDev/react-bits/license`. **MIT + Commons Clause, 47,901★**
`https://motion-primitives.com/docs/animated-background`. MIT, 6,362★
`https://www.cult-ui.com/docs/components/neumorph-button`. MIT, 6,161★
`https://kokonutui.com/docs/components/particle-button`. MIT, 2,115★
`https://animate-ui.com/docs/components/buttons/ripple`. 4,326★(라이선스 불일치)
`https://smoothui.dev/docs/components/unlock-face-id` · `/dot-morph-button`. MIT, 979★
`https://coss.com/ui` (구 originui.com). **AGPL-3.0**, 10,618★
`https://skiper-ui.com/v1/skiper3`. 상업
`https://www.hover.dev/components/buttons`. 상업(18개 중 12개 hover 전용)
`https://21st.dev/@mengto/components/tactile-button`

### 커뮤니티 갤러리 (좋아요 수 실측)
`https://uiverse.io/buttons?orderBy=favorites`. **MIT**(푸터 확인)
`https://uiverse.io/Galahhad/strong-squid-82` 5.4K · `/Cevorob/good-wolverine-51` 3.5K · `/cssbuttons-io/massive-mayfly-74` 4.3K · `/gagan-gv/massive-goat-19` 1.9K · `/Navarog21/loud-bird-67` 1.8K · `/Navarog21/ordinary-rat-19` 1.8K · `/WhiteNervosa/popular-ladybug-27` 1.8K · `/AlimurtuzaCodes/average-liger-0` 1.7K · `/212004ALJI/fat-eagle-24` 1.6K · `/cssbuttons-io/stale-rattlesnake-87` 1.6K · `/alexroumi/shy-sloth-91` 1.6K · `/Priyanshu02020/popular-puma-87` 1.6K
`https://codepen.io/aaroniker/pen/WNNWQbM` · `/fxm90/pen/wJLjgB` · `/mattrothenberg/pen/apjZXz` · `/MinzCode/pen/pogqVVX` · `/designcouch/pen/OJPdZxg` · `/aaroniker/pen/BVMxVp` · `/scottloway/pen/yVRpQp` · `/hnjungElis/pen/jOemoGv` · `/MrBlank/pen/joQomM` · `/arjunkalburgi/pen/dyyJMKO` · `/IMJ/pen/bGxEpXe`
`https://rive.app/community/files/7427-14273-like-button/` · `/7022-13491-brutal-button/` · `/24681-46129-interactive-light-and-dark-mode-toggle/`. CC BY 4.0
`https://lottiefiles.com/free-animation/check-mark-success-h9SJbwh6ky`. **6.2K, "button" 태그 인기 1위**
`https://www.framer.com/marketplace/components/`. squishy-button, shift-button, rippler-button, motion-button
`https://dribbble.com/shots/25437263-Button-Micro-Interaction` 외 3건. 영감 전용

### Google Material 3
`https://m3.material.io/styles/motion/overview/how-it-works`. 모션 물리 시스템(2025년 5월 도입)
`https://m3.material.io/foundations/interaction/states/state-layers`. 8/10/10/16%
`https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md`. 스프링·지속시간·이징 토큰 (Apache-2.0, 17,397★)
`https://developer.android.com/develop/ui/views/haptics/haptics-principles`. 키클릭 10~20ms
`https://design.google/library/ux-sound-haptic-material-design`. "not every button you press results in a haptic"

---

## 부록 A. 웹 스프링 값 → SwiftUI 변환

이 조사의 수치를 쓰려면 변환이 필요하다. 식과 검증 결과를 남긴다.

```
ζ (damping ratio) = c / (2·√(k·m))
SwiftUI bounce     = 1 − ζ                     (ζ ≤ 1일 때)
SwiftUI duration   = 2π·√(m/k)                 (구 API의 response와 동일)
오버슈트 비율 o 로부터: ζ = ln(1/o) / √(π² + ln(1/o)²)
CSS cubic-bezier(a,b,c,d) → .timingCurve(a, b, c, d, duration:)   ← 1:1 직접 대응
```

**검증**: 아래 3건은 E 클러스터가 제출한 환산값을 내가 독립 재계산해 **소수 둘째 자리까지 일치**를 확인했다.

| 출처 | 원 파라미터 | ζ | SwiftUI |
|---|---|---|---|
| Comeau "boop" | mass 1, tension 300, friction 10 | 0.2887 | `.spring(duration: 0.36, bounce: 0.71)` |
| Comeau 스프링 입문 | mass 1.75, tension 200, friction 12 | 0.3207 | `.spring(duration: 0.59, bounce: 0.68)` |
| Jhey `linear()` 커브 | 오버슈트 5.27% | 0.6837 | `.spring(duration: 0.60, bounce: 0.31)` |

**Material 3 스프링 토큰 → SwiftUI** (mass=1 가정, Compose 기본값):

| Material token | damping | stiffness | SwiftUI |
|---|---|---|---|
| `fast.spatial` (**버튼·스위치**) | 0.9 | 1400 | `.spring(duration: 0.168, bounce: 0.10)` |
| `fast.effects` | 1.0 | 3800 | `.spring(duration: 0.102, bounce: 0.00)` |
| `default.spatial` | 0.9 | 700 | `.spring(duration: 0.237, bounce: 0.10)` |
| `default.effects` | 1.0 | 1600 | `.spring(duration: 0.157, bounce: 0.00)` |
| `slow.spatial` | 0.9 | 300 | `.spring(duration: 0.363, bounce: 0.10)` |
| `slow.effects` | 1.0 | 800 | `.spring(duration: 0.222, bounce: 0.00)` |

**직접 이식 가능한 이징** (변환 불필요):

| 출처 | 값 | SwiftUI |
|---|---|---|
| Vaul (MIT) | `cubic-bezier(0.32, 0.72, 0, 1)` @ 0.5s | `.timingCurve(0.32, 0.72, 0, 1, duration: 0.5)` |
| motion.dev Rolling Text | `cubic-bezier(0.338, 0.015, 0.395, 0.959)` @ 0.3s | `.timingCurve(0.338, 0.015, 0.395, 0.959, duration: 0.3)` |
| Material `standard` | `cubic-bezier(0.2, 0, 0, 1)` | `.timingCurve(0.2, 0, 0, 1, duration:)` |
| Material `emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | `.timingCurve(0.05, 0.7, 0.1, 1, duration:)` |
| motion.dev Add to Basket | `[0.74, 0.18, 0.93, 0.69]` @ 0.45s | `.timingCurve(0.74, 0.18, 0.93, 0.69, duration: 0.45)` |
| uiverse Day/Night | `cubic-bezier(0, -0.02, 0.4, 1.25)` @ 0.5s | `.timingCurve(0, -0.02, 0.4, 1.25, duration: 0.5)` |

## 부록 B. 조사의 한계 (덮지 않고 적는다)

1. **CodePen의 하트·조회수를 얻지 못했다.** 클라이언트 렌더라 정적 스크레이프에 안 잡히고, 브라우저로 직접 열어도 에디터 뷰에 카운트가 표시되지 않았다. WebFetch는 codepen.io에 403. → 11개 항목 전부 `signal: unknown`. **추정치를 넣지 않았다.**
2. **Dribbble·Framer·LottieFiles 상세 페이지의 좋아요·설치 수는 로그인 없이는 노출되지 않는다.** 목록 페이지에 보인 두 건(LottieFiles 6.2K / 2.9K)과 Rive 리믹스 1건만 실수치다.
3. **`buttons.ibelick.com`이 세션 내내 "temporarily paused"** 상태였고 web.archive.org는 이 환경에서 접근 불가. 레포(987★)만 확인했고 개별 버튼은 열거하지 못했다. **재확인 필요.**
4. **`animations.dev/learn` 커리큘럼은 로그인 게이트**라 공개 홈페이지에서만 재구성했다.
5. **Vercel Geist와 Linear는 타이밍 수치를 전혀 공개하지 않는다.** Geist는 버튼 의미론만, Linear의 method 페이지에는 모션 관련 진술이 없다. **추측으로 항목을 만들지 않고 비웠다.**
6. **Arc / The Browser Company는 증거 부족으로 항목에서 제외했다.** 2025-05-26 서한이 사실상 종료 공지이며(핵심 제품 경험은 더 이상 적극 개발하지 않음), 크래프트 언어가 있는 글은 Arc가 아니라 **Dia**에 대한 것이다. 널리 인용되는 Arc의 Command+S 애니메이션 문장은 **Browser Company의 글이 아니라 독자 댓글**이다. 인용하지 말 것.
7. **1차 자료를 찾지 못해 비운 것**: Duolingo의 CHECK 버튼·콤보/XP 카운터, Airbnb의 예약·검색 CTA, Spotify의 다운로드 토글·재생/일시정지 모프, X 하트의 실제 메커니즘, Instagram 더블탭 버스트의 수치, Robinhood의 숫자 티커(널리 인용되는 "200~400ms"는 **서드파티 에이전시 블로그 수치이지 Robinhood 수치가 아니다**. 그대로 옮기지 말 것).
8. **정정**: Revolut의 결제 확인은 슬라이드가 아니라 **탭**이다(자사 블로그 2026-09-15: 생체인식이나 passcode로 탭 한 번에 승인). 슬라이드 확인 사례는 Robinhood다.
9. **firecrawl이 세션 내내 429로 제한**돼 일부 클러스터가 목표 수량에 못 미쳤다(CodePen 11/14). 브라우저 페인과 GitHub API로 우회한 항목은 본문에 방법을 명시했다.
10. **MotionScore를 인기 지표로 읽지 말 것.** 사이트 툴팁이 밝히듯 **렌더 비용** 등급이다. 본문에서는 항상 그렇게 표기했다.
