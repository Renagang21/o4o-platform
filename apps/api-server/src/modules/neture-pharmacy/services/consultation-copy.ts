export const consultationLanguages = [
  "ko",
  "en",
  "zh",
  "ja",
  "vi",
  "th",
  "id",
] as const;
export type ConsultationLocale = (typeof consultationLanguages)[number];
export function validConsultationLanguage(
  value: unknown,
): value is ConsultationLocale {
  return (
    typeof value === "string" && consultationLanguages.some((l) => l === value)
  );
}
const copy = {
  ko: {
    location: "상품 위치",
    missingLocation: "직원에게 상품 위치를 확인해 주세요.",
    pharmacist: "약 선택과 복용에 관한 질문은 약사에게 문의해 주세요.",
    notice: "약사에게 안내",
    productQuestion:
      "어떤 상품을 안내할까요? 상품 이름으로 찾거나 목록에서 선택해 주세요.",
    purposeQuestion: "상품 위치와 제품 설명 중 무엇을 안내할까요?",
    noMaterial: "게시된 제품 설명이 없습니다. 직원에게 확인해 주세요.",
  },
  en: {
    location: "Product location",
    missingLocation: "Please ask a staff member for the product location.",
    pharmacist: "Please ask a pharmacist about choosing or taking medicines.",
    notice: "Ask a pharmacist",
    productQuestion:
      "Which product would you like help with? Search by name or select a product.",
    purposeQuestion:
      "Would you like the product location or product information?",
    noMaterial:
      "No published product information is available. Please ask a staff member.",
  },
  zh: {
    location: "商品位置",
    missingLocation: "请向店员询问商品位置。",
    pharmacist: "关于药品选择和服用的问题，请咨询药师。",
    notice: "咨询药师",
    productQuestion: "您想了解哪个商品？请按名称搜索或选择商品。",
    purposeQuestion: "您想查找商品位置还是查看商品说明？",
    noMaterial: "暂无已发布的商品说明，请咨询店员。",
  },
  ja: {
    location: "商品の場所",
    missingLocation: "商品の場所はスタッフにお尋ねください。",
    pharmacist: "薬の選び方や服用については、薬剤師にご相談ください。",
    notice: "薬剤師に相談",
    productQuestion:
      "どの商品をご案内しましょうか。商品名で検索するか選択してください。",
    purposeQuestion: "商品の場所と商品説明のどちらをご希望ですか。",
    noMaterial:
      "公開されている商品説明がありません。スタッフにお尋ねください。",
  },
  vi: {
    location: "Vị trí sản phẩm",
    missingLocation: "Vui lòng hỏi nhân viên về vị trí sản phẩm.",
    pharmacist: "Vui lòng hỏi dược sĩ về việc chọn và sử dụng thuốc.",
    notice: "Hỏi dược sĩ",
    productQuestion:
      "Bạn cần hướng dẫn về sản phẩm nào? Hãy tìm theo tên hoặc chọn sản phẩm.",
    purposeQuestion: "Bạn muốn tìm vị trí hay xem thông tin sản phẩm?",
    noMaterial:
      "Chưa có thông tin sản phẩm được công bố. Vui lòng hỏi nhân viên.",
  },
  th: {
    location: "ตำแหน่งสินค้า",
    missingLocation: "โปรดสอบถามตำแหน่งสินค้าจากพนักงาน",
    pharmacist: "โปรดปรึกษาเภสัชกรเกี่ยวกับการเลือกและการใช้ยา",
    notice: "ปรึกษาเภสัชกร",
    productQuestion: "ต้องการข้อมูลสินค้าใด กรุณาค้นหาชื่อหรือเลือกสินค้า",
    purposeQuestion: "ต้องการตำแหน่งสินค้าหรือข้อมูลสินค้า",
    noMaterial: "ยังไม่มีข้อมูลสินค้าที่เผยแพร่ โปรดสอบถามพนักงาน",
  },
  id: {
    location: "Lokasi produk",
    missingLocation: "Silakan tanyakan lokasi produk kepada staf.",
    pharmacist:
      "Silakan tanyakan pemilihan dan penggunaan obat kepada apoteker.",
    notice: "Tanya apoteker",
    productQuestion:
      "Produk apa yang ingin Anda ketahui? Cari berdasarkan nama atau pilih produk.",
    purposeQuestion: "Apakah Anda ingin lokasi atau informasi produk?",
    noMaterial:
      "Belum ada informasi produk yang dipublikasikan. Silakan tanyakan kepada staf.",
  },
} satisfies Record<ConsultationLocale, Record<string, string>>;
export const consultationCopy = (language: unknown) =>
  copy[validConsultationLanguage(language) ? language : "ko"];
