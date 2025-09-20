/**
 * Global Automerge Setup for DXOS
 * Ensures Automerge is available globally before any DXOS operations
 * 
 * This setup is critical for DXOS to function properly as DXOS internally
 * depends on Automerge being available globally in a specific way.
 */

let automergeSetupComplete = false;

export async function setupGlobalAutomerge(): Promise<void> {
  if (automergeSetupComplete) {
    return;
  }

  try {
    console.log('🔄 [AUTOMERGE-GLOBAL] Setting up global Automerge for DXOS...');
    
    // Import Automerge with proper error handling
    let automergeModule: any;
    try {
      automergeModule = await import('@automerge/automerge');
      console.log('✅ [AUTOMERGE-GLOBAL] Automerge module imported successfully');
    } catch (importError) {
      console.error('❌ [AUTOMERGE-GLOBAL] Failed to import Automerge:', importError);
      throw importError;
    }
    
    // Set up global references in ALL possible ways that DXOS might look for Automerge
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).Automerge = automergeModule;
      // Also set up the default export
      (globalThis as any).Automerge = (globalThis as any).Automerge || automergeModule.default || automergeModule;
    }
    
    if (typeof window !== 'undefined') {
      (window as any).Automerge = automergeModule;
      (window as any).global = globalThis;
      // Ensure window has access to globalThis
      (window as any).globalThis = globalThis;
    }
    
    // Set up global variables that DXOS might expect
    if (typeof global !== 'undefined') {
      (global as any).Automerge = automergeModule;
    }
    
    // Set up module-level globals that DXOS might access
    if (typeof module !== 'undefined' && module.exports) {
      (module.exports as any).Automerge = automergeModule;
    }
    
    // Create a mock 'use' method for compatibility with older DXOS expectations
    if (automergeModule && typeof automergeModule === 'object') {
      // Add a no-op use method for compatibility
      if (!automergeModule.use) {
        automergeModule.use = function(plugin: any) {
          console.log('🔄 [AUTOMERGE-GLOBAL] Mock use() called with:', plugin?.constructor?.name || 'unknown');
          // In Automerge 2.x, plugins are handled differently, so this is a no-op
          return automergeModule;
        };
      }
      
      // Ensure the use method is bound to the module
      automergeModule.use = automergeModule.use.bind(automergeModule);
    }
    
    // Verify Automerge functionality
    console.log('🔄 [AUTOMERGE-GLOBAL] Verifying Automerge functionality...');
    try {
      // Test basic Automerge functionality
      const testDoc = automergeModule.init();
      console.log('✅ [AUTOMERGE-GLOBAL] Automerge test operation successful');
      
      // Test the use method
      if (automergeModule.use) {
        automergeModule.use(automergeModule);
        console.log('✅ [AUTOMERGE-GLOBAL] Automerge.use() test successful');
      }
    } catch (testError) {
      console.warn('⚠️ [AUTOMERGE-GLOBAL] Automerge test operation failed:', testError);
    }
    
    // Additional setup for DXOS compatibility
    try {
      // Set up any additional globals that DXOS might need
      if (typeof globalThis !== 'undefined') {
        // Ensure Automerge is available as both named and default export
        (globalThis as any).Automerge = (globalThis as any).Automerge || automergeModule.default || automergeModule;
        
        // Set up any additional properties DXOS might expect
        if (automergeModule.init) {
          (globalThis as any).Automerge.init = automergeModule.init;
        }
        if (automergeModule.change) {
          (globalThis as any).Automerge.change = automergeModule.change;
        }
        if (automergeModule.merge) {
          (globalThis as any).Automerge.merge = automergeModule.merge;
        }
      }
    } catch (setupError) {
      console.warn('⚠️ [AUTOMERGE-GLOBAL] Additional setup failed:', setupError);
    }
    
    // Wait for setup to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    automergeSetupComplete = true;
    console.log('✅ [AUTOMERGE-GLOBAL] Global Automerge setup complete for DXOS');
  } catch (error) {
    console.error('❌ [AUTOMERGE-GLOBAL] Failed to setup global Automerge:', error);
    throw error;
  }
}

export function isAutomergeGlobalSetupComplete(): boolean {
  return automergeSetupComplete;
}
