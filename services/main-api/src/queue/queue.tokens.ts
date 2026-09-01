// DI 토큰 — module/service 양쪽에서 참조하므로 별도 파일 (순환 import 방지)
export const BROKER_REDIS = Symbol('BROKER_REDIS');
export const PROGRESS_REDIS = Symbol('PROGRESS_REDIS');
