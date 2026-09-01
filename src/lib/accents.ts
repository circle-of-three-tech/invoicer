export type Accent = {
  key: string;
  label: string;
  from: string;
  to: string;
  solid: string;
};

export const ACCENTS: Accent[] = [
  { key: "iris", label: "Iris", from: "#6d4bff", to: "#6d4bff", solid: "#6d4bff" },
  { key: "aqua", label: "Aqua", from: "#0fb5aa", to: "#0fb5aa", solid: "#0fb5aa" },
  { key: "ember", label: "Ember", from: "#f2673f", to: "#f2673f", solid: "#f2673f" },
  { key: "rose", label: "Rose", from: "#e23e6b", to: "#e23e6b", solid: "#e23e6b" },
  { key: "gold", label: "Gold", from: "#d99a15", to: "#d99a15", solid: "#d99a15" },
  { key: "mint", label: "Mint", from: "#12a366", to: "#12a366", solid: "#12a366" },
];

export function accent(key?: string): Accent {
  return ACCENTS.find((a) => a.key === key) ?? ACCENTS[0];
}

/** Returns the accent's solid color (kept for call-site compatibility). */
export function accentGradient(key?: string) {
  return accent(key).solid;
}
