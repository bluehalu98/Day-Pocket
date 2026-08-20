# Day Pocket

백엔드 없이 로컬 파일에 데이터를 저장하는 Electron 기반 일정, 메모, todo 앱입니다.

## 실행

```bash
npm install
npm start
```

## 데이터 저장 위치

데이터는 Electron의 `app.getPath("userData")` 경로 아래 `todos.json` 파일로 저장됩니다.
macOS에서는 보통 아래와 비슷한 위치입니다.

```text
~/Library/Application Support/Day Pocket/todos.json
```

## 구조

```text
src/
  main.js       Electron 메인 프로세스, 창 생성, 파일 저장 API
  preload.js    화면에서 사용할 안전한 저장 API 노출
  index.html    앱 화면
  renderer.js   todo 추가, 완료, 삭제, 필터링
  styles.css    화면 스타일
```

## 다음에 붙이기 좋은 기능

- 프로젝트별 todo 분리
- 우선순위, 마감일, 태그
- 검색
- JSON 백업/복원
- 앱 패키징
