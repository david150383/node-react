import { apiClient } from './client.ts';

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  priceCents: number;
  currency: string;
  category: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  createdAt: string;
  updated_at: string;
  updatedAt: string;
}

export interface ProductsPageResponse {
  data: Product[];
  pagination: {
    limit: number;
    offset?: number;
    has_more: boolean;
    next_cursor: string | null;
    total?: number;
  };
}

export interface RawProductsResponse {
  data?:
    | {
        products?: Record<string, unknown>[];
      }
    | Record<string, unknown>[];
  meta?: {
    limit?: number;
    offset?: number;
    hasNextPage?: boolean;
    has_more?: boolean;
    nextCursor?: string | null;
    next_cursor?: string | null;
    total?: number;
  };
}

export interface RawProductResponse {
  message?: string;
  data?:
    | {
        product?: Record<string, unknown>;
      }
    | Record<string, unknown>;
}

export function mapProduct(p: Record<string, unknown>): Product {
  const price = Number(p?.priceCents ?? p?.price_cents ?? 0);
  const created = (p?.createdAt ??
    p?.created_at ??
    new Date().toISOString()) as string | number | Date;
  const updated = (p?.updatedAt ??
    p?.updated_at ??
    new Date().toISOString()) as string | number | Date;
  return {
    id: String(p?.id ?? ''),
    sku: String(p?.sku ?? ''),
    name: String(p?.name ?? ''),
    slug: String(p?.slug ?? ''),
    description: String(p?.description ?? ''),
    price_cents: price,
    priceCents: price,
    currency: String(p?.currency ?? 'USD'),
    category: String(p?.category ?? 'General'),
    status: (p?.status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED') ?? 'ACTIVE',
    created_at:
      typeof created === 'string' ? created : new Date(created).toISOString(),
    createdAt:
      typeof created === 'string' ? created : new Date(created).toISOString(),
    updated_at:
      typeof updated === 'string' ? updated : new Date(updated).toISOString(),
    updatedAt:
      typeof updated === 'string' ? updated : new Date(updated).toISOString(),
  };
}

export const productsApi = {
  async getProducts(
    limit = 12,
    cursor?: string | null,
    category?: string,
    search?: string,
    offset?: number,
    status?: string,
  ): Promise<ProductsPageResponse> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (cursor) {
      params.set('cursor', cursor);
    }
    if (offset !== undefined && offset !== null) {
      params.set('offset', offset.toString());
    }
    if (category && category !== 'ALL') {
      params.set('category', category);
    }
    if (search && search.trim()) {
      params.set('search', search.trim());
    }
    if (status && status !== 'ALL') {
      params.set('status', status);
    }
    const res = await apiClient<RawProductsResponse>(
      `/products?${params.toString()}`,
    );
    const rawList =
      (res.data && !Array.isArray(res.data) && res.data.products) ||
      (Array.isArray(res.data) ? res.data : []);
    const meta = res.meta || {};
    return {
      data: rawList.map(mapProduct),
      pagination: {
        limit: meta.limit ?? limit,
        offset: meta.offset !== undefined ? Number(meta.offset) : offset,
        has_more: Boolean(meta.hasNextPage ?? meta.has_more),
        next_cursor: meta.nextCursor ?? meta.next_cursor ?? null,
        total: meta.total !== undefined ? Number(meta.total) : undefined,
      },
    };
  },

  async getProductById(id: string): Promise<{ data: Product }> {
    const res = await apiClient<RawProductResponse>(`/products/${id}`);
    const raw =
      (res.data && !Array.isArray(res.data) && 'product' in res.data
        ? res.data.product
        : res.data) || {};
    return { data: mapProduct(raw as Record<string, unknown>) };
  },
};
