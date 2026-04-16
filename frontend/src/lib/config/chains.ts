import { BRANDING } from './branding';

export const PLATFORM_CHAIN_ID = BRANDING.chainId;

export const EXPLORER_URLS: Record<number, string> = {
  [PLATFORM_CHAIN_ID]: BRANDING.explorerUrl,
};
