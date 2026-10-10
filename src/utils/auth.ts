/**
 * CampusShare Authentication Utilities & Email Validation
 * 
 * Rules:
 * - Only institutional email addresses from NIT Kurukshetra ending in '@nitkkr.ac.in'
 *   are permitted.
 * - Rejects any personal or external domains (gmail.com, yahoo.com, outlook.com, etc.).
 */

export function isValidNitkkrEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  
  // Standard email format verification with strict @nitkkr.ac.in domain requirement
  const nitkkrRegex = /^[a-zA-Z0-9._%+-]+@nitkkr\.ac\.in$/;
  return nitkkrRegex.test(trimmed);
}

export const EMAIL_DOMAIN_ERROR =
  'Only official NIT Kurukshetra email addresses (@nitkkr.ac.in) are permitted.';
