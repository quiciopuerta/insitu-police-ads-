import { getCorsHeaders } from "./_lib/corsHelper";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { safeError } from "./_lib/errorHandler";

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
    body: JSON.stringify(body),
});

const EXTENSION_VERSION = '1.0.0';
const LATEST_VERSION = '1.1.0';

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };

    try {
        const pathSegments = event.path.split('/');
        const action = pathSegments[pathSegments.length - 1]; // e.g. "version", "download"

        if (event.httpMethod === "GET") {
            if (action === "version") {
                const currentVersion = event.queryStringParameters?.current;

                const updateAvailable = currentVersion && currentVersion !== LATEST_VERSION ? true : false;

                return json(200, {
                    current: EXTENSION_VERSION,
                    latest: LATEST_VERSION,
                    updateAvailable,
                    downloadUrl: `/.netlify/functions/api-police-extension/download?version=${LATEST_VERSION}`,
                    releaseNotes: {
                        version: LATEST_VERSION,
                        features: [
                            '✅ Support for 13 advertising platforms',
                            '✅ Real-time validation',
                            '✅ Multi-language support',
                            '✅ Auto-updates from dashboard',
                        ],
                        bugFixes: [
                            'Fixed Meta Ads field detection',
                            'Improved error messages',
                        ],
                    },
                });
            }

            if (action === "download") {
                // Return a simple JSON acknowledging download capability for now
                // Real ZIP file serving might require AWS S3 or a static public link
                return json(200, {
                    message: "Download endpoint available. Replace with actual zip binary response if required.",
                    version: event.queryStringParameters?.version || LATEST_VERSION
                });
            }
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-extension] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
