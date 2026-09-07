# 앱 시작 계측 v2

이 변경은 속도 최적화가 아니라 측정 정확도 보완이다. 웹 PR #147과 모바일 PR #43을 함께 배포한다. 네이티브 모듈 변경이므로 새 스토어 빌드가 필요하다.

## 지표

- 기존 화면별 screen_first_data: 화면 라우팅부터 데이터 반영까지. 앱 실행 전체 시간이 아니다.
- Performance native_home_ready: Android Application.onCreate 또는 iOS AppDelegate.didFinishLaunching에서 시작하여, 홈 첫 뷰포트 이미지 decode·폰트 준비·두 animation frame 후 웹이 보낸 신호를 네이티브가 받은 시간. 스플래시 hide 완료 후 같은 네이티브 단조 시계로 계산한다. 브리지 전달 지연을 포함한다.
- Performance native_home_ready_skipped: 계측 불가 사유. 이를 0ms 성공으로 집계하지 않는다.
- 구버전 native_shell_home은 wall-clock 기반 기존 지표다. v2와 혼합하지 않는다.

아이콘 탭부터 네이티브 콜백까지는 이 커스텀 지표에 포함되지 않는다. start_point와 endpoint를 그대로 표시하고 “아이콘 탭 전체 시간”이라고 이름 붙이지 않는다. 하드웨어 화면 표시 완료도 보장하지 않는다.

새 프로세스의 최초 홈만 측정한다. 백그라운드에 갔다 온 실행, 온보딩/로그인, 재시도, 알림 이동은 초기 실행 성공 집계에서 제외한다. 프로세스 안에서 한 번만 완료해 JS reload가 과거 시작점으로 재보고하지 않는다. 백그라운드 복귀 자체의 지연은 별도 지표가 필요하며 이 지표로 추정하지 않는다.

## OS 도구

Android 홈 완료 신호는 reportFullyDrawn에도 연결한다. Macrobenchmark StartupTimingMetric/Perfetto의 TTFD와 비교하면 OS가 시작 요청을 받은 시점부터 앱이 준비되었다고 알린 시점까지 볼 수 있다. 사용자 손가락이 화면을 누른 정확한 순간과는 다르다.

iOS Instruments의 App Launch와 Points of Interest에서 NativeHomeReady signpost를 확인한다. App Launch 기본 첫 프레임 지표만으로 WebView 홈 준비 완료를 판단하지 않는다.

## 실기기 확인

1. 새 네이티브 빌드와 웹 배포 버전을 확인한다. 이전 runtime의 OTA가 섞이지 않게 스토어 빌드 전 app.json 버전을 올린다.
2. 로그인된 앱을 종료한 뒤 화면 녹화에서 아이콘 탭부터 홈 핵심 내용이 보일 때까지 잰다. 동일 launch의 native_home_ready 값을 비교한다.
3. Android는 logcat의 Fully drawn, iOS는 Instruments의 signpost와 대조한다. 커스텀 지표와 녹화의 차이는 콜백 이전 구간과 표시/브리지 시점 차이를 조사한다.
4. 백그라운드 복귀·재시도·로그인 후 홈에서 새로운 initial_process_launch 성공 값이 발생하지 않는지 확인한다.
5. 성공 duration, 시작/종료 정의, 기기/OS/앱/웹 버전을 기록한다. 실패·스킵은 개수와 이유를 별도로 기록한다.

현재 로컬에는 연결된 Android 기기, Android SDK, 사용 가능한 Xcode가 없어 네이티브 컴파일/녹화 대조는 미검증이다. prebuild와 JS 테스트 통과만으로 실기기 검증 완료로 간주하지 않는다.
