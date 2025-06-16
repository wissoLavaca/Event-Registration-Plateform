import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode'; 


export interface User {
  userId: number;
  roleId: number; 
  username: string;
  profilePictureUrl: string | null;

}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (newToken: string, userDataFromLogin?: Partial<User>) => void; 
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; 
  updateUserProfilePicture: (newProfilePictureUrl: string | null) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true

  useEffect(() => {
    setIsLoading(true);
    if (token) {
      try {
        const decodedToken = jwtDecode<User & { exp: number }>(token); 
        
        // Check if token is expired
        if (decodedToken.exp * 1000 < Date.now()) {
          console.log("Token expired, logging out.");
          logout(); 
        } else {
          setUser({
            userId: decodedToken.userId,
            roleId: decodedToken.roleId,
            username: decodedToken.username,
            profilePictureUrl: decodedToken.profilePictureUrl,
          });
        }
      } catch (error) {
        console.error("Invalid token on initial load:", error);
        logout(); 
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = (newToken: string, userDataFromLogin?: Partial<User>) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    // Optionally, if login response already has user data, set it immediately
    // to avoid a flicker if decoding takes a moment or if token doesn't have all fresh data
   if (userDataFromLogin && userDataFromLogin.username) {
    setUser(prevUser => ({
        userId: userDataFromLogin.userId ?? prevUser?.userId ?? 0,
        roleId: userDataFromLogin.roleId ?? prevUser?.roleId ?? 0,
        username: userDataFromLogin.username ?? prevUser?.username ?? "",
        profilePictureUrl:
            userDataFromLogin.profilePictureUrl !== undefined
                ? userDataFromLogin.profilePictureUrl
                : prevUser?.profilePictureUrl ?? null,
    }));
}
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    // Consider redirecting to login page here
    // e.g., window.location.href = '/login';
  };

  const updateUserProfilePicture = (newProfilePictureUrl: string | null) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, profilePictureUrl: newProfilePictureUrl };
    });
    // Note: This only updates the context. The token in localStorage still has the old URL.
    // For full consistency, you might re-fetch user data or issue a new token after profile pic update,
    // but for immediate UI update in navbar, this is often sufficient.
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token && !!user, isLoading, updateUserProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};