/**
 * Browser polyfills for Node.js built-ins required by algosdk.
 * This file MUST be imported before any other module in main.tsx.
 */
import { Buffer } from 'buffer';

// algosdk uses Buffer internally for encoding/decoding
(window as any).Buffer = Buffer;
