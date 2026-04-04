import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

const normalizeError = (error) => {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
};

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const loginUser = async (username, password) => {
  try {
    const res = await api.post("/auth/login", { username, password });
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const logoutUser = async () => {
  try {
    const res = await api.post("/auth/logout");
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const getMe = async () => {
  try {
    const res = await api.get("/auth/me");
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const predictTransaction = async (data) => {
  try {
    const res = await api.post("/predict", data);
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const uploadCSV = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const getHistory = async (params = {}) => {
  try {
    const res = await api.get("/history", { params });
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const clearHistory = async () => {
  try {
    const res = await api.post("/history/clear");
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const getModelInfo = async () => {
  try {
    const res = await api.get("/model-info");
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const getWeeklyReportPdf = async (threshold = 75) => {
  try {
    const res = await api.get("/report/weekly", {
      params: { threshold },
      responseType: "blob",
    });
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const getUsers = async () => {
  try {
    const res = await api.get("/users");
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const createUser = async (payload) => {
  try {
    const res = await api.post("/users", payload);
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const updateUser = async (id, payload) => {
  try {
    const res = await api.patch(`/users/${id}`, payload);
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};

export const updateTransactionStatus = async (id, status) => {
  try {
    const res = await api.post(`/transactions/${id}/status`, { status });
    return res.data;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
};
