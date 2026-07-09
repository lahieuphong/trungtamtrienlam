import { ApiCloudCDNFileConstants, ApiConstants } from "../constants/apiConstants";
import axiosInstance from "../lib/api/axiosConfig";

let publicToken = null;
let publicTokenLoaded = false;
let fetchingToken = null;

const normalizeBaseUrl = (url) => (url || "").replace(/\/+$/, "");

class RenderFileTokenUtil {
    static generateFallbackUrl(pathFile) {
        const rawPath = (pathFile || "").trim();
        if (!rawPath) return "";
        if (/^(https?:|data:|blob:)/i.test(rawPath)) return rawPath;

        const normalizedPath = rawPath.replace(/\\/g, "/");
        const cleanPath = normalizedPath.replace(/^\/+/, "");
        const isLikelyPublicAsset = normalizedPath.startsWith("/") &&
            !/^(media|staff|legacy_aidi|uploads|documents|files)(\/|$)/i.test(cleanPath);

        if (isLikelyPublicAsset) return normalizedPath;

        const cdnBaseUrl = normalizeBaseUrl(ApiConstants.cdnUrl || ApiConstants.backendBaseUrl || "");
        if (!cdnBaseUrl) return normalizedPath;

        if (/^media\//i.test(cleanPath)) {
            return `${cdnBaseUrl}/${cleanPath}`;
        }

        return `${cdnBaseUrl}/media/${cleanPath}`;
    }

    static generateUrl(pathFile, publicTokenValue, isPrivate = false) {
        const token = typeof publicTokenValue === "string" ? publicTokenValue.trim() : "";
        if (!token) return RenderFileTokenUtil.generateFallbackUrl(pathFile);

        const encodedPathFile = encodeURIComponent(pathFile || "");
        const encodedToken = encodeURIComponent(token);

        return ApiConstants.apiCloudCDN + ApiCloudCDNFileConstants.view.replace("{pathFile}", encodedPathFile)
            .replace("{publicToken}", encodedToken).replace("{isPrivate}", (isPrivate || false).toString());
    }

    static resetPublicToken() {
        publicToken = null;
        publicTokenLoaded = false;
    }

    static getPublicToken() {
        if (publicTokenLoaded && !fetchingToken) {
            return Promise.resolve(publicToken || "");
        }

        if (fetchingToken) {
            return fetchingToken;
        }

        const tokenUrl = ApiConstants.apiCloudCDN + ApiCloudCDNFileConstants.getPublicToken;
        fetchingToken = axiosInstance.get(tokenUrl)
            .then(res => {
                const raw = res?.data;
                const token = typeof raw === "string"
                    ? raw
                    : raw?.token || raw?.publicToken || raw?.data?.token || raw?.data?.publicToken || raw?.data?.data?.token || raw?.data?.data?.publicToken || "";

                publicToken = String(token || "");
                publicTokenLoaded = true;
                return publicToken;
            })
            .catch(error => {
                console.warn("[file-token] public token unavailable", error?.response?.status, error?.config?.url || tokenUrl);
                publicToken = "";
                publicTokenLoaded = true;
                return "";
            })
            .finally(() => {
                fetchingToken = null;
            });

        return fetchingToken;
    }
}

export default RenderFileTokenUtil;
