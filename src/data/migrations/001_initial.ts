/** M1: All tables per PRD §6. */
const migration = {
  name: "001_initial",
  statements: [
    // --- contacts ---
    `CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business_name TEXT,
      is_client INTEGER NOT NULL DEFAULT 0,
      is_supplier INTEGER NOT NULL DEFAULT 0,
      is_crew INTEGER NOT NULL DEFAULT 0,
      role TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      instagram_handle TEXT,
      website TEXT,
      crew_rate_cents INTEGER,
      crew_rate_unit TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )`,

    // --- venues ---
    `CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      instagram_handle TEXT,
      website TEXT,
      coordinator_contact_id TEXT REFERENCES contacts(id),
      loading_access TEXT,
      stairs_lift TEXT,
      power TEXT,
      rules TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )`,

    // --- events ---
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'enquiry',
      lost_reason TEXT,
      cancel_reason TEXT,
      event_type TEXT,
      theme TEXT,
      palette TEXT,
      description TEXT,
      colour TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      setup_time TEXT,
      start_time TEXT,
      end_time TEXT,
      packdown_time TEXT,
      access_from TEXT,
      access_until TEXT,
      venue_id TEXT REFERENCES venues(id),
      venue_area TEXT,
      indoor_outdoor TEXT,
      client_id TEXT REFERENCES contacts(id),
      guest_count INTEGER,
      table_count INTEGER,
      lead_source TEXT,
      referred_by TEXT,
      enquiry_date TEXT NOT NULL DEFAULT (date('now')),
      follow_up_date TEXT,
      quote_sent_date TEXT,
      quote_valid_until TEXT,
      quote_discount_cents INTEGER DEFAULT 0,
      quote_notes TEXT,
      price_override_cents INTEGER,
      deposit_cents INTEGER,
      deposit_due_date TEXT,
      balance_due_date TEXT,
      bond_cents INTEGER,
      bond_received_date TEXT,
      bond_returned_date TEXT,
      bond_notes TEXT,
      contract_signed_date TEXT,
      travel_km REAL,
      travel_notes TEXT,
      notes TEXT,
      reminders_muted INTEGER NOT NULL DEFAULT 0,
      folder_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )`,

    // --- event_contacts ---
    `CREATE TABLE IF NOT EXISTS event_contacts (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      role_on_event TEXT,
      event_notes TEXT,
      call_time TEXT,
      hours REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- catalogue_items (price list) ---
    `CREATE TABLE IF NOT EXISTS catalogue_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      unit TEXT,
      price_cents INTEGER NOT NULL DEFAULT 0,
      inventory_item_id TEXT REFERENCES inventory_items(id),
      is_package INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )`,

    // --- catalogue_package_items ---
    `CREATE TABLE IF NOT EXISTS catalogue_package_items (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL REFERENCES catalogue_items(id),
      catalogue_item_id TEXT NOT NULL REFERENCES catalogue_items(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- quote_lines ---
    `CREATE TABLE IF NOT EXISTS quote_lines (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      catalogue_item_id TEXT REFERENCES catalogue_items(id),
      description TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      line_discount_cents INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- inventory_items ---
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      quantity_owned INTEGER NOT NULL DEFAULT 0,
      hire_price_cents INTEGER NOT NULL DEFAULT 0,
      replacement_cost_cents INTEGER,
      storage_location TEXT,
      condition TEXT DEFAULT 'good',
      notes TEXT,
      photo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )`,

    // --- styling_items ---
    `CREATE TABLE IF NOT EXISTS styling_items (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'buy',
      inventory_item_id TEXT REFERENCES inventory_items(id),
      supplier_contact_id TEXT REFERENCES contacts(id),
      supplier_text TEXT,
      status TEXT NOT NULL DEFAULT 'need',
      due_back_date TEXT,
      cost_cents INTEGER,
      packed INTEGER NOT NULL DEFAULT 0,
      returned_qty INTEGER,
      damaged_qty INTEGER,
      missing_qty INTEGER,
      damage_note TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- expenses ---
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES events(id),
      date TEXT,
      description TEXT,
      category TEXT,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      supplier_contact_id TEXT REFERENCES contacts(id),
      receipt_file TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- payments ---
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      date TEXT,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      type TEXT,
      method TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- run_sheet_items ---
    `CREATE TABLE IF NOT EXISTS run_sheet_items (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      date TEXT,
      time TEXT,
      task TEXT,
      assigned_contact_id TEXT REFERENCES contacts(id),
      notes TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- checklist_items ---
    `CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      text TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      completed_at TEXT,
      section TEXT NOT NULL DEFAULT 'planning',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- checklist_templates ---
    `CREATE TABLE IF NOT EXISTS checklist_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      event_type TEXT,
      is_wrap_up INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- checklist_template_items ---
    `CREATE TABLE IF NOT EXISTS checklist_template_items (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES checklist_templates(id),
      text TEXT NOT NULL,
      days_before_event INTEGER,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- images ---
    `CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      kind TEXT NOT NULL DEFAULT 'moodboard',
      file_name TEXT NOT NULL,
      caption TEXT,
      source_url TEXT,
      is_favourite INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- vision_links ---
    `CREATE TABLE IF NOT EXISTS vision_links (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      url TEXT NOT NULL,
      title TEXT,
      note TEXT,
      kind TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- instagram_posts ---
    `CREATE TABLE IF NOT EXISTS instagram_posts (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      status TEXT NOT NULL DEFAULT 'not_started',
      caption TEXT,
      hashtags TEXT,
      image_ids TEXT,
      posted_date TEXT,
      post_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- hashtag_sets ---
    `CREATE TABLE IF NOT EXISTS hashtag_sets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- activity_log ---
    `CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES events(id),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      type TEXT,
      summary TEXT
    )`,

    // --- reminders ---
    `CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      type TEXT,
      event_id TEXT REFERENCES events(id),
      related_id TEXT,
      scheduled_for TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      fired_at TEXT,
      read_at TEXT,
      dismissed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- notification_settings ---
    `CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      follow_up_reminder INTEGER NOT NULL DEFAULT 1,
      deposit_due_reminder INTEGER NOT NULL DEFAULT 1,
      balance_due_reminder INTEGER NOT NULL DEFAULT 1,
      event_week_reminder INTEGER NOT NULL DEFAULT 1,
      items_not_packed_reminder INTEGER NOT NULL DEFAULT 1,
      wrap_up_reminder INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `INSERT OR IGNORE INTO notification_settings (id) VALUES (1)`,

    // --- settings (key/value) ---
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Indexes ---
    `CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`,
    `CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`,
    `CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)`,
    `CREATE INDEX IF NOT EXISTS idx_event_contacts_event ON event_contacts(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_event_contacts_contact ON event_contacts(contact_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quote_lines_event ON quote_lines(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_styling_items_event ON styling_items(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_checklist_items_event ON checklist_items(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_images_event ON images(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_event ON reminders(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_log_event ON activity_log(event_id)`,
  ],
};

export default migration;
