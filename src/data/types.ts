/** Shared entity types matching PRD §6 schema. */

export interface Contact {
  id: string;
  name: string;
  business_name: string | null;
  is_client: number;
  is_supplier: number;
  is_crew: number;
  role: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram_handle: string | null;
  website: string | null;
  crew_rate_cents: number | null;
  crew_rate_unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  instagram_handle: string | null;
  website: string | null;
  coordinator_contact_id: string | null;
  loading_access: string | null;
  stairs_lift: string | null;
  power: string | null;
  rules: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type EventStatus =
  | "enquiry"
  | "quote_sent"
  | "follow_up"
  | "booked"
  | "planning"
  | "ready"
  | "done"
  | "wrap_up"
  | "closed"
  | "lost"
  | "cancelled";

export interface AmoraEvent {
  id: string;
  reference: string;
  name: string;
  status: EventStatus;
  lost_reason: string | null;
  cancel_reason: string | null;
  event_type: string | null;
  theme: string | null;
  palette: string | null;
  description: string | null;
  colour: string | null;
  start_date: string;
  end_date: string | null;
  setup_time: string | null;
  start_time: string | null;
  end_time: string | null;
  packdown_time: string | null;
  access_from: string | null;
  access_until: string | null;
  venue_id: string | null;
  venue_area: string | null;
  indoor_outdoor: string | null;
  client_id: string | null;
  guest_count: number | null;
  table_count: number | null;
  lead_source: string | null;
  referred_by: string | null;
  enquiry_date: string;
  follow_up_date: string | null;
  quote_sent_date: string | null;
  quote_valid_until: string | null;
  quote_discount_cents: number;
  quote_notes: string | null;
  price_override_cents: number | null;
  deposit_cents: number | null;
  deposit_due_date: string | null;
  balance_due_date: string | null;
  bond_cents: number | null;
  bond_received_date: string | null;
  bond_returned_date: string | null;
  bond_notes: string | null;
  contract_signed_date: string | null;
  travel_km: number | null;
  travel_notes: string | null;
  notes: string | null;
  reminders_muted: number;
  folder_path: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EventContact {
  id: string;
  event_id: string;
  contact_id: string;
  role_on_event: string | null;
  event_notes: string | null;
  call_time: string | null;
  hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogueItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  unit: string | null;
  price_cents: number;
  inventory_item_id: string | null;
  is_package: number;
  active: number;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QuoteLine {
  id: string;
  event_id: string;
  catalogue_item_id: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price_cents: number;
  line_discount_cents: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity_owned: number;
  hire_price_cents: number;
  replacement_cost_cents: number | null;
  storage_location: string | null;
  condition: string;
  notes: string | null;
  photo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StylingItem {
  id: string;
  event_id: string;
  name: string;
  category: string | null;
  quantity: number;
  source: string;
  inventory_item_id: string | null;
  supplier_contact_id: string | null;
  supplier_text: string | null;
  status: string;
  due_back_date: string | null;
  cost_cents: number | null;
  packed: number;
  returned_qty: number | null;
  damaged_qty: number | null;
  missing_qty: number | null;
  damage_note: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  event_id: string | null;
  date: string | null;
  description: string | null;
  category: string | null;
  amount_cents: number;
  supplier_contact_id: string | null;
  receipt_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  event_id: string;
  date: string | null;
  amount_cents: number;
  type: string | null;
  method: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  text: string;
  is_done: number;
  due_date: string | null;
  completed_at: string | null;
  section: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  event_type: string | null;
  is_wrap_up: number;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  event_id: string;
  kind: string;
  file_name: string;
  caption: string | null;
  source_url: string | null;
  is_favourite: number;
  width: number | null;
  height: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  type: string | null;
  event_id: string | null;
  related_id: string | null;
  scheduled_for: string;
  title: string;
  body: string | null;
  fired_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  event_id: string | null;
  timestamp: string;
  type: string | null;
  summary: string | null;
}

export interface Setting {
  key: string;
  value: string | null;
  updated_at: string;
}
