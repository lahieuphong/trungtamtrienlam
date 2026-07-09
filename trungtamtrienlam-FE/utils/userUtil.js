'use-client';

import { ConfigConstants } from '../constants/configConstants';

class UserUtil {
    static getBearerToken() {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem(ConfigConstants.localstorageTokenKey);

            return token;
        }

        return null;
    }

    static getUserInfo() {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem(ConfigConstants.localstorageUserInfoKey);

            return token ? JSON.parse(token) : null;
        }

        return null;
    }
}

export default UserUtil;