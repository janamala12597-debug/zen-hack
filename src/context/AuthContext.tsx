import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Language } from '../types';
import { api } from '../services/api';
import { getCachedUserProfile, cacheUserProfile } from '../offline/db';

interface AuthContextType {
  user: User | null;
  token: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  registerFarmer: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('agrishield_token'));
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('agrishield_lang') as Language) || 'en';
  });
  const [isLoading, setIsLoading] = useState(true);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('agrishield_lang', lang);
  };

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await api.getMe();
        if (currentUser) {
          setUser(currentUser);
          if (currentUser.preferred_language) {
            setLanguage(currentUser.preferred_language);
          }
        } else {
          // Check cached offline profile
          const cached = getCachedUserProfile();
          if (cached) {
            setUser(cached);
          } else if (!token) {
            // Open the seeded demo dashboard without requiring a login step.
            const demo = await api.login('9876543210', 'farmer123');
            setUser(demo.user);
            setToken(demo.token);
            if (demo.user.preferred_language) {
              setLanguage(demo.user.preferred_language);
            }
          }
        }
      } catch (err) {
        const cached = getCachedUserProfile();
        if (cached) {
          setUser(cached);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (identifier: string, pass: string) => {
    const res = await api.login(identifier, pass);
    setUser(res.user);
    setToken(res.token);
    if (res.user.preferred_language) {
      setLanguage(res.user.preferred_language);
    }
  };

  const registerFarmer = async (data: any) => {
    const res = await api.register(data);
    setUser(res.user);
    setToken(res.token);
    if (res.user.preferred_language) {
      setLanguage(res.user.preferred_language);
    }
  };

  const logout = () => {
    localStorage.removeItem('agrishield_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        language,
        setLanguage,
        isLoading,
        login,
        registerFarmer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
