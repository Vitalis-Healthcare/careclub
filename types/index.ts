export type UserRole = 'admin' | 'scheduler'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Tier {
  id: string
  name: string
  shifts_per_month: number
  hours_per_shift: number
  hours_per_month: number
  monthly_price_cents: number
  overage_rate_cents: number
  weekend_rate_cents: number
  free_cancels_per_period: number
  display_order: number
  created_at: string
}

export interface Zone {
  id: string
  name: string
  abbreviation: string | null
  center_address: string | null
  center_lat: number
  center_lng: number
  radius_miles: number
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface Caregiver {
  id: string
  name: string
  phone: string | null
  email: string | null
  monthly_salary_cents: number
  payroll_burden_pct: number
  work_days: string[]
  shift_start: string
  shift_end: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface Cluster {
  id: string
  zone_id: string
  name: string
  caregiver_id: string | null
  monthly_salary_cents: number
  payroll_burden_pct: number
  status: 'active' | 'forming' | 'inactive'
  created_at: string
}

export interface Client {
  id: string
  member_number: number | null
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  cluster_id: string | null
  tier_id: string
  billing_start_date: string | null
  status: 'waitlist' | 'active' | 'paused' | 'canceled'
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  card_brand: string | null
  card_last4: string | null
  card_exp_month: number | null
  card_exp_year: number | null
  created_at: string
}

export interface StandingPattern {
  id: string
  client_id: string
  day_of_week: number
  start_time: string
  created_at: string
}

export interface Shift {
  id: string
  client_id: string
  cluster_id: string
  caregiver_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  duration_hours: number
  status: 'scheduled' | 'completed' | 'canceled' | 'no_show'
  is_overage: boolean
  is_weekend: boolean
  cancel_type: 'free' | 'forfeit' | null
  created_at: string
}

export interface BillingPeriod {
  id: string
  client_id: string
  period_start: string
  period_end: string
  hours_included: number
  hours_used: number
  hours_remaining: number
  free_cancels_remaining: number
  created_at: string
}

export interface Payment {
  id: string
  client_id: string
  stripe_payment_intent_id: string | null
  amount_cents: number
  status: 'succeeded' | 'failed'
  kind: 'first_month' | 'renewal'
  label: string
  failure_message: string | null
  created_at: string
}

export interface RenewalReminder {
  id: string
  client_id: string
  anniversary_date: string
  reminder_kind: 'week_before' | 'day_before'
  sent_at: string
}

export interface StripeEvent {
  id: string
  type: string
  received_at: string
}
