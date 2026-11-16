-- AI writing assist (model providers, prompts and the assistant) was removed.
-- Speech transcription keeps its ai_transcription_* tables.
-- Children are dropped before the tables they reference. Dropping a table also
-- drops its indexes and triggers, including the backup revision triggers on
-- ai_prompt_templates.

DROP TABLE IF EXISTS companion_discoveries;
DROP TABLE IF EXISTS companion_action_checks;
DROP TABLE IF EXISTS companion_actions;
DROP TABLE IF EXISTS companion_turn_attachment_parts;
DROP TABLE IF EXISTS companion_turn_attachments;
DROP TABLE IF EXISTS companion_memory_evidence;
DROP TABLE IF EXISTS companion_memory_exclusions;
DROP TABLE IF EXISTS companion_memories;
DROP TABLE IF EXISTS companion_discovery_settings;
DROP TABLE IF EXISTS companion_state;
DROP TABLE IF EXISTS companion_turns;

DROP TABLE IF EXISTS ai_workspace_settings;
DROP TABLE IF EXISTS ai_models;
DROP TABLE IF EXISTS ai_provider_configs;
DROP TABLE IF EXISTS ai_model_configs;
DROP TABLE IF EXISTS ai_prompt_templates;
