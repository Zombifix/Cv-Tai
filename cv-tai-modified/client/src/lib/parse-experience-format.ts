export interface ParsedExperience {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  responsibilities?: string[];
  achievements?: string[];
  skills?: string[];
}

interface DetectionResult {
  format: "text" | "json-single" | "json-multi";
  data: ParsedExperience | ParsedExperience[] | null;
  error?: string;
}

// Normalize date to YYYY-MM-DD format
function normalizeDate(input: any): string | undefined {
  if (!input) return undefined;
  if (typeof input !== "string") return undefined;

  const str = input.trim().toLowerCase();
  if (str === "present") return undefined; // No end date for current role
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Try YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) return `${str}-01`;
  
  // Try parsing with Date
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }
  
  return undefined;
}

// Map common field names to our schema
function mapExperienceFields(obj: any): ParsedExperience | null {
  if (!obj || typeof obj !== "object") return null;

  const mapped: ParsedExperience = {
    title: obj.title || obj.role || obj.position || obj.jobTitle || "",
    company: obj.company || obj.employer || obj.organization || "",
    startDate: normalizeDate(obj.startDate || obj.start || obj.startMonth),
    endDate: normalizeDate(obj.endDate || obj.end || obj.endMonth),
  };

  if (!mapped.title || !mapped.company) return null; // Minimum required fields

  // Summary from various fields
  if (obj.summary) mapped.summary = obj.summary;
  else if (obj.description) mapped.summary = obj.description;
  else if (obj.overview) mapped.summary = obj.overview;

  // Bullets/responsibilities
  if (Array.isArray(obj.responsibilities)) {
    mapped.responsibilities = obj.responsibilities.filter((r: any) => typeof r === "string");
  } else if (Array.isArray(obj.bullets)) {
    mapped.responsibilities = obj.bullets.filter((b: any) => typeof b === "string");
  } else if (Array.isArray(obj.achievements)) {
    mapped.achievements = obj.achievements.filter((a: any) => typeof a === "string");
  }

  // Skills
  if (Array.isArray(obj.skills)) {
    mapped.skills = obj.skills.filter((s: any) => typeof s === "string");
  } else if (Array.isArray(obj.technologies)) {
    mapped.skills = obj.technologies.filter((t: any) => typeof t === "string");
  } else if (Array.isArray(obj.tools)) {
    mapped.skills = obj.tools.filter((t: any) => typeof t === "string");
  }

  return mapped;
}

export function detectAndParseFormat(input: string): DetectionResult {
  const trimmed = input.trim();

  // Try to parse as JSON
  let json: any;
  try {
    json = JSON.parse(trimmed);
  } catch {
    // Not JSON - treat as free text
    return { format: "text", data: null };
  }

  // JSON is valid
  if (!json || typeof json !== "object") {
    return { format: "text", data: null };
  }

  // Check if it's a full profile with experiences array
  if (json.experiences && Array.isArray(json.experiences)) {
    const parsed = json.experiences
      .map((exp: any) => mapExperienceFields(exp))
      .filter((exp: ParsedExperience | null): exp is ParsedExperience => exp !== null);

    if (parsed.length === 0) {
      return {
        format: "json-multi",
        data: null,
        error: "No valid experiences found in JSON",
      };
    }

    return { format: "json-multi", data: parsed };
  }

  // Check if it's a single experience object
  const mapped = mapExperienceFields(json);
  if (mapped) {
    return { format: "json-single", data: mapped };
  }

  // JSON but not recognizable structure
  return {
    format: "text",
    data: null,
    error: "JSON format not recognized. Please use free text or a structured experience object.",
  };
}
