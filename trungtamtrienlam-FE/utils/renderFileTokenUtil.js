import { ApiCloudCDNFileConstants, ApiConstants } from "../constants/apiConstants";
import axiosInstance from "../lib/api/axiosConfig";

let publicToken = null;
let fetchingToken = null;

class RenderFileTokenUtil {
    static generateUrl(pathFile, publicToken, isPrivate = false) {
        const encodedPathFile = encodeURIComponent(pathFile || "");

        return ApiConstants.apiCloudCDN + ApiCloudCDNFileConstants.view.replace("{pathFile}", encodedPathFile)
            .replace("{publicToken}", publicToken).replace("{isPrivate}", (isPrivate || 'false').toString());
    }

    static resetPublicToken() {
        publicToken = null;
    }

    static getPublicToken() {
        if (publicToken && !fetchingToken) {
            return new Promise((resolve) => resolve(publicToken));
        }

        if (fetchingToken) {
            return fetchingToken;
        }

        if (!fetchingToken) {
            fetchingToken = new Promise((resolve, reject) => {
                axiosInstance.get(ApiConstants.apiCloudCDN + ApiCloudCDNFileConstants.getPublicToken)
                    .then(res => {
                        if (res.status != 200) {
                            return reject(null);
                        }

                        const token = res.data;

                        publicToken = token;

                        return resolve(token);
                    })
                    .finally(() => {
                        fetchingToken = null;
                    })
            });

            return fetchingToken;
        } else {
            return fetchingToken;
        }
    }
}

export default RenderFileTokenUtil;
