import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductCard } from '../ProductCard.tsx';
import { Product } from '../../api/products.api.ts';

// Mock useCart hook
const mockAddToCart = vi.fn();
vi.mock('../../context/CartContext.tsx', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
  }),
}));

const sampleProduct: Product = {
  id: 'prod-42',
  name: 'UltraWide Curved Gaming Monitor',
  slug: 'ultrawide-curved-gaming-monitor',
  description:
    'Immersive 34-inch curved QD-OLED display with 175Hz refresh rate.',
  price_cents: 89999,
  priceCents: 89999,
  currency: 'USD',
  category: 'Display',
  status: 'ACTIVE',
  sku: 'MON-UW-042',
  created_at: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ProductCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render product details correctly', () => {
    render(<ProductCard product={sampleProduct} />);

    expect(
      screen.getByRole('heading', { name: 'UltraWide Curved Gaming Monitor' }),
    ).toBeInTheDocument();
    expect(screen.getByText('SKU: MON-UW-042')).toBeInTheDocument();
    expect(screen.getByText(sampleProduct.description)).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('$899.99')).toBeInTheDocument();
  });

  it('should render image with proper alt text', () => {
    render(<ProductCard product={sampleProduct} />);

    const img = screen.getByAltText('UltraWide Curved Gaming Monitor');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src');
  });

  it('should invoke addToCart and temporarily show Added state when Add to Cart is clicked', () => {
    vi.useFakeTimers();

    render(<ProductCard product={sampleProduct} />);

    const addBtn = screen.getByRole('button', { name: /add to cart/i });
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);

    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(sampleProduct, 1);

    // Should now show Added
    expect(screen.getByText('Added')).toBeInTheDocument();

    // Fast-forward timer past 1200ms
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.getByText('Add to Cart')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
