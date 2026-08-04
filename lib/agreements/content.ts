// The Care Club Membership Agreement & Consent — content and structure.
// Adapted from the Vitalis Healthcare, LLC Home Care Service Agreement /
// Consent Form (Nov 2024) for the Care Club subscription model per Okezie's
// rulings of 4 Aug 2026 (Option B pricing, no deposit, pause-after-10-days
// non-payment rule). AGREEMENT_VERSION increments whenever this text changes
// so every signed record names the exact text it was signed against.
//
// Version 2 (4 Aug 2026): membership terms pulled into a highlighted bullet
// box; new "Beginning Your Care" section; member numbers on the document.
//
// Version 3 (4 Aug 2026, Stripe epic): the Member saves a payment card as
// part of signing (SetupIntent \u2014 saved, never charged at signing); the nurse
// assessment no longer waits on a first payment; the first charge fires when
// the start of care date is confirmed; billing is monthly to the saved card
// on the anniversary of the billing start date, never prorated; accepted
// method is card only (ACH removed until the software supports it).

export const AGREEMENT_VERSION = 3

export const START_OF_CARE_MIN_DAYS = 14

export const VITALIS_LEGAL = {
  companyName: 'Vitalis Healthcare, LLC',
  programName: 'Vitalis Care Club',
  address: '8757 Georgia Avenue, Suite 440, Silver Spring, MD 20910',
  phone: '240.716.6874',
  fax: '240.266.0650',
  ohcqLicense: 'Maryland OHCQ Residential Service Agency License No. 3879R',
} as const

export const DIRECTIVE_OPTIONS = [
  { key: 'none', label: 'No Advance Directive' },
  { key: 'home_record', label: 'Copy of Advance Directive in Client Home Record' },
  { key: 'medical_record', label: 'Copy of Advance Directive in Medical Record' },
  { key: 'living_will', label: 'Living Will' },
  { key: 'poa', label: 'Durable Power of Attorney' },
  { key: 'dnr', label: 'DNR ordered' },
] as const

export interface TermsSnapshot {
  tier_name: string
  monthly_price_cents: number
  shifts_per_month: number
  hours_per_month: number
  overage_rate_cents: number
  weekend_rate_cents: number
}

export function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function perVisitCents(snapshot: TermsSnapshot): number {
  if (snapshot.shifts_per_month <= 0) return 0
  return Math.round(snapshot.monthly_price_cents / snapshot.shifts_per_month)
}

export type AgreementBlock =
  | { type: 'p'; text: string }
  | { type: 'bullets'; items: string[] }

export interface AgreementSection {
  heading: string
  blocks: AgreementBlock[]
}

// The full agreement text. Membership terms interpolate the snapshot; the
// consent sections carry over from the existing Vitalis form, reworded for
// the Club. Reviewed on screen by Okezie before member use; a Maryland
// attorney should review before launch (noted in chat 4 Aug 2026).
export function agreementSections(snapshot: TermsSnapshot, memberName: string): AgreementSection[] {
  const price = formatMoney(snapshot.monthly_price_cents)
  const perVisit = formatMoney(perVisitCents(snapshot))
  const overage = formatMoney(snapshot.overage_rate_cents)
  const weekend = formatMoney(snapshot.weekend_rate_cents)

  return [
    {
      heading: 'The Membership',
      blocks: [
        {
          type: 'p',
          text: `${VITALIS_LEGAL.companyName}, operating the ${VITALIS_LEGAL.programName} (\u201cthe Club\u201d), agrees to provide ${memberName} (\u201cthe Member\u201d) with home care services on the following membership terms:`,
        },
        {
          type: 'bullets',
          items: [
            `${snapshot.tier_name} membership`,
            `${snapshot.shifts_per_month} visits each month`,
            `${snapshot.hours_per_month} hours of care each month`,
            `${price} per month \u2014 ${perVisit} per visit`,
            'Every visit is two hours of dedicated care in the Member\u2019s home',
          ],
        },
        {
          type: 'p',
          text: `Visits are delivered by the Member\u2019s assigned Club caregiver on a standing weekly schedule agreed with the Member, in the Club\u2019s standard morning and afternoon blocks.`,
        },
      ],
    },
    {
      heading: 'Beginning Your Care',
      blocks: [
        {
          type: 'p',
          text: 'After this agreement is signed, membership begins in three steps:',
        },
        {
          type: 'bullets',
          items: [
            'The Member saves their payment card as part of signing this agreement. The card is held securely and is not charged at signing.',
            'A Vitalis nurse calls the Member to schedule the initial in-home assessment.',
            `Start of care is confirmed after the assessment and will be no earlier than ${START_OF_CARE_MIN_DAYS} days from the date of signing. When the start of care date is confirmed, the first month of membership is charged to the saved card.`,
          ],
        },
        {
          type: 'p',
          text: 'The confirmed start of care date is also the Member\u2019s billing start date.',
        },
      ],
    },
    {
      heading: 'Scheduling, Changes, and Cancellations',
      blocks: [
        {
          type: 'p',
          text: `The Member may cancel up to two visits per month at no charge with at least 48 hours\u2019 notice. Cancellations beyond two per month, or with less than 48 hours\u2019 notice, are forfeited and counted as delivered.`,
        },
        {
          type: 'p',
          text: `Additional time beyond a scheduled visit, when the caregiver\u2019s schedule allows, is billed as overage at ${overage} per hour in whole-hour increments. Weekend visits, where offered, are billed at ${weekend} per hour. Brief run-overs of a few minutes to finish a task in progress are part of the service and are never billed.`,
        },
      ],
    },
    {
      heading: 'Billing and Payment',
      blocks: [
        {
          type: 'p',
          text: `Membership is billed monthly in advance to the Member\u2019s saved payment card, beginning on the confirmed start of care date and on the same day of each month thereafter. No deposit is required, and partial months are never billed or prorated. Common debit and credit cards are accepted.`,
        },
        {
          type: 'p',
          text: `If payment is not received within 10 days of the billing date, the membership pauses and visits stop. The Member\u2019s place in their care cluster is held for 30 days from the pause; if payment has not been made by then, the place is released. Any modification to billing will be communicated in writing by the Agency Administrator.`,
        },
      ],
    },
    {
      heading: 'Authorization for Treatment and Release of Information',
      blocks: [
        {
          type: 'p',
          text: `The Member gives permission for authorized personnel of ${VITALIS_LEGAL.companyName} to perform the personal care and support services provided under this membership. The care team responsible for the Member\u2019s care may receive information regarding the Member\u2019s condition. All information is confidential; the Member consents to record reviews by authorized representatives, including local and state agencies and licensing or accrediting bodies, and permits ${VITALIS_LEGAL.companyName} to make copies of the Member\u2019s record when necessary. The Member understands they have the legal right to refuse this release of information and waives that right by signing this agreement.`,
        },
      ],
    },
    {
      heading: 'Rights and Responsibilities',
      blocks: [
        {
          type: 'p',
          text: `The Member will be provided a copy of their rights and responsibilities as a home care client, and it is the Member\u2019s responsibility to review and understand them.`,
        },
      ],
    },
    {
      heading: 'Advance Directives',
      blocks: [
        {
          type: 'p',
          text: `The Member will receive written information about their rights under Maryland law to make decisions regarding medical care, including the right to accept or refuse life-sustaining treatment and the right to formulate Advance Directives. If ${VITALIS_LEGAL.companyName} can no longer meet the Member\u2019s care needs because of its mission, philosophy, or scope of services, the Member may participate in the transfer process to another organization or level of care.`,
        },
        {
          type: 'p',
          text: 'The Member indicates below which documents, if any, they will provide to Vitalis.',
        },
      ],
    },
    {
      heading: 'Emergency Preparedness, Infection Control, and Safety',
      blocks: [
        {
          type: 'p',
          text: `The Member will receive the Agency\u2019s emergency preparedness plan and its infection control and safety information, and it is the Member\u2019s responsibility to review and understand them.`,
        },
      ],
    },
    {
      heading: 'Services',
      blocks: [
        {
          type: 'p',
          text: `Services are provided in accordance with all applicable state and federal regulations. Services and visit patterns may change over the course of the membership by agreement with the Member, and the Member will be informed of any changes.`,
        },
      ],
    },
    {
      heading: 'Voluntary Agreement',
      blocks: [
        {
          type: 'p',
          text: `The Member has voluntarily chosen ${VITALIS_LEGAL.companyName} as their home care provider, aware that they have a choice of agencies. The services to be provided are determined together by the Member and the care team, according to the Club\u2019s policies and procedures.`,
        },
      ],
    },
    {
      heading: 'Complaints and Ending the Membership',
      blocks: [
        {
          type: 'p',
          text: `The Member will receive information about the Agency\u2019s complaint resolution procedure and the State Hotline number. Either party may end this membership with 14 days\u2019 written notice. Amounts already paid for the current month are not refunded, and visits remaining in the paid month stay available to the Member through the notice period.`,
        },
      ],
    },
  ]
}
