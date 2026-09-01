/** Main API 에러 응답 바디 — 커스텀 예외들이 이 형태로 직렬화된다 */
export interface ApiErrorBody {
  code: string;
  message: string;
}
