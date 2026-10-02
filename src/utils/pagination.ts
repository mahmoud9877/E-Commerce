import type { ParsedQs } from "qs";

const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

export interface PageParams {
  page: number;
  size: number;
  skip: number;
}

export interface PageMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: PageMeta;
}

// Reads ?page=&size= from the query string, clamping to sane bounds
export function getPageParams(query: ParsedQs): PageParams {
  const page = Math.max(parseInt(String(query.page)) || 1, 1);
  const size = Math.min(Math.max(parseInt(String(query.size)) || DEFAULT_SIZE, 1), MAX_SIZE);
  return { page, size, skip: (page - 1) * size };
}

export function pageMeta({ page, size }: PageParams, total: number): PageMeta {
  const totalPages = Math.ceil(total / size);
  return {
    page,
    size,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
