import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

const STORAGE_TOKEN_KEY = "riphah_admin_token";
const API_BASE = import.meta.env.VITE_API_BASE;

export const AuthContext = createContext({
  user: null,
  role: null,
  token: null,
  login: async () => { },
  logout: () => { },
  loading: false,
  error: null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch profile using token (admin + warden)
  const fetchProfile = useCallback(async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/staffprofile/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setUser(res.data.user);
      setRole(res.data.user?.role || null);

      // if backend rotated token
      if (res.data.token) {
        localStorage.setItem(STORAGE_TOKEN_KEY, res.data.token);
        setToken(res.data.token);
      }
    } catch (err) {
      console.error("profile fetch error", err);
      setUser(null);
      setRole(null);
      setToken(null);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
  }, []);

  // ✅ rehydrate and wait until done before clearing loading
  useEffect(() => {
    const rehydrate = async () => {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (savedToken) {
        setToken(savedToken);
        await fetchProfile(savedToken); // wait for profile before finishing
      }
      setLoading(false); // only set to false after rehydration
    };
    rehydrate();
  }, [fetchProfile]);

  // login
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/staffprofile/login`, {
        email,
        password,
      });

      const { token: newToken, user: newUser } = res.data;

      localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(newUser);
      setRole(newUser.role);
      return res.data;
    } catch (err) {
      console.error("login error", err);
      const msg =
        err.response?.data?.message || err.message || "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        role,
        token,
        login,
        logout,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// custom hook
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
