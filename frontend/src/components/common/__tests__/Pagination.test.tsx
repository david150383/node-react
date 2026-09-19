import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '../Pagination.tsx';

describe('Pagination Component', () => {
  it('should render correct summary text for normal page', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={45}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    const summaryEl = screen.getByText((_, element) => {
      return (
        element?.tagName.toLowerCase() === 'div' &&
        element.textContent?.trim() === 'Showing 11 to 20 of 45 items'
      );
    });
    expect(summaryEl).toBeInTheDocument();
  });

  it('should show 0 to 0 of 0 when totalItems is 0', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={0}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBeGreaterThanOrEqual(2);
  });

  it('should disable Prev button on first page and enable Next button when multiple pages exist', () => {
    const handlePageChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        pageSize={10}
        onPageChange={handlePageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const prevBtn = screen.getByRole('button', { name: /prev/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('should disable Next button on the last page and allow navigating Prev', () => {
    const handlePageChange = vi.fn();

    render(
      <Pagination
        currentPage={5}
        totalItems={50}
        pageSize={10}
        onPageChange={handlePageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const prevBtn = screen.getByRole('button', { name: /prev/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(nextBtn).toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });

  it('should navigate to specific page number when clicked', () => {
    const handlePageChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        totalItems={40}
        pageSize={10}
        onPageChange={handlePageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const page3Btn = screen.getByRole('button', { name: '3' });
    fireEvent.click(page3Btn);

    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('should display ellipsis when total pages exceed 7', () => {
    render(
      <Pagination
        currentPage={5}
        totalItems={200}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it('should trigger onPageSizeChange when a new page size is selected', () => {
    const handlePageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        totalItems={100}
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={vi.fn()}
        onPageSizeChange={handlePageSizeChange}
      />,
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '50' } });

    expect(handlePageSizeChange).toHaveBeenCalledWith(50);
  });

  it('should disable controls when isLoading is true', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={50}
        pageSize={10}
        isLoading={true}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
