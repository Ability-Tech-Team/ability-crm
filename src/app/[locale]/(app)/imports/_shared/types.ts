/** The translate function the entry schemas take, bound to `imports.entry`. */
export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
