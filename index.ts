import { Buffer } from 'buffer';
import './src/utils/watermelonPolyfill';

(globalThis as any).Buffer = (globalThis as any).Buffer ?? Buffer;

import 'expo-router/entry';
