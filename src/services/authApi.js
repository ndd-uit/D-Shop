import api from "./api.js";
import { saveAuthToken, saveAuthUser } from "./authStorage.js";

const registerCustomer = async (payload) => {
    const response = await api.post("/auth/register", payload);

    return response.data;
};

const loginUser = async (payload) => {
    const response = await api.post("/auth/login", payload);

    return response.data.data;
};

export {
    loginUser,
    registerCustomer,
    saveAuthToken,
    saveAuthUser,
};
