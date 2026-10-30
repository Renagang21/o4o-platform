export const centralServiceLabels: Record<string, string> = {
  neture: '약국·공통 운영', supplier: '공급자', funding: '펀딩', lecture: '강의',
  community: '커뮤니티', 'partner-support': '파트너', pharmcoop: '협동조합 연합회',
};
export const centralServiceLabel = (service: string) => centralServiceLabels[service] ?? service;
