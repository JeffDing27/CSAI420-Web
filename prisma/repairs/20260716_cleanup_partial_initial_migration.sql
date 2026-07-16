BEGIN;

DO $$
DECLARE
  rec RECORD;
  unexpected_count INT;
BEGIN
  -- Verify no unexpected application tables exist
  SELECT COUNT(*) INTO unexpected_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name != '_prisma_migrations'
    AND table_name NOT IN (
      'User', 'AuthSession', 'CustomerReference', 'Consent', 'ConsentedClinician',
      'ClinicianAccessRequest', 'RapidStepTest', 'Escalation', 'CoachResponse',
      'ChatSession', 'ChatMessage', 'PushToken', 'VoiceSession', 'VoiceTest',
      'SmsConsentMessage', 'OutboxEvent', 'RagDocument', 'RagChunk', 'AuditEvent'
    );
    
  IF unexpected_count > 0 THEN
    RAISE EXCEPTION 'Unexpected tables found in public schema. Rolling back.';
  END IF;

  -- Drop tables if they happen to exist
  FOR rec IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
      'User', 'AuthSession', 'CustomerReference', 'Consent', 'ConsentedClinician',
      'ClinicianAccessRequest', 'RapidStepTest', 'Escalation', 'CoachResponse',
      'ChatSession', 'ChatMessage', 'PushToken', 'VoiceSession', 'VoiceTest',
      'SmsConsentMessage', 'OutboxEvent', 'RagDocument', 'RagChunk', 'AuditEvent'
    )
  LOOP
    -- Data check
    EXECUTE 'SELECT count(*) FROM public."' || rec.tablename || '"' INTO unexpected_count;
    IF unexpected_count > 0 THEN
      RAISE EXCEPTION 'Table % contains data. Rolling back.', rec.tablename;
    END IF;
    
    EXECUTE 'DROP TABLE IF EXISTS public."' || rec.tablename || '" CASCADE;';
  END LOOP;

  -- Drop Enums if they exist
  FOR rec IN
    SELECT typname FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' AND typname IN (
      'TestSource', 'ResponsePreference', 'Priority', 'Category', 
      'EscalationStatus', 'ChatRole', 'VoiceStage', 'OutboxStatus'
    )
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS public."' || rec.typname || '" CASCADE;';
  END LOOP;
END;
$$;

COMMIT;
