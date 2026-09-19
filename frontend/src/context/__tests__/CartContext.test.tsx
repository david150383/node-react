import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CartProvider, useCart } from '../CartContext.tsx';
import { Product } from '../../api/products.api.ts';

const mockProductA: Product = {
  id: 'prod-1',
  name: 'Ultra Mechanical Keyboard',
  slug: 'ultra-mechanical-keyboard',
  description: 'RGB mechanical gaming keyboard',
  price_cents: 12000,
  priceCents: 12000,
  currency: 'USD',
  category: 'Gaming',
  status: 'ACTIVE',
  sku: 'KB-001',
  created_at: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockProductB: Product = {
  id: 'prod-2',
  name: 'Wireless Precision Mouse',
  slug: 'wireless-precision-mouse',
  description: 'Ergonomic wireless mouse',
  price_cents: 6000,
  priceCents: 6000,
  currency: 'USD',
  category: 'Accessories',
  status: 'ACTIVE',
  sku: 'MS-002',
  created_at: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CartProvider>{children}</CartProvider>
);

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty cart by default', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotalCents).toBe(0);
    expect(result.current.isCartOpen).toBe(false);
  });

  it('should initialize with items from localStorage when present', () => {
    const savedCart = [{ product: mockProductA, quantity: 2 }];
    localStorage.setItem('apex_cart', JSON.stringify(savedCart));

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.cartCount).toBe(2);
    expect(result.current.cartTotalCents).toBe(24000);
  });

  it('should add a new product to cart and open drawer', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 1);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].product.id).toBe('prod-1');
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.cartCount).toBe(1);
    expect(result.current.cartTotalCents).toBe(12000);
    expect(result.current.isCartOpen).toBe(true);
  });

  it('should increment quantity when adding the same product again', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 1);
    });

    act(() => {
      result.current.addToCart(mockProductA, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.cartCount).toBe(3);
    expect(result.current.cartTotalCents).toBe(36000);
  });

  it('should support multiple distinct products and aggregate totals properly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 2); // 2 * 12000 = 24000
      result.current.addToCart(mockProductB, 1); // 1 * 6000 = 6000
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.cartCount).toBe(3);
    expect(result.current.cartTotalCents).toBe(30000);
  });

  it('should update quantity for an existing item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 2);
    });

    act(() => {
      result.current.updateQuantity('prod-1', 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.cartCount).toBe(5);
    expect(result.current.cartTotalCents).toBe(60000);
  });

  it('should remove item if updated quantity is 0 or negative', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 2);
    });

    act(() => {
      result.current.updateQuantity('prod-1', 0);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
  });

  it('should remove product by id', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 1);
      result.current.addToCart(mockProductB, 1);
    });

    act(() => {
      result.current.removeFromCart('prod-1');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].product.id).toBe('prod-2');
    expect(result.current.cartCount).toBe(1);
    expect(result.current.cartTotalCents).toBe(6000);
  });

  it('should clear the entire cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 2);
      result.current.addToCart(mockProductB, 3);
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotalCents).toBe(0);
  });

  it('should persist changes to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockProductA, 1);
    });

    const stored = JSON.parse(localStorage.getItem('apex_cart') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].product.id).toBe('prod-1');
  });

  it('should throw an error when useCart is used outside CartProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');
    consoleSpy.mockRestore();
  });
});
