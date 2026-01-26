import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_STORAGE_KEY = "refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const parseJWT = (token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.sub,
        email: payload.email || "",
      };
    } catch {
      return null;
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!refreshToken) return null;

    try {
      const response = await fetch("api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        return null;
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_STORAGE_KEY, data.refresh_token);
      setAccessToken(data.access_token);
      setUser(parseJWT(data.access_token));
      return data.access_token;
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await refreshAccessToken();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshAccessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(
      () => {
        refreshAccessToken();
      },
      13 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [accessToken, refreshAccessToken]);

  const login = async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch("api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Login failed" }));
      throw new Error(error.detail);
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_STORAGE_KEY, data.refresh_token);
    setAccessToken(data.access_token);
    setUser(parseJWT(data.access_token));
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (refreshToken && accessToken) {
      try {
        await fetch("api/v1/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Ignore logout errors
      }
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
