/**
 * Profile extracted from a LinkedIn screenshot
 */
export interface Profile {
  name: string;
  company: string;
  role: string;
  headline?: string;
  location?: string;
  about?: string;
}

/**
 * Result of processing a single profile
 */
export interface ProfileResult {
  profile: Profile;
  email: string;
  transactions: {
    parse: { hash: string; memo: string };
    draft: { hash: string; memo: string };
  };
  totalCost: number;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Max spend per profile in USD */
  maxPerProfile: number;
  /** Max total spend in USD */
  maxTotal: number;
  /** Your name (for email signature) */
  senderName: string;
  /** Your company/role (for email context) */
  senderContext: string;
  /** What you're reaching out about */
  outreachPurpose: string;
}
