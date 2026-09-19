import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestockModal } from '../RestockModal.tsx';
import { adminApi } from '../../../api/admin.api.ts';
import { Product } from '../../../api/products.api.ts';

vi.mock('../../../api/admin.api.ts', () => ({
  adminApi: {
    restockInventory: vi.fn(),
  },
}));

const sampleProduct: Product = {
  id: 'prod-101',
  name: 'Ergonomic Standing Desk',
  slug: 'ergonomic-standing-desk',
  description: 'Dual motor motorized standing desk',
  price_cents: 49999,
  priceCents: 49999,
  currency: 'USD',
  category: 'Furniture',
  status: 'ACTIVE',
  sku: 'DSK-ERG-101',
  created_at: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('RestockModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnRestocked = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when product is null', () => {
    const { container } = render(
      <RestockModal
        product={null}
        onClose={mockOnClose}
        onRestocked={mockOnRestocked}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render product details and default quantity of 25', () => {
    render(
      <RestockModal
        product={sampleProduct}
        onClose={mockOnClose}
        onRestocked={mockOnRestocked}
      />,
    );

    expect(screen.getByText('Restock Inventory')).toBeInTheDocument();
    expect(screen.getByText('Ergonomic Standing Desk')).toBeInTheDocument();
    expect(screen.getByText('SKU: DSK-ERG-101')).toBeInTheDocument();

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(25);
  });

  it('should close when cancel or close button is clicked', () => {
    render(
      <RestockModal
        product={sampleProduct}
        onClose={mockOnClose}
        onRestocked={mockOnRestocked}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display an error if non-positive quantity is submitted', async () => {
    render(
      <RestockModal
        product={sampleProduct}
        onClose={mockOnClose}
        onRestocked={mockOnRestocked}
      />,
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(
      await screen.findByText('Please enter a positive restock quantity'),
    ).toBeInTheDocument();
    expect(adminApi.restockInventory).not.toHaveBeenCalled();
    expect(mockOnRestocked).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call restockInventory, onRestocked, and onClose upon successful submission', async () => {
    vi.mocked(adminApi.restockInventory).mockResolvedValueOnce({
      message: 'Stock adjusted',
      data: {
        id: 'inv-1',
        product_id: 'prod-101',
        available_quantity: 54,
      },
    });

    render(
      <RestockModal
        product={sampleProduct}
        onClose={mockOnClose}
        onRestocked={mockOnRestocked}
      />,
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '50' } });

    const submitBtn = screen.getByRole('button', { name: /confirm restock/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.restockInventory).toHaveBeenCalledWith('prod-101', 50);
      expect(mockOnRestocked).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should display error message when restock API fails', async () => {
    vi.mocked(adminApi.restockInventory).mockRejectedValueOnce(
      new Error('Inventory service unavailable'),
    );

    render(
      <RestockModal
        product={sampleProduct}
        onClose={mockOnClose}
        onRestocked={mockOnRestocked}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /confirm restock/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Inventory service unavailable'),
    ).toBeInTheDocument();
    expect(mockOnRestocked).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
