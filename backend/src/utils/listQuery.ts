import { Types, type SortOrder } from "mongoose";
import type { ParsedQs } from "qs";

type FieldType = "id" | "number" | "string";

// Declares which fields a public listing may filter, sort, select and search on.
// Anything not listed is ignored, so a query string can never inject operators or reach private fields.
export interface ListSpec {
  filters: Record<string, FieldType>;
  sortable: readonly string[];
  selectable: readonly string[];
  searchable?: readonly string[];
}

export interface ListQuery {
  filter: Record<string, unknown>;
  sort: Record<string, SortOrder>;
  select: string;
}

const RANGE_OPS = ["gt", "gte", "lt", "lte"] as const;
const MAX_SEARCH_LENGTH = 100;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Returns undefined for values that do not fit the field type (they are skipped, not errors)
function cast(value: unknown, type: FieldType): unknown {
  if (typeof value !== "string") return undefined;
  if (type === "id") return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
  if (type === "number") {
    const number = Number(value);
    return value.trim() !== "" && Number.isFinite(number) ? number : undefined;
  }
  return value;
}

function fieldCondition(raw: unknown, type: FieldType): unknown {
  // ?price[gte]=10&price[lt]=50 (numbers only)
  if (type === "number" && raw && typeof raw === "object" && !Array.isArray(raw)) {
    const range: Record<string, number> = {};
    for (const op of RANGE_OPS) {
      const value = cast((raw as ParsedQs)[op], "number");
      if (value !== undefined) range[`$${op}`] = value as number;
    }
    return Object.keys(range).length ? range : undefined;
  }
  // ?size=s&size=m matches any of the values
  if (Array.isArray(raw)) {
    const values = raw.map((item) => cast(item, type)).filter((item) => item !== undefined);
    return values.length ? { $in: values } : undefined;
  }
  return cast(raw, type);
}

const listOf = (raw: unknown) =>
  typeof raw === "string" ? raw.split(",").map((part) => part.trim()).filter(Boolean) : [];

export function parseListQuery(query: ParsedQs, spec: ListSpec): ListQuery {
  const filter: Record<string, unknown> = {};
  for (const [field, type] of Object.entries(spec.filters)) {
    if (query[field] === undefined) continue;
    const condition = fieldCondition(query[field], type);
    if (condition !== undefined) filter[field] = condition;
  }

  const search = typeof query.search === "string" ? query.search.trim().slice(0, MAX_SEARCH_LENGTH) : "";
  if (search && spec.searchable?.length) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = spec.searchable.map((field) => ({ [field]: pattern }));
  }

  const sort: Record<string, SortOrder> = {};
  for (const key of listOf(query.sort)) {
    const field = key.replace(/^-/, "");
    if (spec.sortable.includes(field)) sort[field] = key.startsWith("-") ? -1 : 1;
  }
  // Stable order so pages never overlap
  sort._id ??= 1;

  const requested = listOf(query.fields).filter((field) => spec.selectable.includes(field));
  const select = (requested.length ? requested : spec.selectable).join(" ");

  return { filter, sort, select };
}
