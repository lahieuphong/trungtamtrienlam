export const MONUMENT_PROFILE_UPDATE_KEY = 'monumentProfileUpdatedAt'
export const MONUMENT_PROFILE_UPDATE_CHANNEL = 'monument-profile-updates'
export const MONUMENT_PROFILE_UPDATE_EVENT = 'monument-profile-updated'
export const MONUMENT_PROFILE_REFRESH_INTERVAL_MS = 500

export function notifyMonumentProfileUpdated() {
    if (typeof window === 'undefined') return

    const updatedAt = String(Date.now())

    try {
        window.localStorage.setItem(MONUMENT_PROFILE_UPDATE_KEY, updatedAt)
    } catch {
        // Ignore storage failures in private browser contexts.
    }

    try {
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel(MONUMENT_PROFILE_UPDATE_CHANNEL)
            channel.postMessage({ type: MONUMENT_PROFILE_UPDATE_EVENT, updatedAt })
            channel.close()
        }
    } catch {
        // The short polling fallback still keeps isolated sessions fresh.
    }
}