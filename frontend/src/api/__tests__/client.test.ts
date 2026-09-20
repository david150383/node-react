import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ApiError,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
  apiClient,
} from '../client.ts';

describe('client.ts API utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ApiError', () => {
    it('should correctly initialize with status, code, message, and details', () => {
      const error = new ApiError(
        400,
        'VALIDATION_FAILED',
        'Invalid input provided',
        [{ field: 'email', issue: 'invalid format' }],
        'req-12345',
      );

      expect(error.name).toBe('ApiError');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toBe('Invalid input provided');
      expect(error.details).toEqual([
        { field: 'email', issue: 'invalid format' },
      ]);
      expect(error.requestId).toBe('req-12345');
    });

    it('should handle optional details and requestId', () => {
      const error = new ApiError(500, 'SERVER_ERROR', 'Internal error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.details).toBeUndefined();
      expect(error.requestId).toBeUndefined();
    });
  });

  describe('Token storage helpers', () => {
    it('should return null tokens initially', () => {
      const tokens = getStoredTokens();
      expect(tokens.accessToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();
    });

    it('should store and retrieve accessToken and refreshToken', () => {
      setStoredTokens('token-123', 'refresh-456');
      const tokens = getStoredTokens();
      expect(tokens.accessToken).toBe('token-123');
      expect(tokens.refreshToken).toBe('refresh-456');
    });

    it('should remove refresh token if empty string provided', () => {
      setStoredTokens('token-123', 'refresh-456');
      setStoredTokens('token-new', '');
      const tokens = getStoredTokens();
      expect(tokens.accessToken).toBe('token-new');
      expect(tokens.refreshToken).toBeNull();
    });

    it('should clear stored tokens including user from localStorage', () => {
      setStoredTokens('token-123', 'refresh-456');
      localStorage.setItem('apex_user', JSON.stringify({ id: '1' }));

      clearStoredTokens();
      const tokens = getStoredTokens();
      expect(tokens.accessToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();
      expect(localStorage.getItem('apex_user')).toBeNull();
    });
  });

  describe('apiClient', () => {
    it('should execute successful GET request and parse JSON response', async () => {
      const mockData = { id: 1, name: 'Wireless Headphones' };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const result = await apiClient<typeof mockData>('/products/1');

      expect(result).toEqual(mockData);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('/products/1');
      const reqHeaders = options?.headers as Headers;
      expect(reqHeaders.get('Content-Type')).toBe('application/json');
      expect(reqHeaders.has('x-correlation-id')).toBe(true);
      expect(reqHeaders.has('traceparent')).toBe(true);
    });

    it('should attach Authorization header when accessToken exists', async () => {
      setStoredTokens('my-jwt-token');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      } as Response);

      await apiClient('/auth/profile');

      const [, options] = fetchSpy.mock.calls[0];
      const reqHeaders = options?.headers as Headers;
      expect(reqHeaders.get('Authorization')).toBe('Bearer my-jwt-token');
    });

    it('should throw ApiError on non-2xx status code', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'NOT_FOUND',
            message: 'Item not found in inventory',
          },
        }),
      } as Response);

      await expect(apiClient('/products/999')).rejects.toThrow(ApiError);

      try {
        await apiClient('/products/999');
      } catch (err) {
        if (err instanceof ApiError) {
          expect(err.statusCode).toBe(404);
          expect(err.code).toBe('NOT_FOUND');
          expect(err.message).toBe('Item not found in inventory');
        }
      }
    });
  });
});
