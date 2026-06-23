// ExecutionRouter determines if the current runtime is a Tauri Desktop App or a standard Web App.
// It routes tasks to either the local Rust backend (IPC) or the Cloud API (Netlify/Supabase).

declare global {
  interface Window {
    __TAURI__?: any;
    __TAURI_INTERNALS__?: any;
    __TAURI_IPC__?: any;
  }
}

export const ExecutionRouter = {
  /**
   * Safe check for Tauri environment (v1 and v2)
   */
  isDesktopMode(): boolean {
    return typeof window !== 'undefined' && (!!window.__TAURI__ || !!window.__TAURI_INTERNALS__ || !!window.__TAURI_IPC__);
  },

  /**
   * Routes a generic task to the appropriate backend.
   * @param desktopCommand The Tauri IPC command name to invoke in Rust.
   * @param desktopPayload The payload to pass to the IPC command.
   * @param cloudFallbackFunction The async function to execute if running on the web, or if desktop fails.
   */
  async routeTask<T, R>(
    desktopCommand: string,
    desktopPayload: T,
    cloudFallbackFunction: () => Promise<R>
  ): Promise<R> {
    if (this.isDesktopMode()) {
      try {
        // Dynamically import Tauri API to avoid breaking web builds where Tauri is not present
        const { invoke } = await import('@tauri-apps/api/core');
        console.log(`[ExecutionRouter] Routing to Desktop (Rust): ${desktopCommand}`);
        // Rust commands via Tauri IPC
        return await invoke<R>(desktopCommand, desktopPayload as any);
      } catch (error) {
        console.warn(`[ExecutionRouter] Desktop execution failed for ${desktopCommand}. Falling back to Cloud.`, error);
        console.log(`[ExecutionRouter] Routing to Cloud Fallback...`);
        return cloudFallbackFunction();
      }
    } else {
      console.log(`[ExecutionRouter] Running on Web. Routing to Cloud: ${cloudFallbackFunction.name || 'Anonymous function'}`);
      return cloudFallbackFunction();
    }
  }
};
