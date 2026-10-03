import type { FilterQuery, Model } from "mongoose";
import { AppError } from "./AppError.js";

// Lowercases a name and makes sure no other document already uses it.
// Pass currentName on update to reject renaming to the same name.
// The unique index on `name` still catches a concurrent duplicate (mapped to 409 by ErrorHandler).
export async function uniqueName<T>(
  model: Model<T>,
  name: string,
  label: string,
  currentName?: string
): Promise<string> {
  const normalized = name.toLowerCase();
  if (normalized === currentName) {
    throw new AppError(`Cannot update to the same ${label} name`, 400);
  }
  if (await model.exists({ name: normalized } as FilterQuery<T>)) {
    throw new AppError(`Duplicated ${label} name ${normalized}`, 409);
  }
  return normalized;
}
