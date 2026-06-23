import { useState, useEffect, useCallback } from "react";
import { settingsService } from "../services/auth/settingsService";
import { SystemSettings } from "../types";

/**
 * useGlobalSettings — fetches system settings from the backend on mount
 * and provides a cached, always-up-to-date copy for the whole app.
 *
 * Every user (admin or not) fetches from the Supabase DB endpoint so that
 * admin changes propagate globally regardless of device.
 */
export function useGlobalSettings() {
    const [settings, setSettings] = useState<SystemSettings>(
        settingsService.getSettings()   // fast local cache for first render
    );
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        // Skip hitting the admin endpoint if not logged in to prevent 401 spam
        const sessionStr = localStorage.getItem("insitu_active_session");
        if (!sessionStr) {
            setLoading(false);
            return;
        }

        const fresh = await settingsService.fetchSettings();
        setSettings(fresh);
        setLoading(false);
    }, []);

    useEffect(() => {
        // Fetch on mount
        refresh();

        // Refresh every 60 seconds so admin changes propagate without reload
        const interval = setInterval(refresh, 60_000);
        return () => clearInterval(interval);
    }, [refresh]);

    return { settings, loading, refresh };
}
