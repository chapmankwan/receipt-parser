import { z } from "zod";

// ---------------------------------------------------------------------------
// Parsed receipt schema
//
// Defines the shape that both the stub parser and the real Claude parser
// must return. The receipt.parse tRPC procedure validates against this.
// Keeping the schema here means step 9 (swapping in Claude) only touches
// the parseReceipt() function — nothing else changes.
// ---------------------------------------------------------------------------

export const parsedLineItemSchema = z.object({
  rawName:           z.string(),
  resolvedName:      z.string(),
  quantityType:      z.enum(["unit", "weight"]),
  quantity:          z.number().positive(),
  weightUnit:        z.enum(["lb", "kg", "oz", "g"]).nullable(),
  unitPrice:         z.number().positive(),
  totalPrice:        z.number().positive(),
  suggestedCategory: z.string().nullable(),
  // Claude flags items it's uncertain about so the user can review them
  needsReview:       z.boolean(),
  reviewReason:      z.string().nullable(),
});

export const parsedReceiptSchema = z.object({
  storeName:          z.string().nullable(),
  storeChain:         z.string().nullable(),
  storeLocation:      z.string().nullable(),
  purchasedOn:        z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  subtotal:           z.number().nullable(),
  tax:                z.number().nullable(),
  total:              z.number(),
  currency:           z.string().default("CAD"),
  lineItems:          z.array(parsedLineItemSchema).min(1),
  // True if Claude is uncertain about the whole receipt (e.g. blurry image)
  lowConfidence:      z.boolean(),
  lowConfidenceReason: z.string().nullable(),
});

export type ParsedReceipt  = z.infer<typeof parsedReceiptSchema>;
export type ParsedLineItem = z.infer<typeof parsedLineItemSchema>;

// ---------------------------------------------------------------------------
// parseReceipt()
//
// STUB IMPLEMENTATION — returns realistic hardcoded data.
// Replace the body of this function in step 9 with the real Claude API call.
// The function signature and return type stay exactly the same.
//
// The stub simulates:
//   - A mix of unit and weight items
//   - An item that needs review (blurry/ambiguous)
//   - An item with no suggested category
//   - Realistic Canadian grocery receipt totals
// ---------------------------------------------------------------------------

export async function parseReceipt(
  _imageBase64: string,
  _mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"
): Promise<ParsedReceipt> {
  // Simulate network latency so the UI loading state is visible during testing
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return {
    storeName:     "Real Canadian Superstore",
    storeChain:    "Real Canadian Superstore",
    storeLocation: "Vancouver, BC",
    purchasedOn:   new Date().toISOString().split("T")[0]!,
    subtotal:      22.14,
    tax:           1.10,
    total:         23.24,
    currency:      "CAD",
    lowConfidence: false,
    lowConfidenceReason: null,
    lineItems: [
      {
        rawName:           "DAIRYLAND HOMO MILK 4L",
        resolvedName:      "Dairyland Homogenized Milk 4L",
        quantityType:      "unit",
        quantity:          1,
        weightUnit:        null,
        unitPrice:         7.49,
        totalPrice:        7.49,
        suggestedCategory: "Dairy",
        needsReview:       false,
        reviewReason:      null,
      },
      {
        // Weight item — the core edge case this app handles
        rawName:           "ORG BANANA 1.24 kg @ 1.09/kg",
        resolvedName:      "Organic Bananas",
        quantityType:      "weight",
        quantity:          1.24,
        weightUnit:        "kg",
        unitPrice:         1.09,
        totalPrice:        1.35,
        suggestedCategory: "Produce",
        needsReview:       false,
        reviewReason:      null,
      },
      {
        rawName:           "PC BLU CHKN BRST BNLS SKN",
        resolvedName:      "PC Blue Menu Boneless Skinless Chicken Breast",
        quantityType:      "unit",
        quantity:          1,
        weightUnit:        null,
        unitPrice:         11.99,
        totalPrice:        11.99,
        suggestedCategory: "Meat & Seafood",
        needsReview:       false,
        reviewReason:      null,
      },
      {
        // Item flagged for review — abbreviation Claude isn't confident about
        rawName:           "GRN ONIO BNC",
        resolvedName:      "Green Onion Bunch",
        quantityType:      "unit",
        quantity:          1,
        weightUnit:        null,
        unitPrice:         1.49,
        totalPrice:        1.49,
        suggestedCategory: "Produce",
        needsReview:       true,
        reviewReason:      "Abbreviation 'GRN ONIO BNC' is ambiguous — confirm this is green onion",
      },
      {
        // Item with no category — e.g. a misc household item
        rawName:           "GLAD WRAP 30M",
        resolvedName:      "Glad Cling Wrap 30m",
        quantityType:      "unit",
        quantity:          1,
        weightUnit:        null,
        unitPrice:         4.99,
        totalPrice:        4.99,
        suggestedCategory: null,
        needsReview:       false,
        reviewReason:      null,
      },
    ],
  };
}