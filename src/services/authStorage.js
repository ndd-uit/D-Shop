const AUTH_TOKEN_KEY = "d-shop-auth-token";
const AUTH_USER_KEY = "d-shop-auth-user";

const saveAuthToken = (token) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

const getAuthToken = () => window.localStorage.getItem(AUTH_TOKEN_KEY);

const saveAuthUser = (user) => {
    if (user) {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
};

const getAuthUser = () => {
    try {
        return JSON.parse(window.localStorage.getItem(AUTH_USER_KEY));
    } catch {
        return null;
    }
};

const clearAuthToken = () => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
};

export { clearAuthToken, getAuthToken, getAuthUser, saveAuthToken, saveAuthUser };
