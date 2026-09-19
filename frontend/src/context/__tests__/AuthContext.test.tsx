import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext.tsx';
import { authApi, UserProfile } from '../../api/auth.api.ts';

vi.mock('../../api/auth.api.ts', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const mockUser: UserProfile = {
  id: 'user-001',
  email: 'alex@example.com',
  first_name: 'Alex',
  last_name: 'Rivera',
  role: 'customer',
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with null user and unauthenticated state by default', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should hydrate user from localStorage if present', () => {
    localStorage.setItem('apex_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem('apex_user', 'invalid-json-string');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should successfully log in a user and set state', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'token-abc',
      refreshToken: 'refresh-abc',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'alex@example.com',
        password: 'Password123!',
      });
    });

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'Password123!',
    });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should log out user and clear state', async () => {
    localStorage.setItem('apex_user', JSON.stringify(mockUser));
    vi.mocked(authApi.logout).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should register and automatically trigger login', async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce(mockUser);
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'token-reg',
      refreshToken: 'refresh-reg',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        email: 'alex@example.com',
        password: 'Password123!',
        first_name: 'Alex',
        last_name: 'Rivera',
      });
    });

    expect(authApi.register).toHaveBeenCalledTimes(1);
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'Password123!',
    });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear user on window auth:expired event', () => {
    localStorage.setItem('apex_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should throw an error if useAuth is invoked outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });
});
