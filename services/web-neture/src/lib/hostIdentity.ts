/** Host identities shared by browser routing and the static HTML build. */
export type SubHost = 'supplier' | 'funding' | 'community';
export type HostProfile = 'main' | SubHost;

export const MAIN_ORIGIN = 'https://neture.co.kr';

export const HOST_ORIGIN: Readonly<Record<SubHost, string>> = Object.freeze({
  supplier: 'https://supplier.neture.co.kr',
  funding: 'https://funding.neture.co.kr',
  community: 'https://community.neture.co.kr',
});
