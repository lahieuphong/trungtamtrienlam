// helpers/aiContentFilter.js

const BANNED_KEYWORDS = {
  violence: [
    "giết", "giết người", "bạo lực", "đánh nhau", "chém", "bắn", "tra tấn",
    "khủng bố", "đánh bom", "vũ khí", "súng", "dao đâm", "tấn công", "thảm sát",
    "hành quyết", "phóng hỏa", "đốt người",
    "kill", "murder", "violence", "attack", "bomb", "weapon", "terrorist",
    "massacre", "torture", "assassinate",
  ],
  sexual: [
    "tình dục", "khiêu dâm", "porn", "nude", "khỏa thân", "dâm dục",
    "quan hệ tình dục", "làm tình", "xxx", "nội dung 18+", "gợi dục",
    "phim người lớn", "ảnh khiêu dâm",
    "sexual", "explicit", "erotic", "adult content", "obscene", "pornography",
  ],
  politics: [
    "chống phá nhà nước", "lật đổ chính quyền", "phản động", "kích động biểu tình",
    "đảo chính", "cách mạng bạo lực", "tuyên truyền chống chính phủ",
    "kích động chính trị", "phá hoại chính quyền",
    "overthrow government", "coup", "sedition", "anti-government propaganda",
  ],
  hate: [
    "phân biệt chủng tộc", "kỳ thị dân tộc", "thù hận sắc tộc",
    "phân biệt đối xử", "bài ngoại", "kỳ thị tôn giáo",
    "racist", "racism", "hate speech", "discrimination", "bigotry", "xenophobia",
  ],
  drugs: [
    "ma túy", "heroin", "cocaine", "methamphetamine", "cần sa", "chất gây nghiện",
    "buôn ma túy", "mua bán chất cấm", "sử dụng ma túy",
    "narcotics", "drug trafficking", "meth", "ecstasy", "overdose",
  ],
  selfHarm: [
    "tự tử", "tự làm hại bản thân", "cắt tay tự tử", "uống thuốc ngủ quá liều",
    "nhảy lầu", "treo cổ", "muốn chết",
    "suicide", "self-harm", "self harm", "kill myself", "end my life",
    "want to die", "take my own life",
  ],
  scam: [
    "lừa đảo", "hack tài khoản", "đánh cắp thông tin", "phishing",
    "giả mạo", "chiếm đoạt tài sản", "rửa tiền",
    "phishing", "hacking", "identity theft", "money laundering", "fraud",
    "scam", "steal account", "bypass security",
  ],
};

const REFUSAL_MESSAGES = {
  violence:
    "Xin lỗi, tôi không thể trả lời các câu hỏi liên quan đến bạo lực hoặc gây hại cho người khác.",
  sexual:
    "Xin lỗi, tôi không thể cung cấp nội dung có tính chất tình dục hoặc khiêu dâm.",
  politics:
    "Xin lỗi, tôi không thể thảo luận về nội dung kích động chính trị hoặc chống phá nhà nước.",
  hate:
    "Xin lỗi, tôi không thể hỗ trợ nội dung mang tính phân biệt đối xử hoặc thù hận.",
  drugs:
    "Xin lỗi, tôi không thể cung cấp thông tin liên quan đến ma túy hoặc chất gây nghiện.",
  selfHarm:
    "Xin lỗi, tôi không thể hỗ trợ nội dung này. Nếu bạn đang gặp khó khăn về tâm lý, hãy liên hệ đường dây hỗ trợ sức khỏe tâm thần.",
  scam:
    "Xin lỗi, tôi không thể hỗ trợ các hoạt động gian lận, lừa đảo hoặc xâm phạm bảo mật.",
  default:
    "Xin lỗi, câu hỏi của bạn chứa nội dung không phù hợp. Vui lòng đặt câu hỏi khác.",
};

export const AI_ALLOWED_TOPIC_REFUSAL_MESSAGE =
  "Xin lỗi, tôi chỉ hỗ trợ các câu hỏi về thư viện văn bản pháp luật liên quan đến công nghệ và di sản. Bạn có thể hỏi như: liệt kê văn bản về chuyển đổi số, tìm quy định về an toàn thông tin, hoặc văn bản về bảo tồn di sản.";

export const AI_ALLOWED_TOPIC_SYSTEM_PROMPT = [
  "Bạn là trợ lý của thư viện văn bản pháp luật về công nghệ và di sản.",
  "Bắt buộc chỉ trả lời bằng tiếng Việt.",
  "Chỉ hỗ trợ tra cứu, tóm tắt, giải thích, so sánh và hướng dẫn sử dụng văn bản pháp luật liên quan đến công nghệ, chuyển đổi số, an toàn thông tin, dữ liệu, hệ thống thông tin, di sản văn hóa, di tích, bảo tồn, bảo tàng và văn hóa.",
  "Ưu tiên trả lời trực tiếp, dễ dùng. Nếu câu hỏi còn rộng nhưng vẫn thuộc phạm vi, không được hỏi lại ngay; hãy đưa danh sách gợi ý ban đầu gồm tên văn bản, nhóm văn bản hoặc từ khóa tra cứu phù hợp, sau đó mới gợi ý người dùng lọc sâu theo lĩnh vực, thời gian hoặc cơ quan ban hành.",
  "Khi người dùng hỏi 'mới nhất', 'gần đây', 'cập nhật' hoặc yêu cầu tìm kiếm trên internet, hãy dùng kết quả tra cứu web được cung cấp trong phiên này, ưu tiên nguồn chính thống và trả lời kèm nguồn tham khảo. Nếu không tìm được nguồn đáng tin cậy, hãy nói rõ chưa đủ nguồn để xác minh thay vì bịa số hiệu, ngày ban hành hoặc hiệu lực.",
  "Với câu hỏi kiểu 'cung cấp tên văn bản', hãy trả lời bằng danh sách ngắn 5-10 mục nếu có thể, mỗi mục gồm tên văn bản hoặc nhóm văn bản và lý do liên quan trong một dòng.",
  "Nếu câu hỏi không thuộc phạm vi thư viện văn bản pháp luật liên quan đến công nghệ hoặc di sản, hãy từ chối ngắn gọn và nhắc lại phạm vi hỗ trợ.",
  "Không trả lời kiến thức đời sống, giải trí, lập trình chung, tư vấn cá nhân hoặc chủ đề khác nếu không gắn trực tiếp với văn bản pháp luật trong phạm vi trên.",
  "Không bịa số hiệu văn bản, điều khoản, ngày ban hành hoặc nguồn. Nếu chưa chắc số hiệu hoặc ngày ban hành, hãy chỉ nêu tên/nhóm văn bản hoặc từ khóa tra cứu và ghi rõ cần kiểm chứng trong thư viện.",
].join(" ");

const LEGAL_LIBRARY_KEYWORDS = [
  "van ban",
  "van ban phap luat",
  "phap luat",
  "phap ly",
  "luat",
  "bo luat",
  "nghi dinh",
  "thong tu",
  "nghi quyet",
  "quyet dinh",
  "chi thi",
  "cong van",
  "quy dinh",
  "dieu khoan",
  "can cu",
  "chinh sach",
  "tieu chuan",
  "quy chuan",
  "thu tuc",
  "ho so",
];

const TECHNOLOGY_KEYWORDS = [
  "cong nghe",
  "cntt",
  "cong nghe thong tin",
  "chuyen doi so",
  "so hoa",
  "du lieu",
  "co so du lieu",
  "du lieu ca nhan",
  "an toan thong tin",
  "an ninh mang",
  "bao mat",
  "he thong thong tin",
  "phan mem",
  "nen tang so",
  "internet",
  "giao dich dien tu",
  "chu ky so",
  "dinh danh dien tu",
  "tri tue nhan tao",
  "iot",
  "blockchain",
  "luu tru dien tu",
];

const LIBRARY_CONTEXT_KEYWORDS = [
  "thu vien",
  "van ban",
  "tai lieu",
  "danh muc",
  "muc luc",
  "tra cuu",
  "tim kiem",
];

const HERITAGE_KEYWORDS = [
  "di san",
  "di san van hoa",
  "di san thien nhien",
  "di tich",
  "di tich lich su",
  "bao ton",
  "tu bo",
  "phuc dung",
  "phuc hoi",
  "khao co",
  "co vat",
  "hien vat",
  "bao tang",
  "danh lam",
  "thang canh",
  "le hoi",
  "van hoa",
  "lich su",
  "trung tam bao ton",
];

const LIBRARY_HELP_KEYWORDS = [
  "huong dan",
  "cach dung",
  "cach su dung",
  "su dung thu vien",
  "tim van ban",
  "tra cuu van ban",
  "loc van ban",
  "tai van ban",
  "mo van ban",
  "xem van ban",
];

const BROAD_IN_DOMAIN_REQUEST_KEYWORDS = [
  "moi nhat",
  "gan day",
  "cap nhat",
  "cung cap",
  "cho toi",
  "liet ke",
  "danh sach",
  "ten van ban",
  "van ban nao",
  "quy dinh nao",
  "tim giup",
  "goi y",
];

const LEGAL_FOLLOW_UP_KEYWORDS = [
  "la gi",
  "ve gi",
  "noi dung",
  "tom tat",
  "giai thich",
  "chi tiet",
  "hieu luc",
  "con hieu luc",
  "het hieu luc",
  "sua doi",
  "bo sung",
  "thay the",
  "lien quan",
  "cai nay",
  "van ban nay",
  "nghi dinh nay",
  "quyet dinh nay",
  "thong tu nay",
  "nghi quyet nay",
  "dieu nao",
  "khoan nao",
];

const SPECIFIC_LEGAL_DOCUMENT_TYPES = [
  "luat",
  "nghi dinh",
  "quyet dinh",
  "thong tu",
  "nghi quyet",
  "chi thi",
  "cong van",
];

const GREETING_KEYWORDS = ["xin chao", "chao", "hello", "hi"];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function includesAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isGreetingOnly(normalizedText) {
  const compact = normalizedText.replace(/[!?.\s,;:]+/g, " ").trim();
  return GREETING_KEYWORDS.includes(compact);
}

function hasLegalDocumentNumber(normalizedText) {
  return /\b\d{1,4}\/\d{4}\/[a-z0-9-]+\b/i.test(normalizedText);
}

function isSpecificLegalDocumentQuery(normalizedText) {
  const mentionsDocumentType = includesAnyKeyword(
    normalizedText,
    SPECIFIC_LEGAL_DOCUMENT_TYPES
  );

  return mentionsDocumentType && (
    normalizedText.includes(" so ") ||
    normalizedText.includes(" so:") ||
    hasLegalDocumentNumber(normalizedText)
  );
}

export function isAllowedAITopic(text) {
  const normalizedText = normalizeText(text);

  if (!normalizedText.trim()) return false;
  if (isGreetingOnly(normalizedText)) return true;
  if (isSpecificLegalDocumentQuery(normalizedText)) return true;

  const mentionsLegalLibrary = includesAnyKeyword(
    normalizedText,
    LEGAL_LIBRARY_KEYWORDS
  );
  const mentionsTechnology = includesAnyKeyword(
    normalizedText,
    TECHNOLOGY_KEYWORDS
  );
  const mentionsHeritage = includesAnyKeyword(
    normalizedText,
    HERITAGE_KEYWORDS
  );
  const asksLibraryHelp = includesAnyKeyword(
    normalizedText,
    LIBRARY_HELP_KEYWORDS
  );
  const mentionsLibraryContext = includesAnyKeyword(
    normalizedText,
    LIBRARY_CONTEXT_KEYWORDS
  );
  const isBroadInDomainRequest = includesAnyKeyword(
    normalizedText,
    BROAD_IN_DOMAIN_REQUEST_KEYWORDS
  );

  if (asksLibraryHelp && (mentionsLegalLibrary || mentionsLibraryContext)) {
    return true;
  }

  if ((mentionsTechnology || mentionsHeritage) && isBroadInDomainRequest) {
    return true;
  }

  return mentionsLegalLibrary && (mentionsTechnology || mentionsHeritage);
}

export function isLegalFollowUpQuestion(text) {
  const normalizedText = normalizeText(text);
  return includesAnyKeyword(normalizedText, LEGAL_FOLLOW_UP_KEYWORDS);
}

export function hasAllowedAIContext(messages = []) {
  if (!Array.isArray(messages)) return false;

  return messages
    .slice(-12)
    .some((message) =>
      ["user", "assistant"].includes(message?.role) &&
      isAllowedAITopic(message?.content || "")
    );
}

/**
 * Kiểm tra text có chứa nội dung bị cấm không.
 * @param {string} text
 * @returns {{ blocked: boolean, category: string|null, matchedWord: string|null }}
 */
export function checkBannedContent(text) {
  if (!text || typeof text !== "string") {
    return { blocked: false, category: null, matchedWord: null };
  }

  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(BANNED_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return { blocked: true, category, matchedWord: keyword };
      }
    }
  }

  return { blocked: false, category: null, matchedWord: null };
}

/**
 * Lấy thông điệp từ chối theo danh mục.
 * @param {string|null} category
 * @returns {string}
 */
export function getRefusalMessage(category) {
  return REFUSAL_MESSAGES[category] ?? REFUSAL_MESSAGES.default;
}

/**
 * Kiểm tra câu hỏi đầu vào của người dùng trước khi gửi tới AI.
 * @param {string} userMessage
 * @returns {{ allowed: boolean, refusalMessage: string|null }}
 */
export function filterUserInput(userMessage, options = {}) {
  const { enforceAllowedTopic = true } = options;
  const { blocked, category } = checkBannedContent(userMessage);
  if (blocked) {
    return { allowed: false, refusalMessage: getRefusalMessage(category) };
  }
  if (enforceAllowedTopic && !isAllowedAITopic(userMessage)) {
    return { allowed: false, refusalMessage: AI_ALLOWED_TOPIC_REFUSAL_MESSAGE };
  }
  return { allowed: true, refusalMessage: null };
}

/**
 * Kiểm tra câu trả lời của AI trước khi hiển thị cho người dùng.
 * @param {string} aiResponse
 * @returns {{ safe: boolean, safeResponse: string }}
 */
export function filterAIResponse(aiResponse) {
  const { blocked, category } = checkBannedContent(aiResponse);
  if (blocked) {
    return { safe: false, safeResponse: getRefusalMessage(category) };
  }
  return { safe: true, safeResponse: aiResponse };
}
