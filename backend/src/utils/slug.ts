import slugifyModule from "slugify";

// slugify is CommonJS; under NodeNext its typed default export sits on `.default`
const slugify = slugifyModule.default;

export const toSlug = (name: string): string =>
  slugify(name, { replacement: "-", trim: true, lower: true });
