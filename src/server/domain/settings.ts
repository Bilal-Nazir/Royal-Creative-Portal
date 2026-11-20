export interface AgencyNotificationToggles {
  emailAlerts: boolean;
  inAppAlerts: boolean;
  paymentDateReminders: boolean;
}

/**
 * A20 — one singleton record per agency. "Client contact options" drives the
 * client sidebar's "Contact owner" tel:/wa.me: icons (components/ui/ContactOwner.tsx).
 */
export interface AgencySettings {
  agencyName: string;
  defaultCurrency: string;
  paymentInstructions: string;
  ownerName: string;
  ownerPhone?: string;
  ownerWhatsapp?: string;
  notifications: AgencyNotificationToggles;
}
