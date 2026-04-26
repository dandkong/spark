import {
  restoreStateCurrent,
  saveWindowState,
  StateFlags,
} from "@tauri-apps/plugin-window-state";

export async function restoreWindowState() {
  try {
    await restoreStateCurrent(StateFlags.ALL);
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.show();
    await win.setFocus();
  } catch {
    // Not running in Tauri.
  }
}

export { saveWindowState, StateFlags };
