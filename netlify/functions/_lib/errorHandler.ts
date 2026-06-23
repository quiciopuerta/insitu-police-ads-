export const safeError = (err: unknown, isDev: boolean = false): string => {
    if (isDev) {
        return err instanceof Error ? err.message : String(err);
    }
    // Production: generic message
    return "Internal server error";
};

export const logError = (context: string, err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${context}] ${message}`);
};
