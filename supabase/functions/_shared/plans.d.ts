export declare const PLANS: Record<"cobranca" | "sobra", { name: string; prices: number[]; yearly: number | null; checkout?: string; checkoutAnual?: string; site?: string; home?: string }>;
export declare const GUARANTEE_DAYS: number;
export declare const GRACE_DAYS: number;
export declare function hash(text: string): number;
export declare function priceFor(uid: string, product: "cobranca" | "sobra", cycle: "mensal" | "anual"): number;
