import {
  inspectPhotoInvoice,
  invoiceDuplicateHints,
  photoInvoiceSchema,
  preparePhotoInvoiceConfirmation,
  type PhotoInvoice,
} from "./photo-invoice.js";

const sources = [{ sha256: "a".repeat(64), page: 1 }];
function sample(): PhotoInvoice {
  return {
    documentType: "purchase",
    sellerName: "합성 거래처",
    sellerBusinessNumber: null,
    buyerBusinessNumber: null,
    documentNumber: null,
    issuedOn: "2026-02-04",
    currency: "KRW",
    taxTreatment: "unknown",
    statedLineTotal: "8600",
    unresolved: [],
    rows: [
      {
        id: "line1",
        rawText: "합성 품목 A / 3갑 / 단가 1200 / 금액 3600",
        productName: "합성 품목 A",
        supplierProductCode: "000123",
        barcode: null,
        manufacturer: null,
        packageText: "원문 규격 0",
        quantity: "3",
        unit: "갑",
        unitPrice: "1200",
        amount: "3600",
        lotNumber: null,
        expiresOn: null,
      },
      {
        id: "line2",
        rawText: "합성 품목 B / 2박스 / 단가 2500 / 금액 5000",
        productName: "합성 품목 B",
        supplierProductCode: null,
        barcode: null,
        manufacturer: null,
        packageText: null,
        quantity: "2",
        unit: "박스",
        unitPrice: "2500",
        amount: "5000",
        lotNumber: null,
        expiresOn: null,
      },
    ],
  };
}
it("prepares a complete invoice without requiring a common product identity or guessing tax", () => {
  const doc = sample();
  const inspected = inspectPhotoInvoice(doc, sources);
  expect(inspected.readyForConfirmation).toBe(true);
  expect(inspected.lineTotal).toBe("8600");
  const result = preparePhotoInvoiceConfirmation(
    doc,
    sources,
    inspected.revision,
  );
  expect(result.productReviewCandidates).toHaveLength(2);
  expect(result.productReviewCandidates[0]).toMatchObject({
    rawSupplierProductCode: "000123",
    rawPackageText: "원문 규격 0",
    rawBarcode: null,
    reviewStatus: "pending",
  });
  expect(result.invoice.taxTreatment).toBe("unknown");
  expect(doc).toEqual(sample());
});
it("keeps unknown quantity/amount null and shows only the known subtotal", () => {
  const doc = sample();
  doc.rows[1].quantity = null;
  doc.rows[1].amount = null;
  doc.statedLineTotal = null;
  const result = inspectPhotoInvoice(doc, sources);
  expect(result.lineTotal).toBeNull();
  expect(result.knownLineSubtotal).toBe("3600");
  expect(result.issues).toEqual(
    expect.arrayContaining([
      { path: "rows.line2.quantity", code: "REQUIRED" },
      { path: "rows.line2.amount", code: "REQUIRED" },
    ]),
  );
  expect(() =>
    preparePhotoInvoiceConfirmation(doc, sources, result.revision),
  ).toThrow("INVOICE_REVIEW_REQUIRED");
});
it("blocks an unresolved recognition even if a tentative number is present", () => {
  const doc = sample();
  doc.unresolved = ["rows.line2.amount"];
  const result = inspectPhotoInvoice(doc, sources);
  expect(result.lineTotal).toBeNull();
  expect(result.readyForConfirmation).toBe(false);
});
it("requires a new review revision after the user corrects quantity and amount", () => {
  const doc = sample();
  const previous = inspectPhotoInvoice(doc, sources);
  doc.rows[0].quantity = "4";
  doc.rows[0].amount = "4800";
  doc.statedLineTotal = "9800";
  expect(() =>
    preparePhotoInvoiceConfirmation(doc, sources, previous.revision),
  ).toThrow("INVOICE_REVISION_CONFLICT");
  const corrected = inspectPhotoInvoice(doc, sources);
  expect(
    preparePhotoInvoiceConfirmation(doc, sources, corrected.revision).lineTotal,
  ).toBe("9800");
});
it("rejects stale confirmation when the attached source changes", () => {
  const doc = sample();
  const before = inspectPhotoInvoice(doc, sources);
  expect(() =>
    preparePhotoInvoiceConfirmation(
      doc,
      [{ sha256: "b".repeat(64), page: 1 }],
      before.revision,
    ),
  ).toThrow("INVOICE_REVISION_CONFLICT");
});
it("uses exact decimal arithmetic without floating point rounding", () => {
  const doc = sample();
  doc.rows = [
    { ...doc.rows[0], quantity: "0.1", unitPrice: "0.2", amount: "0.02" },
  ];
  doc.statedLineTotal = "0.02";
  expect(inspectPhotoInvoice(doc, sources)).toMatchObject({
    lineTotal: "0.02",
    readyForConfirmation: true,
  });
});
it("does not silently fix a mismatched line amount or printed line total", () => {
  const doc = sample();
  doc.rows[0].amount = "3601";
  const result = inspectPhotoInvoice(doc, sources);
  expect(result.issues).toEqual(
    expect.arrayContaining([
      { path: "rows.line1.amount", code: "LINE_AMOUNT_MISMATCH" },
      { path: "statedLineTotal", code: "TOTAL_MISMATCH" },
    ]),
  );
  expect(result.invoice.rows[0].amount).toBe("3601");
});
it("blocks zero quantity but preserves zero price and free goods", () => {
  const doc = sample();
  doc.rows[0].quantity = "0";
  expect(inspectPhotoInvoice(doc, sources).issues).toContainEqual({
    path: "rows.line1.quantity",
    code: "ZERO_QUANTITY",
  });
  doc.rows[0].quantity = "1";
  doc.rows[0].unitPrice = "0";
  doc.rows[0].amount = "0";
  doc.statedLineTotal = "5000";
  expect(inspectPhotoInvoice(doc, sources).readyForConfirmation).toBe(true);
});
it("preserves a return as a distinct document without rewriting signs or stock", () => {
  const doc = sample();
  doc.documentType = "return";
  const result = inspectPhotoInvoice(doc, sources);
  expect(result.invoice.documentType).toBe("return");
  expect(result.lineTotal).toBe("8600");
});
it.each(["2026-02-30", "2026-13-01"])(
  "rejects impossible invoice date %s",
  (issuedOn) => {
    expect(
      photoInvoiceSchema.safeParse({ ...sample(), issuedOn }).success,
    ).toBe(false);
  },
);
it("rejects duplicate row identities instead of merging identical-looking rows", () => {
  const doc = sample();
  doc.rows[1].id = "line1";
  expect(photoInvoiceSchema.safeParse(doc).success).toBe(false);
  doc.rows[1] = { ...doc.rows[0], id: "line2" };
  doc.statedLineTotal = "7200";
  expect(inspectPhotoInvoice(doc, sources).invoice.rows).toHaveLength(2);
});
it("rejects negative/comma-formatted/non-finite/over-precision money instead of guessing", () => {
  for (const amount of ["-1", "1,200", "NaN", "0.1234567"]) {
    const doc = sample();
    doc.rows[0].amount = amount;
    expect(photoInvoiceSchema.safeParse(doc).success).toBe(false);
  }
});
it("rejects invented field paths, QR inputs and product master creation commands", () => {
  expect(
    photoInvoiceSchema.safeParse({
      ...sample(),
      unresolved: ["rows.missing.amount"],
    }).success,
  ).toBe(false);
  for (const extra of [
    { qrUrl: "https://example.invalid" },
    { createProduct: true },
    { actorId: "model-supplied" },
  ])
    expect(
      photoInvoiceSchema.safeParse({ ...sample(), ...extra }).success,
    ).toBe(false);
});
it("scopes duplicate hints by authenticated owner and does not equate missing document numbers", () => {
  const doc = sample();
  const first = invoiceDuplicateHints("organization:synthetic-a", doc, sources);
  expect(first.documentFingerprint).toBeNull();
  expect(first.needsDuplicateReview).toBe(true);
  expect(
    invoiceDuplicateHints("organization:synthetic-b", doc, sources)
      .photoFingerprint,
  ).not.toBe(first.photoFingerprint);
  expect(() => invoiceDuplicateHints(" ", doc, sources)).toThrow(
    "INVOICE_OWNER_REQUIRED",
  );
});
it("finds a document hint across different photos and keeps returns distinct", () => {
  const doc = sample();
  doc.sellerBusinessNumber = "0000000000";
  doc.buyerBusinessNumber = "1111111111";
  doc.documentNumber = "SYNTHETIC-001";
  const first = invoiceDuplicateHints("organization:synthetic", doc, sources);
  const second = invoiceDuplicateHints("organization:synthetic", doc, [
    { sha256: "b".repeat(64), page: 1 },
  ]);
  expect(second.documentFingerprint).toBe(first.documentFingerprint);
  expect(second.photoFingerprint).not.toBe(first.photoFingerprint);
  doc.documentType = "return";
  expect(
    invoiceDuplicateHints("organization:synthetic", doc, sources)
      .documentFingerprint,
  ).not.toBe(first.documentFingerprint);
});
it("keeps multi-page revision stable for request ordering but changes it for page reassignment", () => {
  const pages = [...sources, { sha256: "b".repeat(64), page: 2 }];
  const original = inspectPhotoInvoice(sample(), pages);
  expect(inspectPhotoInvoice(sample(), [pages[1], pages[0]]).revision).toBe(
    original.revision,
  );
  expect(
    inspectPhotoInvoice(sample(), [
      { ...pages[0], page: 2 },
      { ...pages[1], page: 1 },
    ]).revision,
  ).not.toBe(original.revision);
  expect(() => inspectPhotoInvoice(sample(), [pages[0], pages[0]])).toThrow();
});

it("keeps unclear barcode/package metadata for later admin review without blocking the transaction", () => {
  const doc = sample();
  doc.rows[0].barcode = "판독 불명";
  doc.unresolved = ["rows.line1.barcode", "rows.line1.packageText"];
  const inspected = inspectPhotoInvoice(doc, sources);
  expect(inspected.readyForConfirmation).toBe(true);
  expect(inspected.warnings).toHaveLength(2);
  expect(
    preparePhotoInvoiceConfirmation(doc, sources, inspected.revision)
      .productReviewCandidates[0],
  ).toMatchObject({
    rawBarcode: "판독 불명",
    unresolvedFields: ["barcode", "packageText"],
  });
});
it("does not validate an amount against an unresolved tentative unit price", () => {
  const doc = sample();
  doc.rows[0].unitPrice = "999";
  doc.unresolved = ["rows.line1.unitPrice"];
  expect(inspectPhotoInvoice(doc, sources)).toMatchObject({
    readyForConfirmation: true,
    lineTotal: "8600",
    warnings: [{ path: "rows.line1.unitPrice", code: "UNRESOLVED" }],
  });
});
it("does not issue a document duplicate fingerprint from an unresolved document identifier", () => {
  const doc = sample();
  doc.sellerBusinessNumber = "0000000000";
  doc.buyerBusinessNumber = "1111111111";
  doc.documentNumber = "SYNTHETIC-001";
  doc.unresolved = ["documentNumber"];
  expect(
    invoiceDuplicateHints("organization:synthetic", doc, sources)
      .documentFingerprint,
  ).toBeNull();
});
