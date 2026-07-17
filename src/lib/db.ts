import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'ai-push.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS push_types (
    id TEXT PRIMARY KEY,
    label_zh TEXT NOT NULL,
    default_count INTEGER NOT NULL DEFAULT 5,
    emoji_enabled INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS audiences (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    push_id TEXT NOT NULL DEFAULT '',
    context TEXT DEFAULT '',
    description TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS capabilities (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    has_exam_params INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS operation_nodes (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_start TEXT,
    date_end TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS link_templates (
    id TEXT PRIMARY KEY,
    capability_id TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK(platform IN ('android', 'ios')),
    template_url TEXT NOT NULL,
    description TEXT DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS prompt_templates (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS push_rules (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    scope TEXT NOT NULL CHECK(scope IN ('item', 'batch')),
    rule_type TEXT NOT NULL CHECK(rule_type IN ('exclude', 'require', 'warn')),
    conditions TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'error' CHECK(severity IN ('error', 'warning', 'info')),
    is_active INTEGER NOT NULL DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS emoji_rules (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rule_config TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS ai_settings (
    id TEXT PRIMARY KEY,
    api_base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    temperature REAL NOT NULL DEFAULT 0.8,
    max_tokens INTEGER NOT NULL DEFAULT 2000
  )`,

  `CREATE TABLE IF NOT EXISTS generation_history (
    id TEXT PRIMARY KEY,
    push_type_id TEXT NOT NULL REFERENCES push_types(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    config_snapshot TEXT NOT NULL,
    items_json TEXT NOT NULL,
    exported_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS exam_param_mappings (
    id TEXT PRIMARY KEY,
    param_type TEXT NOT NULL CHECK(param_type IN ('grade', 'semester', 'subject', 'exam_type')),
    label TEXT NOT NULL,
    value INTEGER NOT NULL,
    keywords TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_audiences_push_type ON audiences(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_capabilities_push_type ON capabilities(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_operation_nodes_push_type ON operation_nodes(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_link_templates_capability ON link_templates(capability_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_link_templates_unique ON link_templates(capability_id, platform)`,
  `CREATE INDEX IF NOT EXISTS idx_prompt_templates_push_type ON prompt_templates(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_push_rules_push_type ON push_rules(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_emoji_rules_push_type ON emoji_rules(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_generation_history_push_type ON generation_history(push_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_generation_history_created ON generation_history(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_exam_params_type ON exam_param_mappings(param_type)`,
];

export function migrate(): void {
  const database = getDb();
  for (const sql of MIGRATIONS) {
    database.exec(sql);
  }
  for (const sql of INDEXES) {
    database.exec(sql);
  }
}
