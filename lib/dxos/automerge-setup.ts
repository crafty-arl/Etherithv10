/**
 * Alternative Automerge Setup for DXOS
 * This is a more comprehensive approach to setting up Automerge for DXOS compatibility
 */

import * as Automerge from '@automerge/automerge';

// Global Automerge setup flag
let isAutomergeSetup = false;

/**
 * Comprehensive Automerge setup for DXOS compatibility
 */
export function setupAutomergeForDXOS(): void {
  if (isAutomergeSetup) {
    return;
  }

  try {
    console.log('🔄 [AUTOMERGE-SETUP] Setting up Automerge for DXOS compatibility...');

    // Set up global Automerge in all possible ways
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).Automerge = Automerge;
    }

    if (typeof window !== 'undefined') {
      (window as any).Automerge = Automerge;
      (window as any).global = globalThis;
      (window as any).globalThis = globalThis;
    }

    if (typeof global !== 'undefined') {
      (global as any).Automerge = Automerge;
    }

    // Add a use method for compatibility with older DXOS versions
    if (Automerge && typeof Automerge === 'object') {
      // Create a use method that does nothing but satisfies DXOS expectations
      (Automerge as any).use = function(plugin: any) {
        console.log('🔄 [AUTOMERGE-SETUP] use() called with:', plugin?.constructor?.name || 'unknown');
        // In Automerge 2.x, this is a no-op, but we need it for DXOS compatibility
        return Automerge;
      };

      // Ensure all Automerge methods are available
      const requiredMethods = ['init', 'change', 'merge', 'load', 'save'];
      requiredMethods.forEach(method => {
        if ((Automerge as any)[method]) {
          (globalThis as any).Automerge[method] = (Automerge as any)[method];
        }
      });
    }

    // Test Automerge functionality
    try {
      const testDoc = Automerge.init();
      console.log('✅ [AUTOMERGE-SETUP] Automerge test successful');
    } catch (testError) {
      console.warn('⚠️ [AUTOMERGE-SETUP] Automerge test failed:', testError);
    }

    isAutomergeSetup = true;
    console.log('✅ [AUTOMERGE-SETUP] Automerge setup complete for DXOS');
  } catch (error) {
    console.error('❌ [AUTOMERGE-SETUP] Failed to setup Automerge:', error);
    throw error;
  }
}

/**
 * Check if Automerge is properly set up
 */
export function isAutomergeReady(): boolean {
  return isAutomergeSetup && typeof globalThis !== 'undefined' && !!(globalThis as any).Automerge;
}

/**
 * Get the global Automerge instance
 */
export function getGlobalAutomerge(): typeof Automerge | null {
  if (typeof globalThis !== 'undefined' && (globalThis as any).Automerge) {
    return (globalThis as any).Automerge as typeof Automerge;
  }
  return null;
}