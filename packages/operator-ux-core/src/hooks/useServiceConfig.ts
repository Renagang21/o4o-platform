// WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1
import { serviceConfigMap } from '../config/index.js';

export function useServiceConfig(serviceKey: keyof typeof serviceConfigMap) {
  return serviceConfigMap[serviceKey];
}
