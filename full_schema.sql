--
-- PostgreSQL database dump
--

\restrict IpVuyKCBNEkR3VK3ateefP9EwdQOfNsusbUlUusHbsMhkigFjpVX8kteUr3DyXz

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < NOW();
END;
$$;


--
-- Name: FUNCTION cleanup_expired_sessions(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Removes expired sessions from the sessions table';


--
-- Name: log_report_execution(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_report_execution() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update execution count and last_run
    UPDATE reports 
    SET last_run_at = NEW.executed_at,
        execution_count = COALESCE(execution_count, 0) + 1
    WHERE report_id = NEW.report_id;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION log_report_execution(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_report_execution() IS 'Updates report statistics when a report execution is logged';


--
-- Name: log_report_run(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_report_run() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update execution count and last_run
    UPDATE reports_master 
    SET updated_at = NOW()
    WHERE report_id = NEW.report_id;
    RETURN NEW;
END;
$$;


--
-- Name: prevent_system_role_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_system_role_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.is_system = TRUE THEN
        RAISE EXCEPTION 'Cannot delete system role: %', OLD.role_name;
    END IF;
    RETURN OLD;
END;
$$;


--
-- Name: FUNCTION prevent_system_role_deletion(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.prevent_system_role_deletion() IS 'Prevents deletion of system-defined roles';


--
-- Name: refresh_all_materialized_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_all_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_usage_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_report_performance_metrics;
    RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$;


--
-- Name: FUNCTION refresh_all_materialized_views(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_all_materialized_views() IS 'Refresh all materialized views concurrently';


--
-- Name: update_api_key_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_api_key_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE api_keys 
    SET last_used = NOW() 
    WHERE api_key_id = NEW.api_key_id;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_api_key_usage(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_api_key_usage() IS 'Updates api_keys.last_used when API usage is logged';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_updated_at_column(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates the updated_at column to current timestamp on row modification';


--
-- Name: update_user_last_login(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_last_login() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE users 
    SET last_login = NOW() 
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_user_last_login(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_user_last_login() IS 'Updates users.last_login when a new session is created';


--
-- Name: validate_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
BEGIN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$_$;


--
-- Name: FUNCTION validate_email(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_email() IS 'Validates email format before INSERT/UPDATE';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    activity_id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer,
    action character varying(200) NOT NULL,
    resource character varying(100),
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE activity_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activity_logs IS 'User activity feed (page views, searches, exports)';


--
-- Name: activity_logs_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_activity_id_seq OWNED BY public.activity_logs.activity_id;


--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    insight_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    model_id integer,
    insight_text text NOT NULL,
    insight_type character varying(50) DEFAULT 'summary'::character varying NOT NULL,
    confidence_score numeric(5,4),
    category character varying(100),
    generated_by character varying(50) DEFAULT 'system'::character varying NOT NULL,
    data_period character varying(50),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_insights; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_insights IS 'AI-generated summaries, anomaly flags, and trend callouts';


--
-- Name: ai_insights_insight_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_insights_insight_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_insights_insight_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_insights_insight_id_seq OWNED BY public.ai_insights.insight_id;


--
-- Name: alert_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_logs (
    log_id integer NOT NULL,
    rule_id integer NOT NULL,
    tenant_id integer,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    message text,
    context_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by integer
);


--
-- Name: TABLE alert_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alert_logs IS 'History of triggered alerts with resolution tracking';


--
-- Name: alert_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_logs_log_id_seq OWNED BY public.alert_logs.log_id;


--
-- Name: alert_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_rules (
    rule_id integer NOT NULL,
    tenant_id integer NOT NULL,
    report_id integer,
    kpi_id integer,
    rule_name character varying(200) NOT NULL,
    condition character varying(200) NOT NULL,
    threshold numeric,
    severity character varying(30) DEFAULT 'warning'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE alert_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alert_rules IS 'Threshold-based alert rules per report/KPI';


--
-- Name: alert_rules_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_rules_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_rules_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_rules_rule_id_seq OWNED BY public.alert_rules.rule_id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    announcement_id integer NOT NULL,
    tenant_id integer,
    title character varying(300) NOT NULL,
    body text NOT NULL,
    type character varying(30) DEFAULT 'info'::character varying NOT NULL,
    visible_from timestamp with time zone DEFAULT now() NOT NULL,
    visible_to timestamp with time zone,
    created_by integer,
    dismissed_by jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.announcements IS 'System or tenant-level banner messages with visibility window and per-user dismissal';


--
-- Name: announcements_announcement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_announcement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_announcement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_announcement_id_seq OWNED BY public.announcements.announcement_id;


--
-- Name: anomaly_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anomaly_logs (
    anomaly_id integer NOT NULL,
    insight_id integer,
    report_id integer NOT NULL,
    tenant_id integer,
    details text,
    severity character varying(30) DEFAULT 'medium'::character varying NOT NULL,
    field_name character varying(200),
    expected_value text,
    actual_value text,
    is_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE anomaly_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.anomaly_logs IS 'Detected data anomalies with expected vs actual values';


--
-- Name: anomaly_logs_anomaly_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.anomaly_logs_anomaly_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: anomaly_logs_anomaly_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.anomaly_logs_anomaly_id_seq OWNED BY public.anomaly_logs.anomaly_id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    api_key_id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer,
    key_hash character varying(512) NOT NULL,
    key_prefix character varying(20),
    name character varying(100),
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    last_used timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE api_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.api_keys IS 'Hashed API tokens for programmatic access';


--
-- Name: api_keys_api_key_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_api_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_api_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_api_key_id_seq OWNED BY public.api_keys.api_key_id;


--
-- Name: api_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_usage_logs (
    log_id integer NOT NULL,
    tenant_id integer,
    api_key_id integer,
    user_id integer,
    endpoint character varying(500) NOT NULL,
    method character varying(10) NOT NULL,
    status_code integer NOT NULL,
    response_time_ms integer,
    request_size_bytes integer,
    response_size_bytes integer,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE api_usage_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.api_usage_logs IS 'Inbound API call log per key/tenant; used for rate limiting enforcement and usage-based billing';


--
-- Name: api_usage_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_usage_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_usage_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_usage_logs_log_id_seq OWNED BY public.api_usage_logs.log_id;


--
-- Name: approval_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_steps (
    step_id integer NOT NULL,
    workflow_id integer NOT NULL,
    step_order integer NOT NULL,
    step_name character varying(200) NOT NULL,
    approver_role_id integer,
    approver_user_id integer,
    deadline_hours integer DEFAULT 48 NOT NULL,
    is_mandatory boolean DEFAULT true NOT NULL,
    on_reject character varying(30) DEFAULT 'stop'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_step_approver CHECK (((approver_role_id IS NOT NULL) OR (approver_user_id IS NOT NULL)))
);


--
-- Name: TABLE approval_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.approval_steps IS 'Ordered steps within an approval workflow; on_reject controls what happens when a step is rejected';


--
-- Name: approval_steps_step_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_steps_step_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_steps_step_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_steps_step_id_seq OWNED BY public.approval_steps.step_id;


--
-- Name: approval_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_workflows (
    workflow_id integer NOT NULL,
    tenant_id integer NOT NULL,
    report_id integer,
    domain_id integer,
    name character varying(200) NOT NULL,
    description text,
    steps_count integer DEFAULT 1 NOT NULL,
    is_sequential boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE approval_workflows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.approval_workflows IS 'Multi-step approval chain definitions; is_sequential=FALSE runs all steps in parallel';


--
-- Name: approval_workflows_workflow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_workflows_workflow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_workflows_workflow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_workflows_workflow_id_seq OWNED BY public.approval_workflows.workflow_id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    attachment_id integer NOT NULL,
    report_id integer,
    upload_id integer,
    file_name character varying(500) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_type character varying(50),
    file_size bigint,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.attachments IS 'File attachments linked to reports or uploads';


--
-- Name: attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachments_attachment_id_seq OWNED BY public.attachments.attachment_id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    tenant_id integer,
    user_id integer,
    action character varying(100) CONSTRAINT audit_logs_event_type_not_null NOT NULL,
    table_name character varying(100),
    resource_id character varying(100),
    event_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_logs IS 'Immutable security audit trail for all CRUD and auth events';


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: benchmarking_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benchmarking_data (
    benchmark_id integer NOT NULL,
    tenant_id integer NOT NULL,
    domain_id integer,
    report_id integer,
    data_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    period character varying(50),
    source character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE benchmarking_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.benchmarking_data IS 'Industry benchmark data (moved from Billing to AI module)';


--
-- Name: benchmarking_data_benchmark_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.benchmarking_data_benchmark_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: benchmarking_data_benchmark_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.benchmarking_data_benchmark_id_seq OWNED BY public.benchmarking_data.benchmark_id;


--
-- Name: billing_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_accounts (
    account_id integer NOT NULL,
    tenant_id integer NOT NULL,
    plan character varying(50) DEFAULT 'free'::character varying NOT NULL,
    billing_email character varying(200),
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    trial_ends timestamp with time zone,
    start_date date,
    end_date date,
    payment_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE billing_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.billing_accounts IS '1:1 with tenants; tracks plan, status, and payment token';


--
-- Name: billing_accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_accounts_account_id_seq OWNED BY public.billing_accounts.account_id;


--
-- Name: blockchain_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blockchain_audit (
    audit_id integer NOT NULL,
    compliance_id integer NOT NULL,
    txn_hash character varying(128) NOT NULL,
    block_number bigint,
    network character varying(50) DEFAULT 'ethereum'::character varying NOT NULL,
    event_type character varying(100),
    payload_hash character varying(128),
    "timestamp" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE blockchain_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blockchain_audit IS 'Immutable on-chain audit records for compliance events';


--
-- Name: blockchain_audit_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blockchain_audit_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blockchain_audit_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blockchain_audit_audit_id_seq OWNED BY public.blockchain_audit.audit_id;


--
-- Name: chat_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_feedback (
    feedback_id integer NOT NULL,
    session_id integer NOT NULL,
    response_id integer,
    rating smallint,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE chat_feedback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_feedback IS 'User ratings and comments on bot responses';


--
-- Name: chat_feedback_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_feedback_feedback_id_seq OWNED BY public.chat_feedback.feedback_id;


--
-- Name: chat_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_intents (
    intent_id integer NOT NULL,
    intent_name character varying(200) NOT NULL,
    description text,
    examples jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE chat_intents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_intents IS 'NLP intent definitions for chatbot classification';


--
-- Name: chat_intents_intent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_intents_intent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_intents_intent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_intents_intent_id_seq OWNED BY public.chat_intents.intent_id;


--
-- Name: chat_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_queries (
    query_id integer NOT NULL,
    session_id integer NOT NULL,
    intent_id integer,
    query_text text NOT NULL,
    confidence numeric(5,4),
    entities jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE chat_queries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_queries IS 'Individual user messages within a session';


--
-- Name: chat_queries_query_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_queries_query_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_queries_query_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_queries_query_id_seq OWNED BY public.chat_queries.query_id;


--
-- Name: chat_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_responses (
    response_id integer NOT NULL,
    query_id integer NOT NULL,
    response_text text NOT NULL,
    response_type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    data_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_by character varying(50) DEFAULT 'system'::character varying NOT NULL,
    latency_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE chat_responses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_responses IS 'Bot responses with type (text, chart, table, etc.)';


--
-- Name: chat_responses_response_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_responses_response_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_responses_response_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_responses_response_id_seq OWNED BY public.chat_responses.response_id;


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    session_id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    context_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE chat_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_sessions IS 'Chatbot conversation sessions per user';


--
-- Name: chat_sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_sessions_session_id_seq OWNED BY public.chat_sessions.session_id;


--
-- Name: compliance_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_audit (
    audit_id integer NOT NULL,
    submission_id integer NOT NULL,
    action character varying(100) NOT NULL,
    performed_by integer,
    details text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE compliance_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compliance_audit IS 'Audit trail of actions on submissions';


--
-- Name: compliance_audit_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_audit_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_audit_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_audit_audit_id_seq OWNED BY public.compliance_audit.audit_id;


--
-- Name: compliance_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_calendar (
    compliance_id integer NOT NULL,
    tenant_id integer NOT NULL,
    report_id integer,
    rule_id integer,
    title character varying(300) NOT NULL,
    description text,
    due_date date NOT NULL,
    frequency character varying(30),
    regulator character varying(200),
    priority character varying(30) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE compliance_calendar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compliance_calendar IS 'Filing deadlines; report_id links deadline to its governing report';


--
-- Name: compliance_calendar_compliance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_calendar_compliance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_calendar_compliance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_calendar_compliance_id_seq OWNED BY public.compliance_calendar.compliance_id;


--
-- Name: compliance_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_documents (
    doc_id integer NOT NULL,
    compliance_id integer NOT NULL,
    file_name character varying(500) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_type character varying(50),
    file_size bigint,
    version integer DEFAULT 1 NOT NULL,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE compliance_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compliance_documents IS 'Files attached to compliance calendar entries';


--
-- Name: compliance_documents_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_documents_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_documents_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_documents_doc_id_seq OWNED BY public.compliance_documents.doc_id;


--
-- Name: compliance_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_rules (
    rule_id integer NOT NULL,
    tenant_id integer,
    rule_description text NOT NULL,
    jurisdiction character varying(100),
    framework character varying(100),
    severity character varying(30) DEFAULT 'mandatory'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE compliance_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compliance_rules IS 'Regulatory rule library (HIPAA, SOX, GDPR, etc.)';


--
-- Name: compliance_rules_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_rules_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_rules_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_rules_rule_id_seq OWNED BY public.compliance_rules.rule_id;


--
-- Name: compliance_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_submissions (
    submission_id integer NOT NULL,
    compliance_id integer NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    submitted_at timestamp with time zone,
    submitted_by integer,
    file_url character varying(500),
    remarks text,
    reference_no character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE compliance_submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compliance_submissions IS 'Submission records per compliance deadline';


--
-- Name: compliance_submissions_submission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_submissions_submission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_submissions_submission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_submissions_submission_id_seq OWNED BY public.compliance_submissions.submission_id;


--
-- Name: connector_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_sync_logs (
    sync_id integer NOT NULL,
    source_id integer NOT NULL,
    tenant_id integer NOT NULL,
    sync_type character varying(30) DEFAULT 'incremental'::character varying NOT NULL,
    status character varying(30) DEFAULT 'running'::character varying NOT NULL,
    rows_synced integer DEFAULT 0 NOT NULL,
    rows_failed integer DEFAULT 0 NOT NULL,
    bytes_transferred bigint,
    duration_ms integer,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: TABLE connector_sync_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.connector_sync_logs IS 'Sync execution log per data_source; more granular than etl_jobs, specific to connector syncs';


--
-- Name: connector_sync_logs_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.connector_sync_logs_sync_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: connector_sync_logs_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.connector_sync_logs_sync_id_seq OWNED BY public.connector_sync_logs.sync_id;


--
-- Name: connector_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_types (
    connector_type_id integer NOT NULL,
    connector_name character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    category character varying(50) NOT NULL,
    config_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    logo_url character varying(500),
    docs_url character varying(500),
    version character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE connector_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.connector_types IS 'Master catalog of available data connector types; config_schema is a JSON Schema for validation';


--
-- Name: connector_types_connector_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.connector_types_connector_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: connector_types_connector_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.connector_types_connector_type_id_seq OWNED BY public.connector_types.connector_type_id;


--
-- Name: correlation_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correlation_matrix (
    corr_id integer NOT NULL,
    insight_id integer,
    report_id integer NOT NULL,
    correlation_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    method character varying(50) DEFAULT 'pearson'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE correlation_matrix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.correlation_matrix IS 'Cross-metric correlation results';


--
-- Name: correlation_matrix_corr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correlation_matrix_corr_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correlation_matrix_corr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correlation_matrix_corr_id_seq OWNED BY public.correlation_matrix.corr_id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    country_code character varying(10) NOT NULL,
    country_name character varying(200) NOT NULL,
    currency_code character varying(10),
    phone_prefix character varying(20),
    region_id integer,
    flag_emoji character varying(10),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE countries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.countries IS 'ISO 3166-1 country reference; links to currencies and regions for multi-national filtering';


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currencies (
    currency_code character varying(10) NOT NULL,
    currency_name character varying(100) NOT NULL,
    symbol character varying(10) NOT NULL,
    decimal_places integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE currencies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.currencies IS 'ISO 4217 currency reference table; seeded with 10 major currencies';


--
-- Name: custom_report_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_report_definitions (
    custom_report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    domain_id integer,
    name character varying(200) NOT NULL,
    description text,
    query_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
    visualization_type character varying(50) DEFAULT 'table'::character varying NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE custom_report_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.custom_report_definitions IS 'User-built reports beyond the 92 pre-defined ones; query_definition stores fields/filters/groupings as JSONB';


--
-- Name: custom_report_definitions_custom_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_report_definitions_custom_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_report_definitions_custom_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_report_definitions_custom_report_id_seq OWNED BY public.custom_report_definitions.custom_report_id;


--
-- Name: dashboard_widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_widgets (
    widget_id integer NOT NULL,
    dashboard_id integer NOT NULL,
    report_id integer NOT NULL,
    widget_type character varying(50) NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    title character varying(200),
    position_x integer DEFAULT 0 NOT NULL,
    position_y integer DEFAULT 0 NOT NULL,
    width integer DEFAULT 4 NOT NULL,
    height integer DEFAULT 3 NOT NULL,
    refresh_seconds integer DEFAULT 300 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dashboard_widgets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dashboard_widgets IS '[NEW] Individual chart/table/KPI widgets on a dashboard';


--
-- Name: dashboard_widgets_widget_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dashboard_widgets_widget_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dashboard_widgets_widget_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dashboard_widgets_widget_id_seq OWNED BY public.dashboard_widgets.widget_id;


--
-- Name: dashboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboards (
    dashboard_id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    domain_id integer,
    layout_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dashboards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dashboards IS '[NEW] User-configured dashboard layouts (supports shared dashboards)';


--
-- Name: dashboards_dashboard_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dashboards_dashboard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dashboards_dashboard_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dashboards_dashboard_id_seq OWNED BY public.dashboards.dashboard_id;


--
-- Name: data_consent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_consent (
    consent_id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer NOT NULL,
    consent_type character varying(100) NOT NULL,
    is_granted boolean DEFAULT false NOT NULL,
    granted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    ip_address inet,
    user_agent text,
    version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_consent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_consent IS 'Per-user consent records per consent type and policy version; supports GDPR Art. 7 proof of consent';


--
-- Name: data_consent_consent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_consent_consent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_consent_consent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_consent_consent_id_seq OWNED BY public.data_consent.consent_id;


--
-- Name: data_ingestion_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_ingestion_logs (
    log_id integer NOT NULL,
    upload_id integer NOT NULL,
    status character varying(30) NOT NULL,
    message text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_ingestion_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_ingestion_logs IS 'Granular log lines per upload ingestion step';


--
-- Name: data_ingestion_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_ingestion_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_ingestion_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_ingestion_logs_log_id_seq OWNED BY public.data_ingestion_logs.log_id;


--
-- Name: data_lineage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_lineage (
    lineage_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    source_id integer,
    source_table character varying(200) NOT NULL,
    source_field character varying(200) NOT NULL,
    target_field character varying(200) NOT NULL,
    transformation text,
    is_pii boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_lineage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_lineage IS 'Field-level data provenance for SOX/HIPAA audits â€” maps source fields to report output fields';


--
-- Name: data_lineage_lineage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_lineage_lineage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_lineage_lineage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_lineage_lineage_id_seq OWNED BY public.data_lineage.lineage_id;


--
-- Name: data_masking_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_masking_rules (
    rule_id integer NOT NULL,
    tenant_id integer,
    rule_name character varying(200) NOT NULL,
    field_pattern character varying(200) NOT NULL,
    masking_type character varying(50) NOT NULL,
    mask_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    applies_to_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_masking_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_masking_rules IS 'PII field masking/anonymization rules applied at query time for GDPR-compliant exports';


--
-- Name: data_masking_rules_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_masking_rules_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_masking_rules_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_masking_rules_rule_id_seq OWNED BY public.data_masking_rules.rule_id;


--
-- Name: data_quality_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_quality_scores (
    quality_id integer NOT NULL,
    upload_id integer NOT NULL,
    completeness_score numeric(5,2),
    accuracy_score numeric(5,2),
    consistency_score numeric(5,2),
    timeliness_score numeric(5,2),
    overall_score numeric(5,2),
    total_records integer,
    valid_records integer,
    invalid_records integer,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    scored_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_quality_scores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_quality_scores IS '[NEW] Completeness/accuracy/consistency scores per upload';


--
-- Name: data_quality_scores_quality_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_quality_scores_quality_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_quality_scores_quality_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_quality_scores_quality_id_seq OWNED BY public.data_quality_scores.quality_id;


--
-- Name: data_retention_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_retention_policies (
    policy_id integer NOT NULL,
    tenant_id integer NOT NULL,
    domain_id integer,
    report_id integer,
    retain_days integer DEFAULT 365 NOT NULL,
    archive_after_days integer,
    delete_after_days integer,
    storage_tier character varying(50) DEFAULT 'hot'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_retention_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_retention_policies IS 'Per-tenant/domain/report rules for data retention, archival, and deletion';


--
-- Name: data_retention_policies_policy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_retention_policies_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_retention_policies_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_retention_policies_policy_id_seq OWNED BY public.data_retention_policies.policy_id;


--
-- Name: data_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_sources (
    source_id integer NOT NULL,
    tenant_id integer,
    source_name character varying(200) NOT NULL,
    source_type character varying(50) NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sync timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_sources; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_sources IS 'Registered external data sources (APIs, databases, files)';


--
-- Name: data_sources_source_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_sources_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_sources_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_sources_source_id_seq OWNED BY public.data_sources.source_id;


--
-- Name: data_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_uploads (
    upload_id integer NOT NULL,
    tenant_id integer NOT NULL,
    report_id integer,
    file_name character varying(500) NOT NULL,
    file_type character varying(50),
    file_size bigint,
    file_url character varying(500),
    checksum character varying(128),
    upload_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    error_message text,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: TABLE data_uploads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_uploads IS 'File upload tracking with processing status';


--
-- Name: data_uploads_upload_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_uploads_upload_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_uploads_upload_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_uploads_upload_id_seq OWNED BY public.data_uploads.upload_id;


--
-- Name: data_validation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_validation_rules (
    rule_id integer NOT NULL,
    tenant_id integer,
    rule_name character varying(200) NOT NULL,
    rule_expression text NOT NULL,
    rule_type character varying(50) DEFAULT 'format'::character varying NOT NULL,
    severity character varying(30) DEFAULT 'error'::character varying NOT NULL,
    error_message text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE data_validation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_validation_rules IS 'Reusable validation rule library';


--
-- Name: data_validation_rules_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_validation_rules_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_validation_rules_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_validation_rules_rule_id_seq OWNED BY public.data_validation_rules.rule_id;


--
-- Name: deployment_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment_logs (
    deploy_id integer NOT NULL,
    version character varying(50) NOT NULL,
    environment character varying(50) DEFAULT 'production'::character varying NOT NULL,
    status character varying(30) NOT NULL,
    changelog text,
    deployed_by integer,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE deployment_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deployment_logs IS 'Release deployment history';


--
-- Name: deployment_logs_deploy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deployment_logs_deploy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deployment_logs_deploy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deployment_logs_deploy_id_seq OWNED BY public.deployment_logs.deploy_id;


--
-- Name: distribution_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribution_lists (
    list_id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    domain_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE distribution_lists; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.distribution_lists IS 'Named recipient groups for bulk report delivery; supports internal users and external emails';


--
-- Name: distribution_lists_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribution_lists_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribution_lists_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribution_lists_list_id_seq OWNED BY public.distribution_lists.list_id;


--
-- Name: distribution_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribution_members (
    member_id integer NOT NULL,
    list_id integer NOT NULL,
    user_id integer,
    email character varying(200),
    name character varying(200),
    added_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_dist_target CHECK (((user_id IS NOT NULL) OR (email IS NOT NULL)))
);


--
-- Name: TABLE distribution_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.distribution_members IS 'Members of a distribution list; either a users.user_id or a freeform email for external recipients';


--
-- Name: distribution_members_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribution_members_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribution_members_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribution_members_member_id_seq OWNED BY public.distribution_members.member_id;


--
-- Name: domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domains (
    domain_id integer NOT NULL,
    domain_name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    icon character varying(50),
    color character varying(20),
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE domains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.domains IS '[NEW] Normalised domain lookup (Finance, HR, â€¦); replaces free-text string in reports_master';


--
-- Name: domains_domain_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.domains_domain_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: domains_domain_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.domains_domain_id_seq OWNED BY public.domains.domain_id;


--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_queue (
    queue_id integer NOT NULL,
    tenant_id integer,
    template_id integer,
    to_address character varying(200) NOT NULL,
    cc_addresses jsonb DEFAULT '[]'::jsonb NOT NULL,
    subject character varying(500),
    body_html text,
    body_text text,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    next_retry_at timestamp with time zone,
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE email_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_queue IS 'Outbound email queue with retry logic; decouples sending from event triggering';


--
-- Name: email_queue_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_queue_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_queue_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_queue_queue_id_seq OWNED BY public.email_queue.queue_id;


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    error_id integer NOT NULL,
    tenant_id integer,
    error_code character varying(50),
    error_message text NOT NULL,
    stack_trace text,
    context_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    severity character varying(30) DEFAULT 'error'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE error_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.error_logs IS 'Application error and exception log';


--
-- Name: error_logs_error_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_logs_error_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_logs_error_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_logs_error_id_seq OWNED BY public.error_logs.error_id;


--
-- Name: esg_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.esg_scores (
    esg_id integer NOT NULL,
    tenant_id integer NOT NULL,
    environmental numeric(5,2),
    social numeric(5,2),
    governance numeric(5,2),
    overall_score numeric(5,2),
    score_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    period character varying(50),
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE esg_scores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.esg_scores IS 'ESG pillar scores per tenant per period (moved to AI module)';


--
-- Name: esg_scores_esg_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.esg_scores_esg_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: esg_scores_esg_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.esg_scores_esg_id_seq OWNED BY public.esg_scores.esg_id;


--
-- Name: etl_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etl_jobs (
    job_id integer NOT NULL,
    source_id integer,
    upload_id integer,
    job_name character varying(200),
    job_type character varying(50) DEFAULT 'full'::character varying NOT NULL,
    status character varying(30) DEFAULT 'queued'::character varying NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    log_output text,
    records_in integer,
    records_out integer,
    errors_count integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE etl_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.etl_jobs IS 'ETL pipeline job runs; upload_id added to trace upload-triggered jobs';


--
-- Name: etl_jobs_job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.etl_jobs_job_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: etl_jobs_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.etl_jobs_job_id_seq OWNED BY public.etl_jobs.job_id;


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    rate_id integer NOT NULL,
    from_currency character varying(10) NOT NULL,
    to_currency character varying(10) NOT NULL,
    rate numeric(18,8) NOT NULL,
    effective_date date NOT NULL,
    source character varying(100) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE exchange_rates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.exchange_rates IS 'Daily FX rates per currency pair; used to convert multi-currency financial report data';


--
-- Name: exchange_rates_rate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exchange_rates_rate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exchange_rates_rate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exchange_rates_rate_id_seq OWNED BY public.exchange_rates.rate_id;


--
-- Name: executive_narratives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.executive_narratives (
    narrative_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    summary_text text NOT NULL,
    generated_by character varying(50) DEFAULT 'system'::character varying NOT NULL,
    approved_by integer,
    is_approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE executive_narratives; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.executive_narratives IS 'AI-generated executive summaries per report (moved to AI module)';


--
-- Name: executive_narratives_narrative_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.executive_narratives_narrative_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: executive_narratives_narrative_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.executive_narratives_narrative_id_seq OWNED BY public.executive_narratives.narrative_id;


--
-- Name: export_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_history (
    export_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer,
    export_format character varying(20) NOT NULL,
    file_url character varying(500),
    file_size bigint,
    status character varying(30) DEFAULT 'completed'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE export_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.export_history IS '[NEW] Audit trail of every PDF/Excel/CSV export per tenant';


--
-- Name: export_history_export_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.export_history_export_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: export_history_export_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.export_history_export_id_seq OWNED BY public.export_history.export_id;


--
-- Name: export_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_templates (
    template_id integer NOT NULL,
    tenant_id integer,
    template_name character varying(200) NOT NULL,
    format character varying(20) NOT NULL,
    header_html text,
    footer_html text,
    stylesheet text,
    logo_placement character varying(50) DEFAULT 'top-left'::character varying NOT NULL,
    page_size character varying(20) DEFAULT 'A4'::character varying NOT NULL,
    orientation character varying(20) DEFAULT 'portrait'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE export_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.export_templates IS 'Custom branded PDF/Excel export layouts with header, footer, stylesheet, and page config';


--
-- Name: export_templates_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.export_templates_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: export_templates_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.export_templates_template_id_seq OWNED BY public.export_templates.template_id;


--
-- Name: external_feeds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_feeds (
    feed_id integer NOT NULL,
    tenant_id integer,
    feed_name character varying(200) NOT NULL,
    feed_type character varying(50) NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_polled timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE external_feeds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.external_feeds IS 'Registered external data feeds (RSS, Kafka topics, S3 buckets)';


--
-- Name: external_feeds_feed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_feeds_feed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_feeds_feed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_feeds_feed_id_seq OWNED BY public.external_feeds.feed_id;


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    flag_id integer NOT NULL,
    tenant_id integer,
    flag_name character varying(200) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    rollout_pct smallint DEFAULT 100 NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_flags_rollout_pct_check CHECK (((rollout_pct >= 0) AND (rollout_pct <= 100)))
);


--
-- Name: TABLE feature_flags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feature_flags IS 'Feature toggles with rollout percentage support';


--
-- Name: feature_flags_flag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_flags_flag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_flags_flag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_flags_flag_id_seq OWNED BY public.feature_flags.flag_id;


--
-- Name: fiscal_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_calendars (
    calendar_id integer NOT NULL,
    tenant_id integer NOT NULL,
    fiscal_year_start_month integer DEFAULT 1 NOT NULL,
    fiscal_year_start_day integer DEFAULT 1 NOT NULL,
    quarter_1_label character varying(20) DEFAULT 'Q1'::character varying NOT NULL,
    quarter_2_label character varying(20) DEFAULT 'Q2'::character varying NOT NULL,
    quarter_3_label character varying(20) DEFAULT 'Q3'::character varying NOT NULL,
    quarter_4_label character varying(20) DEFAULT 'Q4'::character varying NOT NULL,
    week_start_day integer DEFAULT 1 NOT NULL,
    timezone character varying(60) DEFAULT 'UTC'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fiscal_calendars_fiscal_year_start_day_check CHECK (((fiscal_year_start_day >= 1) AND (fiscal_year_start_day <= 31))),
    CONSTRAINT fiscal_calendars_fiscal_year_start_month_check CHECK (((fiscal_year_start_month >= 1) AND (fiscal_year_start_month <= 12)))
);


--
-- Name: TABLE fiscal_calendars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fiscal_calendars IS '1:1 with tenants; defines fiscal year start, quarter labels, week start day for Finance reports';


--
-- Name: fiscal_calendars_calendar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fiscal_calendars_calendar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fiscal_calendars_calendar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fiscal_calendars_calendar_id_seq OWNED BY public.fiscal_calendars.calendar_id;


--
-- Name: forecast_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecast_models (
    model_id integer NOT NULL,
    tenant_id integer,
    report_id integer,
    model_name character varying(200) NOT NULL,
    model_type character varying(100),
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    accuracy numeric(6,4),
    trained_on date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE forecast_models; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forecast_models IS 'ML/statistical models; report_id added to link model to report domain';


--
-- Name: forecast_models_model_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_models_model_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_models_model_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_models_model_id_seq OWNED BY public.forecast_models.model_id;


--
-- Name: gdpr_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gdpr_requests (
    request_id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer,
    requester_email character varying(200) NOT NULL,
    request_type character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    due_by date NOT NULL,
    assigned_to integer,
    notes text,
    response_file_url character varying(500),
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE gdpr_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gdpr_requests IS 'GDPR/CCPA data subject requests; due_by = received_at + 30 days per GDPR Art. 12';


--
-- Name: gdpr_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gdpr_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gdpr_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gdpr_requests_request_id_seq OWNED BY public.gdpr_requests.request_id;


--
-- Name: integration_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_logs (
    log_id integer NOT NULL,
    tenant_id integer,
    api_name character varying(200),
    integration_type character varying(50),
    source_ref_id integer,
    status character varying(30) NOT NULL,
    request_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_ms integer,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE integration_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.integration_logs IS 'Request/response logs for all external integrations';


--
-- Name: integration_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_logs_log_id_seq OWNED BY public.integration_logs.log_id;


--
-- Name: ip_allowlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_allowlist (
    entry_id integer NOT NULL,
    tenant_id integer NOT NULL,
    cidr character varying(50) NOT NULL,
    label character varying(200),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ip_allowlist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ip_allowlist IS 'CIDR-based IP allowlist per tenant; app layer checks before authentication';


--
-- Name: ip_allowlist_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ip_allowlist_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_allowlist_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ip_allowlist_entry_id_seq OWNED BY public.ip_allowlist.entry_id;


--
-- Name: job_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_queue (
    job_id integer NOT NULL,
    tenant_id integer,
    job_type character varying(100) NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority smallint DEFAULT 5 NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    locked_by character varying(100),
    locked_at timestamp with time zone,
    last_error text,
    result_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT job_queue_priority_check CHECK (((priority >= 1) AND (priority <= 10)))
);


--
-- Name: TABLE job_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.job_queue IS 'General-purpose background job queue for on-demand tasks (report_generate, export, email_send, etl_run)';


--
-- Name: job_queue_job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_queue_job_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_queue_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_queue_job_id_seq OWNED BY public.job_queue.job_id;


--
-- Name: kpi_benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_benchmarks (
    benchmark_id integer NOT NULL,
    kpi_id integer NOT NULL,
    target_value numeric,
    threshold_min numeric,
    threshold_max numeric,
    period character varying(50),
    effective_from date,
    effective_to date,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE kpi_benchmarks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kpi_benchmarks IS '[NEW] Target and threshold bands for KPIs per period';


--
-- Name: kpi_benchmarks_benchmark_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kpi_benchmarks_benchmark_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kpi_benchmarks_benchmark_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kpi_benchmarks_benchmark_id_seq OWNED BY public.kpi_benchmarks.benchmark_id;


--
-- Name: kpi_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_history (
    history_id integer NOT NULL,
    kpi_id integer NOT NULL,
    tenant_id integer NOT NULL,
    run_id integer,
    value numeric NOT NULL,
    period_label character varying(50),
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE kpi_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kpi_history IS 'Time-series KPI value log per tenant/period; enables trending without re-running reports';


--
-- Name: kpi_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kpi_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kpi_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kpi_history_history_id_seq OWNED BY public.kpi_history.history_id;


--
-- Name: llm_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_usage_logs (
    usage_id integer NOT NULL,
    tenant_id integer,
    user_id integer,
    feature character varying(100) NOT NULL,
    model_name character varying(100) NOT NULL,
    tokens_in integer DEFAULT 0 NOT NULL,
    tokens_out integer DEFAULT 0 NOT NULL,
    total_tokens integer GENERATED ALWAYS AS ((tokens_in + tokens_out)) STORED,
    cost_usd numeric(10,6),
    latency_ms integer,
    status character varying(30) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    request_ref character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE llm_usage_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.llm_usage_logs IS 'Logs every LLM API call for cost tracking, quota enforcement, and billing';


--
-- Name: llm_usage_logs_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.llm_usage_logs_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: llm_usage_logs_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.llm_usage_logs_usage_id_seq OWNED BY public.llm_usage_logs.usage_id;


--
-- Name: localization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.localization (
    loc_id integer NOT NULL,
    user_id integer NOT NULL,
    language character varying(10) DEFAULT 'en'::character varying NOT NULL,
    region character varying(10) DEFAULT 'US'::character varying NOT NULL,
    timezone character varying(60) DEFAULT 'UTC'::character varying NOT NULL,
    date_format character varying(30) DEFAULT 'YYYY-MM-DD'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE localization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.localization IS 'Per-user locale: language, timezone, date format, currency';


--
-- Name: localization_loc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.localization_loc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: localization_loc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.localization_loc_id_seq OWNED BY public.localization.loc_id;


--
-- Name: message_streams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_streams (
    stream_id integer NOT NULL,
    tenant_id integer,
    stream_name character varying(200) NOT NULL,
    topic character varying(200) NOT NULL,
    broker character varying(50) DEFAULT 'kafka'::character varying NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE message_streams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_streams IS 'Message broker topic registrations';


--
-- Name: message_streams_stream_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_streams_stream_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_streams_stream_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_streams_stream_id_seq OWNED BY public.message_streams.stream_id;


--
-- Name: metric_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metric_definitions (
    metric_def_id integer NOT NULL,
    tenant_id integer,
    domain_id integer,
    metric_name character varying(200) NOT NULL,
    display_name character varying(200),
    description text,
    formula text,
    unit character varying(50),
    data_type character varying(30) DEFAULT 'numeric'::character varying NOT NULL,
    category character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE metric_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.metric_definitions IS 'Reusable metric/KPI definitions (formula, unit, type) referenced across reports';


--
-- Name: metric_definitions_metric_def_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metric_definitions_metric_def_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metric_definitions_metric_def_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metric_definitions_metric_def_id_seq OWNED BY public.metric_definitions.metric_def_id;


--
-- Name: mfa_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mfa_settings (
    mfa_id integer NOT NULL,
    user_id integer NOT NULL,
    method character varying(20) DEFAULT 'totp'::character varying NOT NULL,
    secret character varying(256),
    phone_number character varying(30),
    is_enabled boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    backup_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE mfa_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mfa_settings IS 'Per-user MFA config (TOTP/SMS/email); backup_codes stores hashed codes';


--
-- Name: mfa_settings_mfa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mfa_settings_mfa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mfa_settings_mfa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mfa_settings_mfa_id_seq OWNED BY public.mfa_settings.mfa_id;


--
-- Name: model_training_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_training_history (
    training_id integer NOT NULL,
    model_id integer NOT NULL,
    tenant_id integer,
    dataset_start date,
    dataset_end date,
    record_count integer,
    accuracy numeric(6,4),
    precision_val numeric(6,4),
    recall numeric(6,4),
    f1_score numeric(6,4),
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_ms integer,
    status character varying(30) DEFAULT 'completed'::character varying NOT NULL,
    error_message text,
    trained_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE model_training_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.model_training_history IS 'Training run log per forecast model: dataset, accuracy metrics, parameters, duration';


--
-- Name: model_training_history_training_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.model_training_history_training_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: model_training_history_training_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.model_training_history_training_id_seq OWNED BY public.model_training_history.training_id;


--
-- Name: report_run_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_run_history (
    run_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    task_id integer,
    triggered_by integer,
    trigger_type character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    status character varying(30) DEFAULT 'running'::character varying NOT NULL,
    data_range_start date,
    data_range_end date,
    row_count integer,
    duration_ms integer,
    error_message text,
    result_data_id integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: TABLE report_run_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_run_history IS 'Logs every report generation event (manual or scheduled) with status and duration';


--
-- Name: reports_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_master (
    report_id integer NOT NULL,
    domain_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    frequency character varying(30) NOT NULL,
    compliance_status character varying(30) DEFAULT 'Optional'::character varying NOT NULL,
    stakeholders jsonb DEFAULT '[]'::jsonb NOT NULL,
    visualization_type character varying(50) DEFAULT 'table'::character varying NOT NULL,
    report_category character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE reports_master; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reports_master IS 'Master catalogue of all 92 business reports; domain_id replaces domain string';


--
-- Name: mv_report_performance_metrics; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_report_performance_metrics AS
 SELECT r.report_id,
    r.name AS report_name,
    d.domain_name,
    count(rh.run_id) AS executions_7d,
    avg(rh.duration_ms) AS avg_execution_ms_7d,
    max(rh.duration_ms) AS max_execution_ms_7d,
    min(rh.duration_ms) AS min_execution_ms_7d,
    count(
        CASE
            WHEN ((rh.status)::text = 'failed'::text) THEN 1
            ELSE NULL::integer
        END) AS failed_executions_7d,
    count(
        CASE
            WHEN ((rh.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS successful_executions_7d,
    max(rh.started_at) AS last_execution,
    now() AS metrics_updated_at
   FROM ((public.reports_master r
     LEFT JOIN public.domains d ON ((r.domain_id = d.domain_id)))
     LEFT JOIN public.report_run_history rh ON (((r.report_id = rh.report_id) AND (rh.started_at > (now() - '7 days'::interval)))))
  GROUP BY r.report_id, r.name, d.domain_name
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW mv_report_performance_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.mv_report_performance_metrics IS 'Report execution performance metrics for the last 7 days (refresh hourly)';


--
-- Name: report_view_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_view_logs (
    view_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer NOT NULL,
    dashboard_id integer,
    filters_applied jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_seconds integer,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_view_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_view_logs IS 'Logs every report view event; powers Most Viewed, Last Viewed, and access audit reports';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    tenant_id integer NOT NULL,
    tenant_name character varying(150) NOT NULL,
    domain character varying(150),
    plan character varying(50) DEFAULT 'free'::character varying NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    settings_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tenants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenants IS 'Multi-tenant isolation root â€” all data scopes by tenant_id';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    phone_number character varying(30),
    password_hash character varying(255),
    role_id integer,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'User accounts; email unique per tenant';


--
-- Name: mv_tenant_usage_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_tenant_usage_stats AS
 SELECT t.tenant_id,
    t.tenant_name,
    t.plan,
    count(DISTINCT u.user_id) AS total_users,
    count(DISTINCT
        CASE
            WHEN ((u.status)::text = 'active'::text) THEN u.user_id
            ELSE NULL::integer
        END) AS active_users,
    count(DISTINCT rv.report_id) AS unique_reports_viewed,
    count(rv.view_id) AS total_report_views,
    count(DISTINCT d.dashboard_id) AS dashboards_created,
    count(DISTINCT ds.source_id) AS data_sources_connected,
    COALESCE(sum(ej.records_out), (0)::bigint) AS total_records_processed,
    count(al.log_id) AS total_api_calls,
    CURRENT_DATE AS stats_date
   FROM ((((((public.tenants t
     LEFT JOIN public.users u ON ((t.tenant_id = u.tenant_id)))
     LEFT JOIN public.report_view_logs rv ON (((u.user_id = rv.user_id) AND (rv.viewed_at > (now() - '30 days'::interval)))))
     LEFT JOIN public.dashboards d ON ((t.tenant_id = d.tenant_id)))
     LEFT JOIN public.data_sources ds ON ((t.tenant_id = ds.tenant_id)))
     LEFT JOIN public.etl_jobs ej ON (((ds.source_id = ej.source_id) AND (ej.started_at > (now() - '30 days'::interval)))))
     LEFT JOIN public.api_usage_logs al ON (((t.tenant_id = al.tenant_id) AND (al.created_at > (now() - '30 days'::interval)))))
  GROUP BY t.tenant_id, t.tenant_name, t.plan
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW mv_tenant_usage_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.mv_tenant_usage_stats IS 'Aggregated tenant usage statistics for the last 30 days (refresh daily)';


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    template_id integer NOT NULL,
    tenant_id integer,
    template_code character varying(100) NOT NULL,
    channel character varying(50) NOT NULL,
    subject_template text,
    body_template text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notification_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_templates IS 'Channel-specific message templates (email HTML, Slack blocks, SMS) with placeholders';


--
-- Name: notification_templates_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_templates_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_templates_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_templates_template_id_seq OWNED BY public.notification_templates.template_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notif_id integer NOT NULL,
    tenant_id integer,
    user_id integer NOT NULL,
    rule_id integer,
    channel character varying(50) DEFAULT 'in-app'::character varying NOT NULL,
    title character varying(300),
    message text NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    data_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    read_at timestamp with time zone
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'Outbound notifications across channels';


--
-- Name: notifications_notif_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_notif_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_notif_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_notif_id_seq OWNED BY public.notifications.notif_id;


--
-- Name: oauth_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_providers (
    provider_id integer NOT NULL,
    tenant_id integer NOT NULL,
    provider_name character varying(50) NOT NULL,
    client_id character varying(500) NOT NULL,
    client_secret character varying(500) NOT NULL,
    redirect_uri character varying(500),
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE oauth_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.oauth_providers IS 'SSO/OAuth2 provider config per tenant (Google, Microsoft, Okta, SAML)';


--
-- Name: oauth_providers_provider_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oauth_providers_provider_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oauth_providers_provider_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oauth_providers_provider_id_seq OWNED BY public.oauth_providers.provider_id;


--
-- Name: partner_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_integrations (
    partner_id integer NOT NULL,
    tenant_id integer,
    name character varying(200) NOT NULL,
    partner_type character varying(50) NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE partner_integrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partner_integrations IS 'ERP, CRM, HR system integrations per tenant';


--
-- Name: partner_integrations_partner_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_integrations_partner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_integrations_partner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_integrations_partner_id_seq OWNED BY public.partner_integrations.partner_id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    token_id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(256) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE password_reset_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.password_reset_tokens IS 'Single-use tokens for password reset flow; expires_at enforced at application layer';


--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_token_id_seq OWNED BY public.password_reset_tokens.token_id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    perm_id integer NOT NULL,
    perm_name character varying(100) NOT NULL,
    perm_code character varying(100) NOT NULL,
    module character varying(100),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permissions IS 'Granular permission codes e.g. reports:export';


--
-- Name: permissions_perm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_perm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_perm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_perm_id_seq OWNED BY public.permissions.perm_id;


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_features (
    feature_id integer NOT NULL,
    plan_id integer NOT NULL,
    max_users integer DEFAULT 1 NOT NULL,
    max_reports integer DEFAULT 10 NOT NULL,
    max_dashboards integer DEFAULT 3 NOT NULL,
    max_data_sources integer DEFAULT 1 NOT NULL,
    storage_gb numeric(8,2) DEFAULT 1 NOT NULL,
    api_calls_per_month integer DEFAULT 1000 NOT NULL,
    ai_insights_enabled boolean DEFAULT false NOT NULL,
    custom_reports_enabled boolean DEFAULT false NOT NULL,
    sso_enabled boolean DEFAULT false NOT NULL,
    audit_log_days integer DEFAULT 30 NOT NULL,
    data_retention_days integer DEFAULT 90 NOT NULL,
    support_level character varying(50) DEFAULT 'community'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE plan_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_features IS '1:1 with subscription_plans; enforces per-plan limits (users, reports, storage, API calls)';


--
-- Name: plan_features_feature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_features_feature_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_features_feature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_features_feature_id_seq OWNED BY public.plan_features.feature_id;


--
-- Name: preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preferences (
    pref_id integer NOT NULL,
    user_id integer NOT NULL,
    theme character varying(30) DEFAULT 'dark'::character varying NOT NULL,
    sidebar character varying(30) DEFAULT 'expanded'::character varying NOT NULL,
    notifications jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.preferences IS 'Per-user UI preferences (theme, sidebar, notifications)';


--
-- Name: preferences_pref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.preferences_pref_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preferences_pref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.preferences_pref_id_seq OWNED BY public.preferences.pref_id;


--
-- Name: rate_limit_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_config (
    config_id integer NOT NULL,
    plan_id integer,
    tenant_id integer,
    endpoint_pattern character varying(200),
    limit_type character varying(30) DEFAULT 'per_minute'::character varying NOT NULL,
    max_requests integer NOT NULL,
    burst_limit integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_rate_target CHECK (((plan_id IS NOT NULL) OR (tenant_id IS NOT NULL)))
);


--
-- Name: TABLE rate_limit_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rate_limit_config IS 'Configurable rate limit rules per plan or per tenant; chk_rate_target ensures plan OR tenant is set';


--
-- Name: rate_limit_config_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rate_limit_config_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limit_config_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_limit_config_config_id_seq OWNED BY public.rate_limit_config.config_id;


--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendations (
    rec_id integer NOT NULL,
    insight_id integer,
    report_id integer,
    recommendation_text text NOT NULL,
    priority character varying(30) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE recommendations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recommendations IS 'Prescriptive action items derived from insights';


--
-- Name: recommendations_rec_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recommendations_rec_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recommendations_rec_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recommendations_rec_id_seq OWNED BY public.recommendations.rec_id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    region_id integer NOT NULL,
    region_code character varying(20) NOT NULL,
    region_name character varying(200) NOT NULL,
    parent_region_id integer,
    country_code character varying(10),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE regions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.regions IS 'Hierarchical geographic region reference (self-referencing parent_region_id)';


--
-- Name: regions_region_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regions_region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regions_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regions_region_id_seq OWNED BY public.regions.region_id;


--
-- Name: regulatory_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_contacts (
    contact_id integer NOT NULL,
    tenant_id integer,
    rule_id integer,
    name character varying(200) NOT NULL,
    organization character varying(200),
    email character varying(200),
    phone character varying(50),
    role character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE regulatory_contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.regulatory_contacts IS 'Regulator contact directory';


--
-- Name: regulatory_contacts_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regulatory_contacts_contact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regulatory_contacts_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regulatory_contacts_contact_id_seq OWNED BY public.regulatory_contacts.contact_id;


--
-- Name: report_access_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_access_policies (
    policy_id integer NOT NULL,
    tenant_id integer NOT NULL,
    report_id integer NOT NULL,
    role_id integer,
    user_id integer,
    team_id integer,
    can_view boolean DEFAULT true NOT NULL,
    can_export boolean DEFAULT false NOT NULL,
    can_comment boolean DEFAULT false NOT NULL,
    can_approve boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_policy_target CHECK ((((((role_id IS NOT NULL))::integer + ((user_id IS NOT NULL))::integer) + ((team_id IS NOT NULL))::integer) = 1))
);


--
-- Name: TABLE report_access_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_access_policies IS 'Fine-grained per-report access control extending RBAC (role, user, or team target)';


--
-- Name: report_access_policies_policy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_access_policies_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_access_policies_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_access_policies_policy_id_seq OWNED BY public.report_access_policies.policy_id;


--
-- Name: report_annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_annotations (
    annotation_id integer NOT NULL,
    report_id integer NOT NULL,
    run_id integer,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    data_key character varying(500) NOT NULL,
    annotation_text text NOT NULL,
    position_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    color character varying(20) DEFAULT '#f59e0b'::character varying NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_annotations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_annotations IS 'Inline annotations pinned to specific chart data points or table cells';


--
-- Name: report_annotations_annotation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_annotations_annotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_annotations_annotation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_annotations_annotation_id_seq OWNED BY public.report_annotations.annotation_id;


--
-- Name: report_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_approvals (
    approval_id integer NOT NULL,
    report_id integer NOT NULL,
    run_id integer,
    tenant_id integer NOT NULL,
    requested_by integer,
    approver_id integer,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    comments text,
    due_by timestamp with time zone,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_approvals IS 'Approval workflow for reports before publication; critical for compliance reports';


--
-- Name: report_approvals_approval_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_approvals_approval_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_approvals_approval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_approvals_approval_id_seq OWNED BY public.report_approvals.approval_id;


--
-- Name: report_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_bookmarks (
    bookmark_id integer NOT NULL,
    user_id integer NOT NULL,
    report_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_bookmarks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_bookmarks IS 'User-saved report favorites for quick access (My Favorites view)';


--
-- Name: report_bookmarks_bookmark_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_bookmarks_bookmark_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_bookmarks_bookmark_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_bookmarks_bookmark_id_seq OWNED BY public.report_bookmarks.bookmark_id;


--
-- Name: report_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_comments (
    comment_id integer NOT NULL,
    report_id integer NOT NULL,
    user_id integer NOT NULL,
    comment_text text NOT NULL,
    parent_id integer,
    is_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_comments IS 'Threaded user comments and annotations on reports';


--
-- Name: report_comments_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_comments_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_comments_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_comments_comment_id_seq OWNED BY public.report_comments.comment_id;


--
-- Name: report_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_data (
    data_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    report_date date NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    uploaded_by integer,
    source_id integer,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_data IS 'JSONB payload for each report run, scoped by tenant and date';


--
-- Name: report_data_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_data_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_data_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_data_data_id_seq OWNED BY public.report_data.data_id;


--
-- Name: report_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_fields (
    field_id integer NOT NULL,
    domain_id integer,
    source_id integer,
    field_name character varying(200) NOT NULL,
    display_name character varying(200) NOT NULL,
    data_type character varying(50) NOT NULL,
    source_table character varying(200),
    source_column character varying(200),
    aggregation_type character varying(50) DEFAULT 'none'::character varying NOT NULL,
    is_filterable boolean DEFAULT true NOT NULL,
    is_sortable boolean DEFAULT true NOT NULL,
    is_groupable boolean DEFAULT false NOT NULL,
    is_pii boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_fields; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_fields IS 'Available field catalog for the custom report builder; is_pii flag gates masking rules';


--
-- Name: report_fields_field_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_fields_field_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_fields_field_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_fields_field_id_seq OWNED BY public.report_fields.field_id;


--
-- Name: report_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_filters (
    filter_id integer NOT NULL,
    report_id integer NOT NULL,
    filter_name character varying(100) NOT NULL,
    filter_type character varying(50),
    filter_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_filters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_filters IS 'User-configurable filter definitions per report';


--
-- Name: report_filters_filter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_filters_filter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_filters_filter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_filters_filter_id_seq OWNED BY public.report_filters.filter_id;


--
-- Name: report_join_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_join_definitions (
    join_id integer NOT NULL,
    tenant_id integer,
    left_source character varying(200) NOT NULL,
    right_source character varying(200) NOT NULL,
    join_type character varying(20) DEFAULT 'INNER'::character varying NOT NULL,
    join_condition text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_join_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_join_definitions IS 'Join rules between data sources for multi-source custom reports';


--
-- Name: report_join_definitions_join_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_join_definitions_join_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_join_definitions_join_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_join_definitions_join_id_seq OWNED BY public.report_join_definitions.join_id;


--
-- Name: report_kpis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_kpis (
    kpi_id integer NOT NULL,
    report_id integer NOT NULL,
    kpi_name character varying(200) NOT NULL,
    kpi_value numeric,
    kpi_unit character varying(50),
    kpi_type character varying(50) DEFAULT 'metric'::character varying NOT NULL,
    threshold_min numeric,
    threshold_max numeric,
    target_value numeric,
    trend character varying(20) DEFAULT 'neutral'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_kpis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_kpis IS 'KPI definitions per report with thresholds and targets';


--
-- Name: report_kpis_kpi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_kpis_kpi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_kpis_kpi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_kpis_kpi_id_seq OWNED BY public.report_kpis.kpi_id;


--
-- Name: report_run_history_run_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_run_history_run_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_run_history_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_run_history_run_id_seq OWNED BY public.report_run_history.run_id;


--
-- Name: report_sharing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_sharing (
    share_id integer NOT NULL,
    report_id integer NOT NULL,
    tenant_id integer NOT NULL,
    shared_by integer,
    recipient_user integer,
    recipient_email character varying(200),
    share_token character varying(256),
    permissions character varying(30) DEFAULT 'view'::character varying NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    accessed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_sharing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_sharing IS 'Token-based report sharing with internal users or external email recipients';


--
-- Name: report_sharing_share_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_sharing_share_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_sharing_share_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_sharing_share_id_seq OWNED BY public.report_sharing.share_id;


--
-- Name: report_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_subscriptions (
    subscription_id integer NOT NULL,
    user_id integer NOT NULL,
    report_id integer NOT NULL,
    delivery_channel character varying(50) DEFAULT 'in-app'::character varying NOT NULL,
    frequency character varying(30),
    format character varying(30) DEFAULT 'pdf'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_subscriptions IS '[NEW] Users subscribe to receive reports via email/slack/in-app';


--
-- Name: report_subscriptions_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_subscriptions_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_subscriptions_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_subscriptions_subscription_id_seq OWNED BY public.report_subscriptions.subscription_id;


--
-- Name: report_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_tags (
    tag_id integer NOT NULL,
    report_id integer NOT NULL,
    tag_name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_tags IS 'Tagging system for report discovery';


--
-- Name: report_tags_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_tags_tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_tags_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_tags_tag_id_seq OWNED BY public.report_tags.tag_id;


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    template_id integer NOT NULL,
    report_id integer NOT NULL,
    name character varying(200),
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_templates IS 'Visualisation / layout configurations per report';


--
-- Name: report_templates_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_templates_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_templates_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_templates_template_id_seq OWNED BY public.report_templates.template_id;


--
-- Name: report_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_themes (
    theme_id integer NOT NULL,
    tenant_id integer,
    theme_name character varying(200) NOT NULL,
    primary_color character varying(20) DEFAULT '#2563eb'::character varying NOT NULL,
    secondary_color character varying(20) DEFAULT '#64748b'::character varying NOT NULL,
    font_family character varying(100) DEFAULT 'Inter'::character varying NOT NULL,
    logo_url character varying(500),
    chart_palette jsonb DEFAULT '[]'::jsonb NOT NULL,
    css_overrides text,
    is_default boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_themes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_themes IS 'Visual themes per tenant for branded dashboards and reports; chart_palette is ordered JSON array of hex colors';


--
-- Name: report_themes_theme_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_themes_theme_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_themes_theme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_themes_theme_id_seq OWNED BY public.report_themes.theme_id;


--
-- Name: report_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_versions (
    version_id integer NOT NULL,
    report_id integer NOT NULL,
    version_number integer NOT NULL,
    change_summary text,
    config_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE report_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_versions IS 'Immutable version history of report metadata changes';


--
-- Name: report_versions_version_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_versions_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_versions_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_versions_version_id_seq OWNED BY public.report_versions.version_id;


--
-- Name: report_view_logs_view_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_view_logs_view_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_view_logs_view_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_view_logs_view_id_seq OWNED BY public.report_view_logs.view_id;


--
-- Name: reports_master_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_master_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_master_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_master_report_id_seq OWNED BY public.reports_master.report_id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    perm_id integer NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    granted_by integer
);


--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_permissions IS '[NEW] M:N junction â€” which permissions each role carries';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    tenant_id integer,
    role_name character varying(100) NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'RBAC roles; is_system=TRUE rows are platform-built-ins';


--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- Name: saved_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_filters (
    filter_set_id integer NOT NULL,
    user_id integer NOT NULL,
    report_id integer NOT NULL,
    name character varying(200) NOT NULL,
    filter_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE saved_filters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.saved_filters IS 'Named filter presets per user per report for repeated filtered views';


--
-- Name: saved_filters_filter_set_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_filters_filter_set_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_filters_filter_set_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_filters_filter_set_id_seq OWNED BY public.saved_filters.filter_set_id;


--
-- Name: scenario_simulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_simulations (
    scenario_id integer NOT NULL,
    insight_id integer,
    report_id integer NOT NULL,
    tenant_id integer,
    scenario_name character varying(200),
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    result_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE scenario_simulations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scenario_simulations IS 'What-if scenario results per report';


--
-- Name: scenario_simulations_scenario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scenario_simulations_scenario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scenario_simulations_scenario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scenario_simulations_scenario_id_seq OWNED BY public.scenario_simulations.scenario_id;


--
-- Name: scheduled_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_tasks (
    task_id integer NOT NULL,
    tenant_id integer,
    report_id integer,
    task_name character varying(200) NOT NULL,
    task_type character varying(50) DEFAULT 'report_generation'::character varying NOT NULL,
    cron_expression character varying(100) NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE scheduled_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_tasks IS 'Cron-based tasks; report_id links task to the report it generates';


--
-- Name: scheduled_tasks_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduled_tasks_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduled_tasks_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduled_tasks_task_id_seq OWNED BY public.scheduled_tasks.task_id;


--
-- Name: scorecard_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scorecard_definitions (
    scorecard_id integer NOT NULL,
    tenant_id integer NOT NULL,
    domain_id integer,
    name character varying(200) NOT NULL,
    description text,
    framework character varying(50) DEFAULT 'custom'::character varying NOT NULL,
    period character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE scorecard_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scorecard_definitions IS 'Balanced scorecards grouping multiple KPIs; frameworks: BSC, OKR, KPI, custom';


--
-- Name: scorecard_definitions_scorecard_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scorecard_definitions_scorecard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scorecard_definitions_scorecard_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scorecard_definitions_scorecard_id_seq OWNED BY public.scorecard_definitions.scorecard_id;


--
-- Name: scorecard_kpis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scorecard_kpis (
    sc_kpi_id integer NOT NULL,
    scorecard_id integer NOT NULL,
    kpi_id integer NOT NULL,
    weight numeric(5,2) DEFAULT 1.0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    target_value numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE scorecard_kpis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scorecard_kpis IS 'Weighted KPI assignments within a scorecard; weight enables weighted-average scoring';


--
-- Name: scorecard_kpis_sc_kpi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scorecard_kpis_sc_kpi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scorecard_kpis_sc_kpi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scorecard_kpis_sc_kpi_id_seq OWNED BY public.scorecard_kpis.sc_kpi_id;


--
-- Name: search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_history (
    search_id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    query_text character varying(500) NOT NULL,
    result_count integer,
    selected_report_id integer,
    search_scope character varying(50) DEFAULT 'all'::character varying NOT NULL,
    searched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE search_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.search_history IS 'User search query log; powers Recent Searches, auto-suggest, and search analytics';


--
-- Name: search_history_search_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.search_history_search_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: search_history_search_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.search_history_search_id_seq OWNED BY public.search_history.search_id;


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    event_id integer NOT NULL,
    tenant_id integer,
    user_id integer,
    event_type character varying(100) NOT NULL,
    severity character varying(30) DEFAULT 'medium'::character varying NOT NULL,
    ip_address inet,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_by integer,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE security_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.security_events IS 'Security-specific audit log (failed logins, brute force, MFA failures); required for SOC2 Type II';


--
-- Name: security_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_events_event_id_seq OWNED BY public.security_events.event_id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    session_id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(512) NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sessions IS 'Active user browser/app sessions';


--
-- Name: sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_session_id_seq OWNED BY public.sessions.session_id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    setting_id integer NOT NULL,
    tenant_id integer,
    setting_key character varying(200) NOT NULL,
    setting_value text,
    value_type character varying(30) DEFAULT 'string'::character varying NOT NULL,
    description text,
    is_public boolean DEFAULT false NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.settings IS 'Key-value config store scoped per tenant';


--
-- Name: settings_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_setting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_setting_id_seq OWNED BY public.settings.setting_id;


--
-- Name: source_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_mappings (
    mapping_id integer NOT NULL,
    source_id integer,
    report_id integer,
    source_field character varying(200) NOT NULL,
    target_field character varying(200) NOT NULL,
    transform character varying(100) DEFAULT 'none'::character varying NOT NULL,
    transform_expr text,
    is_required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE source_mappings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.source_mappings IS 'Field-level mapping rules from source to target schema';


--
-- Name: source_mappings_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_mappings_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_mappings_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_mappings_mapping_id_seq OWNED BY public.source_mappings.mapping_id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    plan_id integer NOT NULL,
    plan_code character varying(50) NOT NULL,
    plan_name character varying(100) NOT NULL,
    description text,
    price_monthly numeric(10,2) DEFAULT 0 NOT NULL,
    price_annually numeric(10,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE subscription_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscription_plans IS 'Plan definitions (free/starter/professional/enterprise) with pricing; backs billing_accounts.plan';


--
-- Name: subscription_plans_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_plan_id_seq OWNED BY public.subscription_plans.plan_id;


--
-- Name: system_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metrics (
    metric_id integer NOT NULL,
    tenant_id integer,
    metric_name character varying(200) NOT NULL,
    value numeric NOT NULL,
    unit character varying(50),
    tags jsonb DEFAULT '{}'::jsonb NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE system_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_metrics IS 'Platform health metrics (CPU, memory, latency, etc.)';


--
-- Name: system_metrics_metric_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_metrics_metric_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_metrics_metric_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_metrics_metric_id_seq OWNED BY public.system_metrics.metric_id;


--
-- Name: task_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_history (
    history_id integer NOT NULL,
    task_id integer NOT NULL,
    instance_id integer,
    status character varying(30) NOT NULL,
    result_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_msg text,
    duration_ms integer,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone
);


--
-- Name: TABLE task_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.task_history IS 'Execution log per task run';


--
-- Name: task_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_history_history_id_seq OWNED BY public.task_history.history_id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    team_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    added_by integer
);


--
-- Name: TABLE team_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_members IS 'M:N junction: assigns users to teams with a role (owner/admin/member)';


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    team_id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    domain_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE teams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams IS 'Named user groups per tenant; used for shared dashboards and access policies';


--
-- Name: teams_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_team_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_team_id_seq OWNED BY public.teams.team_id;


--
-- Name: tenant_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_invitations (
    invitation_id integer NOT NULL,
    tenant_id integer NOT NULL,
    email character varying(200) NOT NULL,
    role_id integer,
    token_hash character varying(256) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    invited_by integer,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tenant_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_invitations IS 'Email invitation tokens for onboarding new users into a tenant';


--
-- Name: tenant_invitations_invitation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_invitations_invitation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_invitations_invitation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_invitations_invitation_id_seq OWNED BY public.tenant_invitations.invitation_id;


--
-- Name: tenant_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_subscriptions (
    subscription_id integer NOT NULL,
    tenant_id integer NOT NULL,
    plan_id integer NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    changed_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tenant_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_subscriptions IS 'Full history of plan changes per tenant â€” current + past subscriptions';


--
-- Name: tenant_subscriptions_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_subscriptions_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_subscriptions_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_subscriptions_subscription_id_seq OWNED BY public.tenant_subscriptions.subscription_id;


--
-- Name: tenants_tenant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_tenant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_tenant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_tenant_id_seq OWNED BY public.tenants.tenant_id;


--
-- Name: translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translations (
    translation_id integer NOT NULL,
    translation_key character varying(300) NOT NULL,
    language_code character varying(10) NOT NULL,
    translated_value text NOT NULL,
    context character varying(100),
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE translations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.translations IS 'UI string translations keyed by translation_key + language_code; context narrows scope';


--
-- Name: translations_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.translations_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: translations_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.translations_translation_id_seq OWNED BY public.translations.translation_id;


--
-- Name: trend_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trend_analysis (
    trend_id integer NOT NULL,
    insight_id integer,
    report_id integer NOT NULL,
    trend_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    period character varying(50),
    direction character varying(20) DEFAULT 'neutral'::character varying NOT NULL,
    magnitude numeric(8,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE trend_analysis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trend_analysis IS 'Time-series trend data per report period';


--
-- Name: trend_analysis_trend_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trend_analysis_trend_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trend_analysis_trend_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trend_analysis_trend_id_seq OWNED BY public.trend_analysis.trend_id;


--
-- Name: upload_validation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_validation_rules (
    upload_id integer NOT NULL,
    rule_id integer NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    result character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_detail text
);


--
-- Name: TABLE upload_validation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.upload_validation_rules IS '[NEW] M:N junction â€” which rules ran on which upload, with results';


--
-- Name: usage_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_metrics (
    usage_id integer NOT NULL,
    tenant_id integer NOT NULL,
    module character varying(100) NOT NULL,
    metric character varying(200) NOT NULL,
    value numeric NOT NULL,
    unit character varying(50),
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE usage_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usage_metrics IS 'Per-tenant module usage for metered billing';


--
-- Name: usage_metrics_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usage_metrics_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usage_metrics_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_metrics_usage_id_seq OWNED BY public.usage_metrics.usage_id;


--
-- Name: user_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_devices (
    device_id integer NOT NULL,
    user_id integer NOT NULL,
    device_fingerprint character varying(256) NOT NULL,
    device_name character varying(200),
    device_type character varying(50) DEFAULT 'browser'::character varying NOT NULL,
    os character varying(100),
    browser character varying(100),
    ip_address inet,
    is_trusted boolean DEFAULT false NOT NULL,
    trusted_at timestamp with time zone,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_devices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_devices IS 'Trusted device registry for MFA remember-me; expires_at enforces re-verification after N days';


--
-- Name: user_devices_device_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_devices_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_devices_device_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_devices_device_id_seq OWNED BY public.user_devices.device_id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by integer
);


--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'Assigns one or many roles to a user';


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: vw_active_sessions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_active_sessions AS
 SELECT s.session_id,
    s.user_id,
    u.email,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS full_name,
    t.tenant_name,
    s.ip_address,
    s.user_agent,
    s.created_at AS session_started,
    s.expires_at,
    (EXTRACT(epoch FROM (s.expires_at - now())) / (60)::numeric) AS minutes_until_expiry
   FROM ((public.sessions s
     JOIN public.users u ON ((s.user_id = u.user_id)))
     JOIN public.tenants t ON ((u.tenant_id = t.tenant_id)))
  WHERE (s.expires_at > now())
  ORDER BY s.created_at DESC;


--
-- Name: VIEW vw_active_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_active_sessions IS 'Currently active user sessions with time until expiry';


--
-- Name: vw_active_subscriptions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_active_subscriptions AS
 SELECT t.tenant_id,
    t.tenant_name,
    t.plan,
    ba.account_id,
    ba.billing_email,
    ba.currency,
    ba.status AS billing_status,
    ba.trial_ends,
    ba.start_date,
    ba.end_date
   FROM (public.tenants t
     JOIN public.billing_accounts ba ON ((t.tenant_id = ba.tenant_id)))
  WHERE (((t.status)::text = 'active'::text) AND ((ba.status)::text = 'active'::text))
  ORDER BY t.tenant_name;


--
-- Name: VIEW vw_active_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_active_subscriptions IS 'Active tenant subscriptions with billing information';


--
-- Name: vw_active_users_with_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_active_users_with_permissions AS
 SELECT u.user_id,
    u.tenant_id,
    u.email,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS full_name,
    u.status,
    r.role_name,
    array_agg(DISTINCT p.perm_code ORDER BY p.perm_code) AS permissions
   FROM (((public.users u
     LEFT JOIN public.roles r ON ((u.role_id = r.role_id)))
     LEFT JOIN public.role_permissions rp ON ((r.role_id = rp.role_id)))
     LEFT JOIN public.permissions p ON ((rp.perm_id = p.perm_id)))
  WHERE ((u.status)::text = 'active'::text)
  GROUP BY u.user_id, u.tenant_id, u.email, u.first_name, u.last_name, u.status, r.role_name;


--
-- Name: VIEW vw_active_users_with_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_active_users_with_permissions IS 'Active users with their aggregated permissions';


--
-- Name: vw_api_key_usage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_api_key_usage AS
 SELECT ak.api_key_id,
    ak.name AS key_name,
    ak.key_prefix,
    t.tenant_name,
    u.email AS created_by_email,
    ak.is_active,
    ak.last_used,
    ak.expires_at,
    count(al.log_id) AS usage_count_30d
   FROM (((public.api_keys ak
     JOIN public.tenants t ON ((ak.tenant_id = t.tenant_id)))
     LEFT JOIN public.users u ON ((ak.user_id = u.user_id)))
     LEFT JOIN public.api_usage_logs al ON (((ak.api_key_id = al.api_key_id) AND (al.created_at > (now() - '30 days'::interval)))))
  GROUP BY ak.api_key_id, ak.name, ak.key_prefix, t.tenant_name, u.email, ak.is_active, ak.last_used, ak.expires_at
  ORDER BY (count(al.log_id)) DESC;


--
-- Name: VIEW vw_api_key_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_api_key_usage IS 'API key usage summary with 30-day call counts';


--
-- Name: vw_api_usage_by_tenant; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_api_usage_by_tenant AS
 SELECT t.tenant_id,
    t.tenant_name,
    t.plan,
    count(al.log_id) AS total_api_calls,
    count(DISTINCT al.endpoint) AS unique_endpoints,
    count(
        CASE
            WHEN (al.status_code >= 400) THEN 1
            ELSE NULL::integer
        END) AS error_count,
    avg(al.response_time_ms) AS avg_response_time_ms,
    max(al.created_at) AS last_api_call
   FROM (public.tenants t
     LEFT JOIN public.api_usage_logs al ON (((t.tenant_id = al.tenant_id) AND (al.created_at > (now() - '30 days'::interval)))))
  GROUP BY t.tenant_id, t.tenant_name, t.plan
  ORDER BY (count(al.log_id)) DESC;


--
-- Name: VIEW vw_api_usage_by_tenant; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_api_usage_by_tenant IS 'API usage statistics per tenant for the last 30 days';


--
-- Name: vw_audit_trail; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_audit_trail AS
 SELECT al.log_id,
    al.tenant_id,
    t.tenant_name,
    al.user_id,
    u.email AS user_email,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS user_full_name,
    al.action AS event_type,
    al.table_name AS resource_type,
    al.resource_id,
    al.created_at,
    al.ip_address
   FROM ((public.audit_logs al
     JOIN public.tenants t ON ((al.tenant_id = t.tenant_id)))
     LEFT JOIN public.users u ON ((al.user_id = u.user_id)))
  ORDER BY al.created_at DESC
 LIMIT 1000;


--
-- Name: VIEW vw_audit_trail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_audit_trail IS 'Recent 1000 audit log entries with user details';


--
-- Name: vw_data_source_health; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_data_source_health AS
 SELECT ds.source_id,
    ds.source_name,
    ds.source_type,
    ds.tenant_id,
    t.tenant_name,
    ds.is_active,
    ds.last_sync,
    (EXTRACT(epoch FROM (now() - ds.last_sync)) / (3600)::numeric) AS hours_since_last_sync,
    ej.job_id,
    ej.status AS last_job_status,
    ej.records_out AS last_job_records,
    ej.started_at AS last_job_start,
    ej.finished_at AS last_job_completion
   FROM ((public.data_sources ds
     JOIN public.tenants t ON ((ds.tenant_id = t.tenant_id)))
     LEFT JOIN LATERAL ( SELECT etl_jobs.job_id,
            etl_jobs.source_id,
            etl_jobs.upload_id,
            etl_jobs.job_name,
            etl_jobs.job_type,
            etl_jobs.status,
            etl_jobs.config_json,
            etl_jobs.log_output,
            etl_jobs.records_in,
            etl_jobs.records_out,
            etl_jobs.errors_count,
            etl_jobs.started_at,
            etl_jobs.finished_at,
            etl_jobs.created_at
           FROM public.etl_jobs
          WHERE (etl_jobs.source_id = ds.source_id)
          ORDER BY etl_jobs.started_at DESC
         LIMIT 1) ej ON (true))
  ORDER BY ds.last_sync DESC NULLS LAST;


--
-- Name: VIEW vw_data_source_health; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_data_source_health IS 'Data source connection health and last sync status';


--
-- Name: vw_etl_job_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_etl_job_statistics AS
 SELECT ds.source_name,
    ej.status,
    count(*) AS job_count,
    avg((EXTRACT(epoch FROM (ej.finished_at - ej.started_at)) / (60)::numeric)) AS avg_duration_minutes,
    sum(ej.records_out) AS total_records_processed,
    max(ej.finished_at) AS last_job_completed
   FROM (public.etl_jobs ej
     JOIN public.data_sources ds ON ((ej.source_id = ds.source_id)))
  WHERE (ej.started_at > (now() - '7 days'::interval))
  GROUP BY ds.source_name, ej.status
  ORDER BY (count(*)) DESC;


--
-- Name: VIEW vw_etl_job_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_etl_job_statistics IS 'ETL job statistics for the last 7 days by data source and status';


--
-- Name: vw_gdpr_compliance_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_gdpr_compliance_status AS
 SELECT tenant_id,
    count(*) AS total_requests,
    count(
        CASE
            WHEN ((status)::text = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_requests,
    count(
        CASE
            WHEN ((status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_requests,
    count(
        CASE
            WHEN ((status)::text = 'rejected'::text) THEN 1
            ELSE NULL::integer
        END) AS rejected_requests,
    count(
        CASE
            WHEN ((due_by < now()) AND ((status)::text <> 'completed'::text)) THEN 1
            ELSE NULL::integer
        END) AS overdue_requests
   FROM public.gdpr_requests
  GROUP BY tenant_id;


--
-- Name: VIEW vw_gdpr_compliance_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_gdpr_compliance_status IS 'GDPR request status summary by tenant';


--
-- Name: vw_popular_reports; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_popular_reports AS
 SELECT r.report_id,
    r.name AS report_name,
    d.domain_name,
    count(rv.view_id) AS view_count,
    count(DISTINCT rv.user_id) AS unique_users,
    max(rv.viewed_at) AS last_viewed
   FROM ((public.reports_master r
     LEFT JOIN public.report_view_logs rv ON (((r.report_id = rv.report_id) AND (rv.viewed_at > (now() - '30 days'::interval)))))
     LEFT JOIN public.domains d ON ((r.domain_id = d.domain_id)))
  GROUP BY r.report_id, r.name, d.domain_name
  ORDER BY (count(rv.view_id)) DESC
 LIMIT 50;


--
-- Name: VIEW vw_popular_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_popular_reports IS 'Top 50 most viewed reports in the last 30 days';


--
-- Name: vw_report_catalog; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_report_catalog AS
 SELECT r.report_id,
    r.name AS report_name,
    r.description,
    d.domain_name,
    r.frequency,
    r.compliance_status,
    r.visualization_type,
    r.report_category,
    r.is_active,
    r.created_at,
    r.updated_at
   FROM (public.reports_master r
     LEFT JOIN public.domains d ON ((r.domain_id = d.domain_id)))
  WHERE (r.is_active = true)
  ORDER BY r.name;


--
-- Name: VIEW vw_report_catalog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_report_catalog IS 'Active reports catalog with domain details';


--
-- Name: vw_report_execution_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_report_execution_performance AS
 SELECT r.report_id,
    r.name AS report_name,
    count(rh.run_id) AS total_runs,
    count(
        CASE
            WHEN ((rh.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS successful_runs,
    count(
        CASE
            WHEN ((rh.status)::text = 'failed'::text) THEN 1
            ELSE NULL::integer
        END) AS failed_runs,
    avg(rh.duration_ms) AS avg_duration_ms,
    max(rh.duration_ms) AS max_duration_ms,
    min(rh.duration_ms) AS min_duration_ms,
    max(rh.started_at) AS last_run_at
   FROM (public.reports_master r
     LEFT JOIN public.report_run_history rh ON (((r.report_id = rh.report_id) AND (rh.started_at > (now() - '7 days'::interval)))))
  GROUP BY r.report_id, r.name
  ORDER BY (count(rh.run_id)) DESC;


--
-- Name: VIEW vw_report_execution_performance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_report_execution_performance IS 'Report execution statistics for the last 7 days';


--
-- Name: vw_security_events_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_security_events_summary AS
 SELECT tenant_id,
    event_type,
    count(*) AS event_count,
    max(created_at) AS last_occurrence
   FROM public.security_events
  WHERE (created_at > (now() - '30 days'::interval))
  GROUP BY tenant_id, event_type
  ORDER BY (count(*)) DESC;


--
-- Name: VIEW vw_security_events_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_security_events_summary IS 'Security event summary for the last 30 days by tenant and event type';


--
-- Name: vw_system_health_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_system_health_metrics AS
 SELECT ( SELECT count(*) AS count
           FROM public.tenants
          WHERE ((tenants.status)::text = 'active'::text)) AS active_tenants,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.status)::text = 'active'::text)) AS active_users,
    ( SELECT count(*) AS count
           FROM public.sessions
          WHERE (sessions.expires_at > now())) AS active_sessions,
    ( SELECT count(*) AS count
           FROM public.report_run_history
          WHERE (date(report_run_history.started_at) = CURRENT_DATE)) AS reports_run_today,
    ( SELECT count(*) AS count
           FROM public.report_run_history
          WHERE ((date(report_run_history.started_at) = CURRENT_DATE) AND ((report_run_history.status)::text = 'failed'::text))) AS failed_reports_today,
    ( SELECT avg(report_run_history.duration_ms) AS avg
           FROM public.report_run_history
          WHERE ((date(report_run_history.started_at) = CURRENT_DATE) AND ((report_run_history.status)::text = 'completed'::text))) AS avg_report_duration_ms_today,
    ( SELECT count(DISTINCT chat_sessions.session_id) AS count
           FROM public.chat_sessions
          WHERE (date(chat_sessions.started_at) = CURRENT_DATE)) AS chat_sessions_today,
    ( SELECT count(*) AS count
           FROM public.api_usage_logs
          WHERE (date(api_usage_logs.created_at) = CURRENT_DATE)) AS api_calls_today;


--
-- Name: VIEW vw_system_health_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_system_health_metrics IS 'Real-time system health and activity metrics';


--
-- Name: vw_tenant_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_tenant_overview AS
 SELECT t.tenant_id,
    t.tenant_name,
    t.domain,
    t.plan,
    t.status,
    count(DISTINCT u.user_id) AS total_users,
    count(DISTINCT
        CASE
            WHEN ((u.status)::text = 'active'::text) THEN u.user_id
            ELSE NULL::integer
        END) AS active_users,
    count(DISTINCT s.session_id) AS active_sessions,
    t.created_at AS tenant_created_at,
    t.updated_at AS tenant_updated_at
   FROM ((public.tenants t
     LEFT JOIN public.users u ON ((t.tenant_id = u.tenant_id)))
     LEFT JOIN public.sessions s ON (((u.user_id = s.user_id) AND (s.expires_at > now()))))
  GROUP BY t.tenant_id, t.tenant_name, t.domain, t.plan, t.status, t.created_at, t.updated_at;


--
-- Name: VIEW vw_tenant_overview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_tenant_overview IS 'Tenant overview with user and session statistics';


--
-- Name: vw_user_activity_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_user_activity_summary AS
 SELECT u.user_id,
    u.tenant_id,
    u.email,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS full_name,
    u.last_login,
    count(DISTINCT rv.report_id) AS reports_viewed,
    count(DISTINCT cs.session_id) AS chat_sessions,
    count(DISTINCT s.session_id) AS total_sessions,
    max(rv.viewed_at) AS last_report_view,
    max(s.created_at) AS last_session_start
   FROM (((public.users u
     LEFT JOIN public.report_view_logs rv ON (((u.user_id = rv.user_id) AND (rv.viewed_at > (now() - '30 days'::interval)))))
     LEFT JOIN public.chat_sessions cs ON (((u.user_id = cs.user_id) AND (cs.started_at > (now() - '30 days'::interval)))))
     LEFT JOIN public.sessions s ON (((u.user_id = s.user_id) AND (s.created_at > (now() - '30 days'::interval)))))
  GROUP BY u.user_id, u.tenant_id, u.email, u.first_name, u.last_name, u.last_login;


--
-- Name: VIEW vw_user_activity_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_user_activity_summary IS 'User activity metrics for the last 30 days';


--
-- Name: vw_users_complete; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_users_complete AS
 SELECT u.user_id,
    u.tenant_id,
    t.tenant_name,
    t.plan AS tenant_plan,
    t.status AS tenant_status,
    u.first_name,
    u.last_name,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS full_name,
    u.email,
    u.phone_number,
    u.status AS user_status,
    u.last_login,
    u.created_at AS user_created_at,
    r.role_id,
    r.role_name,
    r.is_system AS is_system_role,
    p.theme,
    p.sidebar,
    l.language,
    l.timezone,
    l.currency,
        CASE
            WHEN (u.last_login IS NULL) THEN NULL::integer
            ELSE (EXTRACT(day FROM (now() - u.last_login)))::integer
        END AS days_since_last_login
   FROM ((((public.users u
     JOIN public.tenants t ON ((u.tenant_id = t.tenant_id)))
     LEFT JOIN public.roles r ON ((u.role_id = r.role_id)))
     LEFT JOIN public.preferences p ON ((u.user_id = p.user_id)))
     LEFT JOIN public.localization l ON ((u.user_id = l.user_id)));


--
-- Name: VIEW vw_users_complete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_users_complete IS 'Complete user information including tenant, role, preferences, and localization';


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhooks (
    hook_id integer NOT NULL,
    tenant_id integer,
    endpoint_url character varying(500) NOT NULL,
    method character varying(10) DEFAULT 'POST'::character varying NOT NULL,
    headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret character varying(256),
    events jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE webhooks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhooks IS 'Outbound webhook endpoints for event notifications';


--
-- Name: webhooks_hook_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhooks_hook_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhooks_hook_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhooks_hook_id_seq OWNED BY public.webhooks.hook_id;


--
-- Name: workflow_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_definitions (
    workflow_id integer NOT NULL,
    tenant_id integer,
    task_id integer,
    name character varying(200) NOT NULL,
    description text,
    definition_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE workflow_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workflow_definitions IS 'Workflow templates (DAG-style) triggered by tasks';


--
-- Name: workflow_definitions_workflow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_definitions_workflow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_definitions_workflow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_definitions_workflow_id_seq OWNED BY public.workflow_definitions.workflow_id;


--
-- Name: workflow_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_instances (
    instance_id integer NOT NULL,
    workflow_id integer NOT NULL,
    status character varying(30) DEFAULT 'running'::character varying NOT NULL,
    context_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_msg text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


--
-- Name: TABLE workflow_instances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workflow_instances IS 'Individual workflow execution runs';


--
-- Name: workflow_instances_instance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_instances_instance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_instances_instance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_instances_instance_id_seq OWNED BY public.workflow_instances.instance_id;


--
-- Name: activity_logs activity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN activity_id SET DEFAULT nextval('public.activity_logs_activity_id_seq'::regclass);


--
-- Name: ai_insights insight_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights ALTER COLUMN insight_id SET DEFAULT nextval('public.ai_insights_insight_id_seq'::regclass);


--
-- Name: alert_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_logs ALTER COLUMN log_id SET DEFAULT nextval('public.alert_logs_log_id_seq'::regclass);


--
-- Name: alert_rules rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules ALTER COLUMN rule_id SET DEFAULT nextval('public.alert_rules_rule_id_seq'::regclass);


--
-- Name: announcements announcement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN announcement_id SET DEFAULT nextval('public.announcements_announcement_id_seq'::regclass);


--
-- Name: anomaly_logs anomaly_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_logs ALTER COLUMN anomaly_id SET DEFAULT nextval('public.anomaly_logs_anomaly_id_seq'::regclass);


--
-- Name: api_keys api_key_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN api_key_id SET DEFAULT nextval('public.api_keys_api_key_id_seq'::regclass);


--
-- Name: api_usage_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs ALTER COLUMN log_id SET DEFAULT nextval('public.api_usage_logs_log_id_seq'::regclass);


--
-- Name: approval_steps step_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps ALTER COLUMN step_id SET DEFAULT nextval('public.approval_steps_step_id_seq'::regclass);


--
-- Name: approval_workflows workflow_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows ALTER COLUMN workflow_id SET DEFAULT nextval('public.approval_workflows_workflow_id_seq'::regclass);


--
-- Name: attachments attachment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.attachments_attachment_id_seq'::regclass);


--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: benchmarking_data benchmark_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarking_data ALTER COLUMN benchmark_id SET DEFAULT nextval('public.benchmarking_data_benchmark_id_seq'::regclass);


--
-- Name: billing_accounts account_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_accounts ALTER COLUMN account_id SET DEFAULT nextval('public.billing_accounts_account_id_seq'::regclass);


--
-- Name: blockchain_audit audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blockchain_audit ALTER COLUMN audit_id SET DEFAULT nextval('public.blockchain_audit_audit_id_seq'::regclass);


--
-- Name: chat_feedback feedback_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.chat_feedback_feedback_id_seq'::regclass);


--
-- Name: chat_intents intent_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_intents ALTER COLUMN intent_id SET DEFAULT nextval('public.chat_intents_intent_id_seq'::regclass);


--
-- Name: chat_queries query_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_queries ALTER COLUMN query_id SET DEFAULT nextval('public.chat_queries_query_id_seq'::regclass);


--
-- Name: chat_responses response_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_responses ALTER COLUMN response_id SET DEFAULT nextval('public.chat_responses_response_id_seq'::regclass);


--
-- Name: chat_sessions session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions ALTER COLUMN session_id SET DEFAULT nextval('public.chat_sessions_session_id_seq'::regclass);


--
-- Name: compliance_audit audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_audit ALTER COLUMN audit_id SET DEFAULT nextval('public.compliance_audit_audit_id_seq'::regclass);


--
-- Name: compliance_calendar compliance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_calendar ALTER COLUMN compliance_id SET DEFAULT nextval('public.compliance_calendar_compliance_id_seq'::regclass);


--
-- Name: compliance_documents doc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_documents ALTER COLUMN doc_id SET DEFAULT nextval('public.compliance_documents_doc_id_seq'::regclass);


--
-- Name: compliance_rules rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_rules ALTER COLUMN rule_id SET DEFAULT nextval('public.compliance_rules_rule_id_seq'::regclass);


--
-- Name: compliance_submissions submission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions ALTER COLUMN submission_id SET DEFAULT nextval('public.compliance_submissions_submission_id_seq'::regclass);


--
-- Name: connector_sync_logs sync_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_logs ALTER COLUMN sync_id SET DEFAULT nextval('public.connector_sync_logs_sync_id_seq'::regclass);


--
-- Name: connector_types connector_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_types ALTER COLUMN connector_type_id SET DEFAULT nextval('public.connector_types_connector_type_id_seq'::regclass);


--
-- Name: correlation_matrix corr_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correlation_matrix ALTER COLUMN corr_id SET DEFAULT nextval('public.correlation_matrix_corr_id_seq'::regclass);


--
-- Name: custom_report_definitions custom_report_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_report_definitions ALTER COLUMN custom_report_id SET DEFAULT nextval('public.custom_report_definitions_custom_report_id_seq'::regclass);


--
-- Name: dashboard_widgets widget_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets ALTER COLUMN widget_id SET DEFAULT nextval('public.dashboard_widgets_widget_id_seq'::regclass);


--
-- Name: dashboards dashboard_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards ALTER COLUMN dashboard_id SET DEFAULT nextval('public.dashboards_dashboard_id_seq'::regclass);


--
-- Name: data_consent consent_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent ALTER COLUMN consent_id SET DEFAULT nextval('public.data_consent_consent_id_seq'::regclass);


--
-- Name: data_ingestion_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_ingestion_logs ALTER COLUMN log_id SET DEFAULT nextval('public.data_ingestion_logs_log_id_seq'::regclass);


--
-- Name: data_lineage lineage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_lineage ALTER COLUMN lineage_id SET DEFAULT nextval('public.data_lineage_lineage_id_seq'::regclass);


--
-- Name: data_masking_rules rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_masking_rules ALTER COLUMN rule_id SET DEFAULT nextval('public.data_masking_rules_rule_id_seq'::regclass);


--
-- Name: data_quality_scores quality_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_scores ALTER COLUMN quality_id SET DEFAULT nextval('public.data_quality_scores_quality_id_seq'::regclass);


--
-- Name: data_retention_policies policy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies ALTER COLUMN policy_id SET DEFAULT nextval('public.data_retention_policies_policy_id_seq'::regclass);


--
-- Name: data_sources source_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sources ALTER COLUMN source_id SET DEFAULT nextval('public.data_sources_source_id_seq'::regclass);


--
-- Name: data_uploads upload_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_uploads ALTER COLUMN upload_id SET DEFAULT nextval('public.data_uploads_upload_id_seq'::regclass);


--
-- Name: data_validation_rules rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_validation_rules ALTER COLUMN rule_id SET DEFAULT nextval('public.data_validation_rules_rule_id_seq'::regclass);


--
-- Name: deployment_logs deploy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_logs ALTER COLUMN deploy_id SET DEFAULT nextval('public.deployment_logs_deploy_id_seq'::regclass);


--
-- Name: distribution_lists list_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_lists ALTER COLUMN list_id SET DEFAULT nextval('public.distribution_lists_list_id_seq'::regclass);


--
-- Name: distribution_members member_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members ALTER COLUMN member_id SET DEFAULT nextval('public.distribution_members_member_id_seq'::regclass);


--
-- Name: domains domain_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains ALTER COLUMN domain_id SET DEFAULT nextval('public.domains_domain_id_seq'::regclass);


--
-- Name: email_queue queue_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue ALTER COLUMN queue_id SET DEFAULT nextval('public.email_queue_queue_id_seq'::regclass);


--
-- Name: error_logs error_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs ALTER COLUMN error_id SET DEFAULT nextval('public.error_logs_error_id_seq'::regclass);


--
-- Name: esg_scores esg_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_scores ALTER COLUMN esg_id SET DEFAULT nextval('public.esg_scores_esg_id_seq'::regclass);


--
-- Name: etl_jobs job_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_jobs ALTER COLUMN job_id SET DEFAULT nextval('public.etl_jobs_job_id_seq'::regclass);


--
-- Name: exchange_rates rate_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates ALTER COLUMN rate_id SET DEFAULT nextval('public.exchange_rates_rate_id_seq'::regclass);


--
-- Name: executive_narratives narrative_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executive_narratives ALTER COLUMN narrative_id SET DEFAULT nextval('public.executive_narratives_narrative_id_seq'::regclass);


--
-- Name: export_history export_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_history ALTER COLUMN export_id SET DEFAULT nextval('public.export_history_export_id_seq'::regclass);


--
-- Name: export_templates template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_templates ALTER COLUMN template_id SET DEFAULT nextval('public.export_templates_template_id_seq'::regclass);


--
-- Name: external_feeds feed_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_feeds ALTER COLUMN feed_id SET DEFAULT nextval('public.external_feeds_feed_id_seq'::regclass);


--
-- Name: feature_flags flag_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags ALTER COLUMN flag_id SET DEFAULT nextval('public.feature_flags_flag_id_seq'::regclass);


--
-- Name: fiscal_calendars calendar_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_calendars ALTER COLUMN calendar_id SET DEFAULT nextval('public.fiscal_calendars_calendar_id_seq'::regclass);


--
-- Name: forecast_models model_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_models ALTER COLUMN model_id SET DEFAULT nextval('public.forecast_models_model_id_seq'::regclass);


--
-- Name: gdpr_requests request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests ALTER COLUMN request_id SET DEFAULT nextval('public.gdpr_requests_request_id_seq'::regclass);


--
-- Name: integration_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs ALTER COLUMN log_id SET DEFAULT nextval('public.integration_logs_log_id_seq'::regclass);


--
-- Name: ip_allowlist entry_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist ALTER COLUMN entry_id SET DEFAULT nextval('public.ip_allowlist_entry_id_seq'::regclass);


--
-- Name: job_queue job_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_queue ALTER COLUMN job_id SET DEFAULT nextval('public.job_queue_job_id_seq'::regclass);


--
-- Name: kpi_benchmarks benchmark_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_benchmarks ALTER COLUMN benchmark_id SET DEFAULT nextval('public.kpi_benchmarks_benchmark_id_seq'::regclass);


--
-- Name: kpi_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_history ALTER COLUMN history_id SET DEFAULT nextval('public.kpi_history_history_id_seq'::regclass);


--
-- Name: llm_usage_logs usage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage_logs ALTER COLUMN usage_id SET DEFAULT nextval('public.llm_usage_logs_usage_id_seq'::regclass);


--
-- Name: localization loc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localization ALTER COLUMN loc_id SET DEFAULT nextval('public.localization_loc_id_seq'::regclass);


--
-- Name: message_streams stream_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_streams ALTER COLUMN stream_id SET DEFAULT nextval('public.message_streams_stream_id_seq'::regclass);


--
-- Name: metric_definitions metric_def_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_definitions ALTER COLUMN metric_def_id SET DEFAULT nextval('public.metric_definitions_metric_def_id_seq'::regclass);


--
-- Name: mfa_settings mfa_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_settings ALTER COLUMN mfa_id SET DEFAULT nextval('public.mfa_settings_mfa_id_seq'::regclass);


--
-- Name: model_training_history training_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_training_history ALTER COLUMN training_id SET DEFAULT nextval('public.model_training_history_training_id_seq'::regclass);


--
-- Name: notification_templates template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN template_id SET DEFAULT nextval('public.notification_templates_template_id_seq'::regclass);


--
-- Name: notifications notif_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN notif_id SET DEFAULT nextval('public.notifications_notif_id_seq'::regclass);


--
-- Name: oauth_providers provider_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_providers ALTER COLUMN provider_id SET DEFAULT nextval('public.oauth_providers_provider_id_seq'::regclass);


--
-- Name: partner_integrations partner_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_integrations ALTER COLUMN partner_id SET DEFAULT nextval('public.partner_integrations_partner_id_seq'::regclass);


--
-- Name: password_reset_tokens token_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN token_id SET DEFAULT nextval('public.password_reset_tokens_token_id_seq'::regclass);


--
-- Name: permissions perm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN perm_id SET DEFAULT nextval('public.permissions_perm_id_seq'::regclass);


--
-- Name: plan_features feature_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features ALTER COLUMN feature_id SET DEFAULT nextval('public.plan_features_feature_id_seq'::regclass);


--
-- Name: preferences pref_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences ALTER COLUMN pref_id SET DEFAULT nextval('public.preferences_pref_id_seq'::regclass);


--
-- Name: rate_limit_config config_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_config ALTER COLUMN config_id SET DEFAULT nextval('public.rate_limit_config_config_id_seq'::regclass);


--
-- Name: recommendations rec_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations ALTER COLUMN rec_id SET DEFAULT nextval('public.recommendations_rec_id_seq'::regclass);


--
-- Name: regions region_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions ALTER COLUMN region_id SET DEFAULT nextval('public.regions_region_id_seq'::regclass);


--
-- Name: regulatory_contacts contact_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_contacts ALTER COLUMN contact_id SET DEFAULT nextval('public.regulatory_contacts_contact_id_seq'::regclass);


--
-- Name: report_access_policies policy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies ALTER COLUMN policy_id SET DEFAULT nextval('public.report_access_policies_policy_id_seq'::regclass);


--
-- Name: report_annotations annotation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_annotations ALTER COLUMN annotation_id SET DEFAULT nextval('public.report_annotations_annotation_id_seq'::regclass);


--
-- Name: report_approvals approval_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals ALTER COLUMN approval_id SET DEFAULT nextval('public.report_approvals_approval_id_seq'::regclass);


--
-- Name: report_bookmarks bookmark_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks ALTER COLUMN bookmark_id SET DEFAULT nextval('public.report_bookmarks_bookmark_id_seq'::regclass);


--
-- Name: report_comments comment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments ALTER COLUMN comment_id SET DEFAULT nextval('public.report_comments_comment_id_seq'::regclass);


--
-- Name: report_data data_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_data ALTER COLUMN data_id SET DEFAULT nextval('public.report_data_data_id_seq'::regclass);


--
-- Name: report_fields field_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_fields ALTER COLUMN field_id SET DEFAULT nextval('public.report_fields_field_id_seq'::regclass);


--
-- Name: report_filters filter_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_filters ALTER COLUMN filter_id SET DEFAULT nextval('public.report_filters_filter_id_seq'::regclass);


--
-- Name: report_join_definitions join_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_join_definitions ALTER COLUMN join_id SET DEFAULT nextval('public.report_join_definitions_join_id_seq'::regclass);


--
-- Name: report_kpis kpi_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_kpis ALTER COLUMN kpi_id SET DEFAULT nextval('public.report_kpis_kpi_id_seq'::regclass);


--
-- Name: report_run_history run_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history ALTER COLUMN run_id SET DEFAULT nextval('public.report_run_history_run_id_seq'::regclass);


--
-- Name: report_sharing share_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing ALTER COLUMN share_id SET DEFAULT nextval('public.report_sharing_share_id_seq'::regclass);


--
-- Name: report_subscriptions subscription_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_subscriptions ALTER COLUMN subscription_id SET DEFAULT nextval('public.report_subscriptions_subscription_id_seq'::regclass);


--
-- Name: report_tags tag_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tags ALTER COLUMN tag_id SET DEFAULT nextval('public.report_tags_tag_id_seq'::regclass);


--
-- Name: report_templates template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN template_id SET DEFAULT nextval('public.report_templates_template_id_seq'::regclass);


--
-- Name: report_themes theme_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_themes ALTER COLUMN theme_id SET DEFAULT nextval('public.report_themes_theme_id_seq'::regclass);


--
-- Name: report_versions version_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_versions ALTER COLUMN version_id SET DEFAULT nextval('public.report_versions_version_id_seq'::regclass);


--
-- Name: report_view_logs view_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_view_logs ALTER COLUMN view_id SET DEFAULT nextval('public.report_view_logs_view_id_seq'::regclass);


--
-- Name: reports_master report_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_master ALTER COLUMN report_id SET DEFAULT nextval('public.reports_master_report_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Name: saved_filters filter_set_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters ALTER COLUMN filter_set_id SET DEFAULT nextval('public.saved_filters_filter_set_id_seq'::regclass);


--
-- Name: scenario_simulations scenario_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_simulations ALTER COLUMN scenario_id SET DEFAULT nextval('public.scenario_simulations_scenario_id_seq'::regclass);


--
-- Name: scheduled_tasks task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks ALTER COLUMN task_id SET DEFAULT nextval('public.scheduled_tasks_task_id_seq'::regclass);


--
-- Name: scorecard_definitions scorecard_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_definitions ALTER COLUMN scorecard_id SET DEFAULT nextval('public.scorecard_definitions_scorecard_id_seq'::regclass);


--
-- Name: scorecard_kpis sc_kpi_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_kpis ALTER COLUMN sc_kpi_id SET DEFAULT nextval('public.scorecard_kpis_sc_kpi_id_seq'::regclass);


--
-- Name: search_history search_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history ALTER COLUMN search_id SET DEFAULT nextval('public.search_history_search_id_seq'::regclass);


--
-- Name: security_events event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events ALTER COLUMN event_id SET DEFAULT nextval('public.security_events_event_id_seq'::regclass);


--
-- Name: sessions session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions ALTER COLUMN session_id SET DEFAULT nextval('public.sessions_session_id_seq'::regclass);


--
-- Name: settings setting_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN setting_id SET DEFAULT nextval('public.settings_setting_id_seq'::regclass);


--
-- Name: source_mappings mapping_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_mappings ALTER COLUMN mapping_id SET DEFAULT nextval('public.source_mappings_mapping_id_seq'::regclass);


--
-- Name: subscription_plans plan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN plan_id SET DEFAULT nextval('public.subscription_plans_plan_id_seq'::regclass);


--
-- Name: system_metrics metric_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics ALTER COLUMN metric_id SET DEFAULT nextval('public.system_metrics_metric_id_seq'::regclass);


--
-- Name: task_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_history ALTER COLUMN history_id SET DEFAULT nextval('public.task_history_history_id_seq'::regclass);


--
-- Name: teams team_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams ALTER COLUMN team_id SET DEFAULT nextval('public.teams_team_id_seq'::regclass);


--
-- Name: tenant_invitations invitation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations ALTER COLUMN invitation_id SET DEFAULT nextval('public.tenant_invitations_invitation_id_seq'::regclass);


--
-- Name: tenant_subscriptions subscription_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions ALTER COLUMN subscription_id SET DEFAULT nextval('public.tenant_subscriptions_subscription_id_seq'::regclass);


--
-- Name: tenants tenant_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN tenant_id SET DEFAULT nextval('public.tenants_tenant_id_seq'::regclass);


--
-- Name: translations translation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations ALTER COLUMN translation_id SET DEFAULT nextval('public.translations_translation_id_seq'::regclass);


--
-- Name: trend_analysis trend_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trend_analysis ALTER COLUMN trend_id SET DEFAULT nextval('public.trend_analysis_trend_id_seq'::regclass);


--
-- Name: usage_metrics usage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_metrics ALTER COLUMN usage_id SET DEFAULT nextval('public.usage_metrics_usage_id_seq'::regclass);


--
-- Name: user_devices device_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices ALTER COLUMN device_id SET DEFAULT nextval('public.user_devices_device_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: webhooks hook_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks ALTER COLUMN hook_id SET DEFAULT nextval('public.webhooks_hook_id_seq'::regclass);


--
-- Name: workflow_definitions workflow_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions ALTER COLUMN workflow_id SET DEFAULT nextval('public.workflow_definitions_workflow_id_seq'::regclass);


--
-- Name: workflow_instances instance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances ALTER COLUMN instance_id SET DEFAULT nextval('public.workflow_instances_instance_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (activity_id);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (insight_id);


--
-- Name: alert_logs alert_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_logs
    ADD CONSTRAINT alert_logs_pkey PRIMARY KEY (log_id);


--
-- Name: alert_rules alert_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (announcement_id);


--
-- Name: anomaly_logs anomaly_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_logs
    ADD CONSTRAINT anomaly_logs_pkey PRIMARY KEY (anomaly_id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (api_key_id);


--
-- Name: api_usage_logs api_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_pkey PRIMARY KEY (log_id);


--
-- Name: approval_steps approval_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_pkey PRIMARY KEY (step_id);


--
-- Name: approval_steps approval_steps_workflow_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_workflow_id_step_order_key UNIQUE (workflow_id, step_order);


--
-- Name: approval_workflows approval_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_pkey PRIMARY KEY (workflow_id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: benchmarking_data benchmarking_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarking_data
    ADD CONSTRAINT benchmarking_data_pkey PRIMARY KEY (benchmark_id);


--
-- Name: billing_accounts billing_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_accounts
    ADD CONSTRAINT billing_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: billing_accounts billing_accounts_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_accounts
    ADD CONSTRAINT billing_accounts_tenant_id_key UNIQUE (tenant_id);


--
-- Name: blockchain_audit blockchain_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blockchain_audit
    ADD CONSTRAINT blockchain_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: blockchain_audit blockchain_audit_txn_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blockchain_audit
    ADD CONSTRAINT blockchain_audit_txn_hash_key UNIQUE (txn_hash);


--
-- Name: chat_feedback chat_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: chat_intents chat_intents_intent_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_intents
    ADD CONSTRAINT chat_intents_intent_name_key UNIQUE (intent_name);


--
-- Name: chat_intents chat_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_intents
    ADD CONSTRAINT chat_intents_pkey PRIMARY KEY (intent_id);


--
-- Name: chat_queries chat_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_queries
    ADD CONSTRAINT chat_queries_pkey PRIMARY KEY (query_id);


--
-- Name: chat_responses chat_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_responses
    ADD CONSTRAINT chat_responses_pkey PRIMARY KEY (response_id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: compliance_audit compliance_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_audit
    ADD CONSTRAINT compliance_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: compliance_calendar compliance_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_calendar
    ADD CONSTRAINT compliance_calendar_pkey PRIMARY KEY (compliance_id);


--
-- Name: compliance_documents compliance_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_documents
    ADD CONSTRAINT compliance_documents_pkey PRIMARY KEY (doc_id);


--
-- Name: compliance_rules compliance_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_rules
    ADD CONSTRAINT compliance_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: compliance_submissions compliance_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT compliance_submissions_pkey PRIMARY KEY (submission_id);


--
-- Name: connector_sync_logs connector_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_logs
    ADD CONSTRAINT connector_sync_logs_pkey PRIMARY KEY (sync_id);


--
-- Name: connector_types connector_types_connector_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_types
    ADD CONSTRAINT connector_types_connector_name_key UNIQUE (connector_name);


--
-- Name: connector_types connector_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_types
    ADD CONSTRAINT connector_types_pkey PRIMARY KEY (connector_type_id);


--
-- Name: correlation_matrix correlation_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correlation_matrix
    ADD CONSTRAINT correlation_matrix_pkey PRIMARY KEY (corr_id);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (country_code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (currency_code);


--
-- Name: custom_report_definitions custom_report_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_report_definitions
    ADD CONSTRAINT custom_report_definitions_pkey PRIMARY KEY (custom_report_id);


--
-- Name: dashboard_widgets dashboard_widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT dashboard_widgets_pkey PRIMARY KEY (widget_id);


--
-- Name: dashboards dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_pkey PRIMARY KEY (dashboard_id);


--
-- Name: data_consent data_consent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent
    ADD CONSTRAINT data_consent_pkey PRIMARY KEY (consent_id);


--
-- Name: data_consent data_consent_user_id_consent_type_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent
    ADD CONSTRAINT data_consent_user_id_consent_type_version_key UNIQUE (user_id, consent_type, version);


--
-- Name: data_ingestion_logs data_ingestion_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_ingestion_logs
    ADD CONSTRAINT data_ingestion_logs_pkey PRIMARY KEY (log_id);


--
-- Name: data_lineage data_lineage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_lineage
    ADD CONSTRAINT data_lineage_pkey PRIMARY KEY (lineage_id);


--
-- Name: data_masking_rules data_masking_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_masking_rules
    ADD CONSTRAINT data_masking_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: data_quality_scores data_quality_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_scores
    ADD CONSTRAINT data_quality_scores_pkey PRIMARY KEY (quality_id);


--
-- Name: data_retention_policies data_retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: data_sources data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_pkey PRIMARY KEY (source_id);


--
-- Name: data_uploads data_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_pkey PRIMARY KEY (upload_id);


--
-- Name: data_validation_rules data_validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_validation_rules
    ADD CONSTRAINT data_validation_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: deployment_logs deployment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_logs
    ADD CONSTRAINT deployment_logs_pkey PRIMARY KEY (deploy_id);


--
-- Name: distribution_lists distribution_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_lists
    ADD CONSTRAINT distribution_lists_pkey PRIMARY KEY (list_id);


--
-- Name: distribution_lists distribution_lists_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_lists
    ADD CONSTRAINT distribution_lists_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: distribution_members distribution_members_list_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members
    ADD CONSTRAINT distribution_members_list_id_email_key UNIQUE (list_id, email);


--
-- Name: distribution_members distribution_members_list_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members
    ADD CONSTRAINT distribution_members_list_id_user_id_key UNIQUE (list_id, user_id);


--
-- Name: distribution_members distribution_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members
    ADD CONSTRAINT distribution_members_pkey PRIMARY KEY (member_id);


--
-- Name: domains domains_domain_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_domain_name_key UNIQUE (domain_name);


--
-- Name: domains domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_pkey PRIMARY KEY (domain_id);


--
-- Name: domains domains_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_slug_key UNIQUE (slug);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (error_id);


--
-- Name: esg_scores esg_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_scores
    ADD CONSTRAINT esg_scores_pkey PRIMARY KEY (esg_id);


--
-- Name: etl_jobs etl_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_jobs
    ADD CONSTRAINT etl_jobs_pkey PRIMARY KEY (job_id);


--
-- Name: exchange_rates exchange_rates_from_currency_to_currency_effective_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_to_currency_effective_date_key UNIQUE (from_currency, to_currency, effective_date);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (rate_id);


--
-- Name: executive_narratives executive_narratives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executive_narratives
    ADD CONSTRAINT executive_narratives_pkey PRIMARY KEY (narrative_id);


--
-- Name: export_history export_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_history
    ADD CONSTRAINT export_history_pkey PRIMARY KEY (export_id);


--
-- Name: export_templates export_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_templates
    ADD CONSTRAINT export_templates_pkey PRIMARY KEY (template_id);


--
-- Name: external_feeds external_feeds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_feeds
    ADD CONSTRAINT external_feeds_pkey PRIMARY KEY (feed_id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (flag_id);


--
-- Name: feature_flags feature_flags_tenant_id_flag_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_tenant_id_flag_name_key UNIQUE (tenant_id, flag_name);


--
-- Name: fiscal_calendars fiscal_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_calendars
    ADD CONSTRAINT fiscal_calendars_pkey PRIMARY KEY (calendar_id);


--
-- Name: fiscal_calendars fiscal_calendars_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_calendars
    ADD CONSTRAINT fiscal_calendars_tenant_id_key UNIQUE (tenant_id);


--
-- Name: forecast_models forecast_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_pkey PRIMARY KEY (model_id);


--
-- Name: gdpr_requests gdpr_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_pkey PRIMARY KEY (request_id);


--
-- Name: integration_logs integration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (log_id);


--
-- Name: ip_allowlist ip_allowlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist
    ADD CONSTRAINT ip_allowlist_pkey PRIMARY KEY (entry_id);


--
-- Name: ip_allowlist ip_allowlist_tenant_id_cidr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist
    ADD CONSTRAINT ip_allowlist_tenant_id_cidr_key UNIQUE (tenant_id, cidr);


--
-- Name: job_queue job_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_queue
    ADD CONSTRAINT job_queue_pkey PRIMARY KEY (job_id);


--
-- Name: kpi_benchmarks kpi_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_benchmarks
    ADD CONSTRAINT kpi_benchmarks_pkey PRIMARY KEY (benchmark_id);


--
-- Name: kpi_history kpi_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_history
    ADD CONSTRAINT kpi_history_pkey PRIMARY KEY (history_id);


--
-- Name: llm_usage_logs llm_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage_logs
    ADD CONSTRAINT llm_usage_logs_pkey PRIMARY KEY (usage_id);


--
-- Name: localization localization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localization
    ADD CONSTRAINT localization_pkey PRIMARY KEY (loc_id);


--
-- Name: localization localization_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localization
    ADD CONSTRAINT localization_user_id_key UNIQUE (user_id);


--
-- Name: message_streams message_streams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_streams
    ADD CONSTRAINT message_streams_pkey PRIMARY KEY (stream_id);


--
-- Name: metric_definitions metric_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_definitions
    ADD CONSTRAINT metric_definitions_pkey PRIMARY KEY (metric_def_id);


--
-- Name: metric_definitions metric_definitions_tenant_id_metric_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_definitions
    ADD CONSTRAINT metric_definitions_tenant_id_metric_name_key UNIQUE (tenant_id, metric_name);


--
-- Name: mfa_settings mfa_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_settings
    ADD CONSTRAINT mfa_settings_pkey PRIMARY KEY (mfa_id);


--
-- Name: mfa_settings mfa_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_settings
    ADD CONSTRAINT mfa_settings_user_id_key UNIQUE (user_id);


--
-- Name: model_training_history model_training_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_training_history
    ADD CONSTRAINT model_training_history_pkey PRIMARY KEY (training_id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (template_id);


--
-- Name: notification_templates notification_templates_tenant_id_template_code_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_tenant_id_template_code_channel_key UNIQUE (tenant_id, template_code, channel);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notif_id);


--
-- Name: oauth_providers oauth_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_providers
    ADD CONSTRAINT oauth_providers_pkey PRIMARY KEY (provider_id);


--
-- Name: oauth_providers oauth_providers_tenant_id_provider_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_providers
    ADD CONSTRAINT oauth_providers_tenant_id_provider_name_key UNIQUE (tenant_id, provider_name);


--
-- Name: partner_integrations partner_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_integrations
    ADD CONSTRAINT partner_integrations_pkey PRIMARY KEY (partner_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: permissions permissions_perm_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_perm_code_key UNIQUE (perm_code);


--
-- Name: permissions permissions_perm_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_perm_name_key UNIQUE (perm_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (perm_id);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (feature_id);


--
-- Name: plan_features plan_features_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_key UNIQUE (plan_id);


--
-- Name: preferences preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_pkey PRIMARY KEY (pref_id);


--
-- Name: preferences preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_user_id_key UNIQUE (user_id);


--
-- Name: rate_limit_config rate_limit_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_config
    ADD CONSTRAINT rate_limit_config_pkey PRIMARY KEY (config_id);


--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (rec_id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (region_id);


--
-- Name: regions regions_region_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_region_code_key UNIQUE (region_code);


--
-- Name: regulatory_contacts regulatory_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_contacts
    ADD CONSTRAINT regulatory_contacts_pkey PRIMARY KEY (contact_id);


--
-- Name: report_access_policies report_access_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: report_annotations report_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_annotations
    ADD CONSTRAINT report_annotations_pkey PRIMARY KEY (annotation_id);


--
-- Name: report_approvals report_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals
    ADD CONSTRAINT report_approvals_pkey PRIMARY KEY (approval_id);


--
-- Name: report_bookmarks report_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_pkey PRIMARY KEY (bookmark_id);


--
-- Name: report_bookmarks report_bookmarks_user_id_report_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_user_id_report_id_key UNIQUE (user_id, report_id);


--
-- Name: report_comments report_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_pkey PRIMARY KEY (comment_id);


--
-- Name: report_data report_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_data
    ADD CONSTRAINT report_data_pkey PRIMARY KEY (data_id);


--
-- Name: report_fields report_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_fields
    ADD CONSTRAINT report_fields_pkey PRIMARY KEY (field_id);


--
-- Name: report_filters report_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_filters
    ADD CONSTRAINT report_filters_pkey PRIMARY KEY (filter_id);


--
-- Name: report_join_definitions report_join_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_join_definitions
    ADD CONSTRAINT report_join_definitions_pkey PRIMARY KEY (join_id);


--
-- Name: report_kpis report_kpis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_kpis
    ADD CONSTRAINT report_kpis_pkey PRIMARY KEY (kpi_id);


--
-- Name: report_run_history report_run_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history
    ADD CONSTRAINT report_run_history_pkey PRIMARY KEY (run_id);


--
-- Name: report_sharing report_sharing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing
    ADD CONSTRAINT report_sharing_pkey PRIMARY KEY (share_id);


--
-- Name: report_sharing report_sharing_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing
    ADD CONSTRAINT report_sharing_share_token_key UNIQUE (share_token);


--
-- Name: report_subscriptions report_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT report_subscriptions_pkey PRIMARY KEY (subscription_id);


--
-- Name: report_subscriptions report_subscriptions_user_id_report_id_delivery_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT report_subscriptions_user_id_report_id_delivery_channel_key UNIQUE (user_id, report_id, delivery_channel);


--
-- Name: report_tags report_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tags
    ADD CONSTRAINT report_tags_pkey PRIMARY KEY (tag_id);


--
-- Name: report_tags report_tags_report_id_tag_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tags
    ADD CONSTRAINT report_tags_report_id_tag_name_key UNIQUE (report_id, tag_name);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (template_id);


--
-- Name: report_themes report_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_themes
    ADD CONSTRAINT report_themes_pkey PRIMARY KEY (theme_id);


--
-- Name: report_versions report_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_versions
    ADD CONSTRAINT report_versions_pkey PRIMARY KEY (version_id);


--
-- Name: report_versions report_versions_report_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_versions
    ADD CONSTRAINT report_versions_report_id_version_number_key UNIQUE (report_id, version_number);


--
-- Name: report_view_logs report_view_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_view_logs
    ADD CONSTRAINT report_view_logs_pkey PRIMARY KEY (view_id);


--
-- Name: reports_master reports_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_master
    ADD CONSTRAINT reports_master_pkey PRIMARY KEY (report_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, perm_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: saved_filters saved_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_pkey PRIMARY KEY (filter_set_id);


--
-- Name: scenario_simulations scenario_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_simulations
    ADD CONSTRAINT scenario_simulations_pkey PRIMARY KEY (scenario_id);


--
-- Name: scheduled_tasks scheduled_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_pkey PRIMARY KEY (task_id);


--
-- Name: scorecard_definitions scorecard_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_definitions
    ADD CONSTRAINT scorecard_definitions_pkey PRIMARY KEY (scorecard_id);


--
-- Name: scorecard_kpis scorecard_kpis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_kpis
    ADD CONSTRAINT scorecard_kpis_pkey PRIMARY KEY (sc_kpi_id);


--
-- Name: scorecard_kpis scorecard_kpis_scorecard_id_kpi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_kpis
    ADD CONSTRAINT scorecard_kpis_scorecard_id_kpi_id_key UNIQUE (scorecard_id, kpi_id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (search_id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (event_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (setting_id);


--
-- Name: settings settings_tenant_id_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_tenant_id_setting_key_key UNIQUE (tenant_id, setting_key);


--
-- Name: source_mappings source_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_mappings
    ADD CONSTRAINT source_mappings_pkey PRIMARY KEY (mapping_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (plan_id);


--
-- Name: subscription_plans subscription_plans_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_plan_code_key UNIQUE (plan_code);


--
-- Name: system_metrics system_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics
    ADD CONSTRAINT system_metrics_pkey PRIMARY KEY (metric_id);


--
-- Name: task_history task_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_history
    ADD CONSTRAINT task_history_pkey PRIMARY KEY (history_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (team_id);


--
-- Name: teams teams_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: tenant_invitations tenant_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_pkey PRIMARY KEY (invitation_id);


--
-- Name: tenant_invitations tenant_invitations_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_token_hash_key UNIQUE (token_hash);


--
-- Name: tenant_subscriptions tenant_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (subscription_id);


--
-- Name: tenants tenants_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_domain_key UNIQUE (domain);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (tenant_id);


--
-- Name: translations translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_pkey PRIMARY KEY (translation_id);


--
-- Name: translations translations_translation_key_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_translation_key_language_code_key UNIQUE (translation_key, language_code);


--
-- Name: trend_analysis trend_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trend_analysis
    ADD CONSTRAINT trend_analysis_pkey PRIMARY KEY (trend_id);


--
-- Name: upload_validation_rules upload_validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_validation_rules
    ADD CONSTRAINT upload_validation_rules_pkey PRIMARY KEY (upload_id, rule_id);


--
-- Name: usage_metrics usage_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_metrics
    ADD CONSTRAINT usage_metrics_pkey PRIMARY KEY (usage_id);


--
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (device_id);


--
-- Name: user_devices user_devices_user_id_device_fingerprint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_device_fingerprint_key UNIQUE (user_id, device_fingerprint);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (hook_id);


--
-- Name: workflow_definitions workflow_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (workflow_id);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (instance_id);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_alert_logs_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_logs_rule ON public.alert_logs USING btree (rule_id);


--
-- Name: idx_alert_logs_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_logs_ts ON public.alert_logs USING btree (triggered_at);


--
-- Name: idx_annotations_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annotations_report ON public.report_annotations USING btree (report_id);


--
-- Name: idx_annotations_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annotations_run ON public.report_annotations USING btree (run_id);


--
-- Name: idx_annotations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annotations_user ON public.report_annotations USING btree (user_id);


--
-- Name: idx_announcements_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_ten ON public.announcements USING btree (tenant_id);


--
-- Name: idx_announcements_vis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_vis ON public.announcements USING btree (visible_from, visible_to);


--
-- Name: idx_anomaly_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_anomaly_report ON public.anomaly_logs USING btree (report_id);


--
-- Name: idx_anomaly_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_anomaly_severity ON public.anomaly_logs USING btree (severity);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_tenant ON public.api_keys USING btree (tenant_id);


--
-- Name: idx_api_usage_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_created ON public.api_usage_logs USING btree (created_at);


--
-- Name: idx_api_usage_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_endpoint ON public.api_usage_logs USING btree (endpoint);


--
-- Name: idx_api_usage_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_key ON public.api_usage_logs USING btree (api_key_id);


--
-- Name: idx_api_usage_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs USING btree (created_at DESC);


--
-- Name: idx_api_usage_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_tenant ON public.api_usage_logs USING btree (tenant_id);


--
-- Name: idx_approvals_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_approver ON public.report_approvals USING btree (approver_id);


--
-- Name: idx_approvals_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_report ON public.report_approvals USING btree (report_id);


--
-- Name: idx_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_status ON public.report_approvals USING btree (status);


--
-- Name: idx_apstep_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apstep_workflow ON public.approval_steps USING btree (workflow_id);


--
-- Name: idx_apwf_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apwf_report ON public.approval_workflows USING btree (report_id);


--
-- Name: idx_apwf_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apwf_tenant ON public.approval_workflows USING btree (tenant_id);


--
-- Name: idx_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_event_type ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_tenant ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_bookmarks_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookmarks_report ON public.report_bookmarks USING btree (report_id);


--
-- Name: idx_bookmarks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookmarks_user ON public.report_bookmarks USING btree (user_id);


--
-- Name: idx_cal_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_due_date ON public.compliance_calendar USING btree (due_date);


--
-- Name: idx_cal_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_report ON public.compliance_calendar USING btree (report_id);


--
-- Name: idx_cal_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_status ON public.compliance_calendar USING btree (status);


--
-- Name: idx_cal_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_tenant ON public.compliance_calendar USING btree (tenant_id);


--
-- Name: idx_chat_q_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_q_session ON public.chat_queries USING btree (session_id);


--
-- Name: idx_chat_r_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_r_query ON public.chat_responses USING btree (query_id);


--
-- Name: idx_chat_sess_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sess_tenant ON public.chat_sessions USING btree (tenant_id);


--
-- Name: idx_chat_sess_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sess_user ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_conn_sync_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conn_sync_source ON public.connector_sync_logs USING btree (source_id);


--
-- Name: idx_conn_sync_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conn_sync_started ON public.connector_sync_logs USING btree (started_at);


--
-- Name: idx_conn_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conn_sync_status ON public.connector_sync_logs USING btree (status);


--
-- Name: idx_conn_sync_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conn_sync_tenant ON public.connector_sync_logs USING btree (tenant_id);


--
-- Name: idx_consent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_type ON public.data_consent USING btree (consent_type);


--
-- Name: idx_consent_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_user ON public.data_consent USING btree (user_id);


--
-- Name: idx_countries_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_currency ON public.countries USING btree (currency_code);


--
-- Name: idx_countries_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_region ON public.countries USING btree (region_id);


--
-- Name: idx_custom_rpt_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_rpt_created ON public.custom_report_definitions USING btree (created_by);


--
-- Name: idx_custom_rpt_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_rpt_domain ON public.custom_report_definitions USING btree (domain_id);


--
-- Name: idx_custom_rpt_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_rpt_tenant ON public.custom_report_definitions USING btree (tenant_id);


--
-- Name: idx_dashboards_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboards_tenant ON public.dashboards USING btree (tenant_id);


--
-- Name: idx_dashboards_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboards_user ON public.dashboards USING btree (user_id);


--
-- Name: idx_distlist_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distlist_tenant ON public.distribution_lists USING btree (tenant_id);


--
-- Name: idx_distmem_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distmem_list ON public.distribution_members USING btree (list_id);


--
-- Name: idx_distmem_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distmem_user ON public.distribution_members USING btree (user_id);


--
-- Name: idx_dqs_upload; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dqs_upload ON public.data_quality_scores USING btree (upload_id);


--
-- Name: idx_dw_dashboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dw_dashboard ON public.dashboard_widgets USING btree (dashboard_id);


--
-- Name: idx_dw_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dw_report ON public.dashboard_widgets USING btree (report_id);


--
-- Name: idx_email_queue_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_retry ON public.email_queue USING btree (next_retry_at);


--
-- Name: idx_email_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_status ON public.email_queue USING btree (status);


--
-- Name: idx_email_queue_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_tenant ON public.email_queue USING btree (tenant_id);


--
-- Name: idx_etl_jobs_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etl_jobs_started_at ON public.etl_jobs USING btree (started_at DESC);


--
-- Name: idx_etl_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etl_source ON public.etl_jobs USING btree (source_id);


--
-- Name: idx_etl_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etl_status ON public.etl_jobs USING btree (status);


--
-- Name: idx_etl_upload; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etl_upload ON public.etl_jobs USING btree (upload_id);


--
-- Name: idx_export_history_dt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_history_dt ON public.export_history USING btree (created_at);


--
-- Name: idx_export_history_rpt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_history_rpt ON public.export_history USING btree (report_id);


--
-- Name: idx_export_history_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_history_ten ON public.export_history USING btree (tenant_id);


--
-- Name: idx_export_tmpl_format; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_tmpl_format ON public.export_templates USING btree (format);


--
-- Name: idx_export_tmpl_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_tmpl_tenant ON public.export_templates USING btree (tenant_id);


--
-- Name: idx_exrates_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exrates_date ON public.exchange_rates USING btree (effective_date);


--
-- Name: idx_exrates_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exrates_from ON public.exchange_rates USING btree (from_currency);


--
-- Name: idx_exrates_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exrates_to ON public.exchange_rates USING btree (to_currency);


--
-- Name: idx_forecast_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_report ON public.forecast_models USING btree (report_id);


--
-- Name: idx_gdpr_due_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_due_by ON public.gdpr_requests USING btree (due_by);


--
-- Name: idx_gdpr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_status ON public.gdpr_requests USING btree (status);


--
-- Name: idx_gdpr_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_tenant ON public.gdpr_requests USING btree (tenant_id);


--
-- Name: idx_ingestion_upload; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingestion_upload ON public.data_ingestion_logs USING btree (upload_id);


--
-- Name: idx_insights_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_report ON public.ai_insights USING btree (report_id);


--
-- Name: idx_insights_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_tenant ON public.ai_insights USING btree (tenant_id);


--
-- Name: idx_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_type ON public.ai_insights USING btree (insight_type);


--
-- Name: idx_intlogs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intlogs_created ON public.integration_logs USING btree (created_at);


--
-- Name: idx_intlogs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intlogs_status ON public.integration_logs USING btree (status);


--
-- Name: idx_intlogs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intlogs_tenant ON public.integration_logs USING btree (tenant_id);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.tenant_invitations USING btree (email);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status ON public.tenant_invitations USING btree (status);


--
-- Name: idx_invitations_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_tenant ON public.tenant_invitations USING btree (tenant_id);


--
-- Name: idx_ip_allowlist_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_allowlist_tenant ON public.ip_allowlist USING btree (tenant_id);


--
-- Name: idx_jobq_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobq_priority ON public.job_queue USING btree (priority, scheduled_at);


--
-- Name: idx_jobq_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobq_scheduled ON public.job_queue USING btree (scheduled_at);


--
-- Name: idx_jobq_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobq_status ON public.job_queue USING btree (status);


--
-- Name: idx_jobq_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobq_tenant ON public.job_queue USING btree (tenant_id);


--
-- Name: idx_jobq_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobq_type ON public.job_queue USING btree (job_type);


--
-- Name: idx_kpi_history_kpi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_history_kpi ON public.kpi_history USING btree (kpi_id);


--
-- Name: idx_kpi_history_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_history_recorded ON public.kpi_history USING btree (recorded_at);


--
-- Name: idx_kpi_history_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_history_tenant ON public.kpi_history USING btree (tenant_id);


--
-- Name: idx_lineage_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineage_report ON public.data_lineage USING btree (report_id);


--
-- Name: idx_lineage_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineage_source ON public.data_lineage USING btree (source_id);


--
-- Name: idx_llm_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_llm_created_at ON public.llm_usage_logs USING btree (created_at);


--
-- Name: idx_llm_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_llm_feature ON public.llm_usage_logs USING btree (feature);


--
-- Name: idx_llm_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_llm_tenant ON public.llm_usage_logs USING btree (tenant_id);


--
-- Name: idx_masking_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_masking_tenant ON public.data_masking_rules USING btree (tenant_id);


--
-- Name: idx_metric_def_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metric_def_domain ON public.metric_definitions USING btree (domain_id);


--
-- Name: idx_metric_def_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metric_def_tenant ON public.metric_definitions USING btree (tenant_id);


--
-- Name: idx_mfa_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mfa_user ON public.mfa_settings USING btree (user_id);


--
-- Name: idx_mth_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mth_model ON public.model_training_history USING btree (model_id);


--
-- Name: idx_mth_trained_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mth_trained_at ON public.model_training_history USING btree (trained_at);


--
-- Name: idx_mv_report_performance_metrics_report; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mv_report_performance_metrics_report ON public.mv_report_performance_metrics USING btree (report_id);


--
-- Name: idx_mv_tenant_usage_stats_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mv_tenant_usage_stats_tenant ON public.mv_tenant_usage_stats USING btree (tenant_id);


--
-- Name: idx_notif_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_status ON public.notifications USING btree (status);


--
-- Name: idx_notif_tmpl_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_tmpl_code ON public.notification_templates USING btree (template_code);


--
-- Name: idx_notif_tmpl_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_tmpl_tenant ON public.notification_templates USING btree (tenant_id);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id);


--
-- Name: idx_oauth_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_tenant ON public.oauth_providers USING btree (tenant_id);


--
-- Name: idx_prt_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_expires ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_prt_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_user ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_rap_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rap_report ON public.report_access_policies USING btree (report_id);


--
-- Name: idx_rap_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rap_role ON public.report_access_policies USING btree (role_id);


--
-- Name: idx_rap_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rap_team ON public.report_access_policies USING btree (team_id);


--
-- Name: idx_rap_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rap_user ON public.report_access_policies USING btree (user_id);


--
-- Name: idx_regions_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regions_parent ON public.regions USING btree (parent_region_id);


--
-- Name: idx_report_data_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_data_date ON public.report_data USING btree (report_date);


--
-- Name: idx_report_data_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_data_report ON public.report_data USING btree (report_id);


--
-- Name: idx_report_data_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_data_tenant ON public.report_data USING btree (tenant_id);


--
-- Name: idx_report_kpis_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_kpis_report ON public.report_kpis USING btree (report_id);


--
-- Name: idx_report_view_logs_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_view_logs_viewed_at ON public.report_view_logs USING btree (viewed_at DESC);


--
-- Name: idx_reports_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_active ON public.reports_master USING btree (is_active);


--
-- Name: idx_reports_compliance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_compliance ON public.reports_master USING btree (compliance_status);


--
-- Name: idx_reports_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_domain ON public.reports_master USING btree (domain_id);


--
-- Name: idx_reports_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_frequency ON public.reports_master USING btree (frequency);


--
-- Name: idx_retention_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retention_domain ON public.data_retention_policies USING btree (domain_id);


--
-- Name: idx_retention_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retention_tenant ON public.data_retention_policies USING btree (tenant_id);


--
-- Name: idx_rpt_fields_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpt_fields_domain ON public.report_fields USING btree (domain_id);


--
-- Name: idx_run_history_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_report ON public.report_run_history USING btree (report_id);


--
-- Name: idx_run_history_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_started ON public.report_run_history USING btree (started_at);


--
-- Name: idx_run_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_status ON public.report_run_history USING btree (status);


--
-- Name: idx_run_history_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_tenant ON public.report_run_history USING btree (tenant_id);


--
-- Name: idx_saved_filters_rpt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_filters_rpt ON public.saved_filters USING btree (report_id);


--
-- Name: idx_saved_filters_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_filters_user ON public.saved_filters USING btree (user_id);


--
-- Name: idx_sc_kpis_kpi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sc_kpis_kpi ON public.scorecard_kpis USING btree (kpi_id);


--
-- Name: idx_sc_kpis_scorecard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sc_kpis_scorecard ON public.scorecard_kpis USING btree (scorecard_id);


--
-- Name: idx_scorecard_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scorecard_domain ON public.scorecard_definitions USING btree (domain_id);


--
-- Name: idx_scorecard_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scorecard_tenant ON public.scorecard_definitions USING btree (tenant_id);


--
-- Name: idx_search_hist_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_hist_tenant ON public.search_history USING btree (tenant_id);


--
-- Name: idx_search_hist_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_hist_ts ON public.search_history USING btree (searched_at);


--
-- Name: idx_search_hist_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_hist_user ON public.search_history USING btree (user_id);


--
-- Name: idx_sec_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_events_created ON public.security_events USING btree (created_at);


--
-- Name: idx_sec_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_events_severity ON public.security_events USING btree (severity);


--
-- Name: idx_sec_events_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_events_tenant ON public.security_events USING btree (tenant_id);


--
-- Name: idx_sec_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_events_type ON public.security_events USING btree (event_type);


--
-- Name: idx_sec_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_events_user ON public.security_events USING btree (user_id);


--
-- Name: idx_security_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at DESC);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);


--
-- Name: idx_sharing_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sharing_recipient ON public.report_sharing USING btree (recipient_user);


--
-- Name: idx_sharing_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sharing_report ON public.report_sharing USING btree (report_id);


--
-- Name: idx_sharing_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sharing_token ON public.report_sharing USING btree (share_token);


--
-- Name: idx_sub_compliance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_compliance ON public.compliance_submissions USING btree (compliance_id);


--
-- Name: idx_sub_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_status ON public.compliance_submissions USING btree (status);


--
-- Name: idx_subscriptions_rpt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_rpt ON public.report_subscriptions USING btree (report_id);


--
-- Name: idx_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user ON public.report_subscriptions USING btree (user_id);


--
-- Name: idx_sysmet_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sysmet_recorded ON public.system_metrics USING btree (recorded_at);


--
-- Name: idx_sysmet_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sysmet_tenant ON public.system_metrics USING btree (tenant_id);


--
-- Name: idx_tasks_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_next_run ON public.scheduled_tasks USING btree (next_run_at);


--
-- Name: idx_tasks_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_report ON public.scheduled_tasks USING btree (report_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.scheduled_tasks USING btree (status);


--
-- Name: idx_tasks_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_tenant ON public.scheduled_tasks USING btree (tenant_id);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_teams_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_tenant ON public.teams USING btree (tenant_id);


--
-- Name: idx_tenant_subs_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_subs_plan ON public.tenant_subscriptions USING btree (plan_id);


--
-- Name: idx_tenant_subs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_subs_status ON public.tenant_subscriptions USING btree (status);


--
-- Name: idx_tenant_subs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_subs_tenant ON public.tenant_subscriptions USING btree (tenant_id);


--
-- Name: idx_themes_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_themes_tenant ON public.report_themes USING btree (tenant_id);


--
-- Name: idx_translations_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_key ON public.translations USING btree (translation_key);


--
-- Name: idx_translations_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_lang ON public.translations USING btree (language_code);


--
-- Name: idx_trend_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trend_report ON public.trend_analysis USING btree (report_id);


--
-- Name: idx_uploads_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_report ON public.data_uploads USING btree (report_id);


--
-- Name: idx_uploads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_status ON public.data_uploads USING btree (upload_status);


--
-- Name: idx_uploads_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_tenant ON public.data_uploads USING btree (tenant_id);


--
-- Name: idx_usage_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_module ON public.usage_metrics USING btree (module);


--
-- Name: idx_usage_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_recorded ON public.usage_metrics USING btree (recorded_at);


--
-- Name: idx_usage_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tenant ON public.usage_metrics USING btree (tenant_id);


--
-- Name: idx_user_devices_trusted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_devices_trusted ON public.user_devices USING btree (is_trusted);


--
-- Name: idx_user_devices_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_devices_user ON public.user_devices USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role_id);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: idx_view_logs_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_report ON public.report_view_logs USING btree (report_id);


--
-- Name: idx_view_logs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_tenant ON public.report_view_logs USING btree (tenant_id);


--
-- Name: idx_view_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_user ON public.report_view_logs USING btree (user_id);


--
-- Name: idx_view_logs_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_viewed_at ON public.report_view_logs USING btree (viewed_at);


--
-- Name: api_usage_logs trg_api_usage_update_last_used; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_api_usage_update_last_used AFTER INSERT ON public.api_usage_logs FOR EACH ROW EXECUTE FUNCTION public.update_api_key_usage();


--
-- Name: dashboards trg_dashboards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dashboards_updated_at BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_sources trg_data_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: localization trg_localization_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_localization_updated_at BEFORE UPDATE ON public.localization FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: preferences trg_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_preferences_updated_at BEFORE UPDATE ON public.preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles trg_prevent_system_role_deletion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_system_role_deletion BEFORE DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.prevent_system_role_deletion();


--
-- Name: report_run_history trg_report_run_history_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_report_run_history_log AFTER INSERT ON public.report_run_history FOR EACH ROW EXECUTE FUNCTION public.log_report_run();


--
-- Name: reports_master trg_reports_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reports_master_updated_at BEFORE UPDATE ON public.reports_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions trg_session_update_last_login; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_session_update_last_login AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_user_last_login();


--
-- Name: tenants trg_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users trg_users_email_validation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_email_validation BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.validate_email();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: ai_insights ai_insights_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.forecast_models(model_id) ON DELETE SET NULL;


--
-- Name: ai_insights ai_insights_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: ai_insights ai_insights_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: alert_logs alert_logs_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_logs
    ADD CONSTRAINT alert_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: alert_logs alert_logs_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_logs
    ADD CONSTRAINT alert_logs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(rule_id) ON DELETE CASCADE;


--
-- Name: alert_logs alert_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_logs
    ADD CONSTRAINT alert_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: alert_rules alert_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: alert_rules alert_rules_kpi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.report_kpis(kpi_id) ON DELETE CASCADE;


--
-- Name: alert_rules alert_rules_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: alert_rules alert_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: announcements announcements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: anomaly_logs anomaly_logs_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_logs
    ADD CONSTRAINT anomaly_logs_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.ai_insights(insight_id) ON DELETE CASCADE;


--
-- Name: anomaly_logs anomaly_logs_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_logs
    ADD CONSTRAINT anomaly_logs_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: anomaly_logs anomaly_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_logs
    ADD CONSTRAINT anomaly_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: api_usage_logs api_usage_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(api_key_id) ON DELETE SET NULL;


--
-- Name: api_usage_logs api_usage_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: api_usage_logs api_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: approval_steps approval_steps_approver_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_approver_role_id_fkey FOREIGN KEY (approver_role_id) REFERENCES public.roles(role_id) ON DELETE SET NULL;


--
-- Name: approval_steps approval_steps_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: approval_steps approval_steps_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(workflow_id) ON DELETE CASCADE;


--
-- Name: approval_workflows approval_workflows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: approval_workflows approval_workflows_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: approval_workflows approval_workflows_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: approval_workflows approval_workflows_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: attachments attachments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: attachments attachments_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.data_uploads(upload_id) ON DELETE CASCADE;


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: benchmarking_data benchmarking_data_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarking_data
    ADD CONSTRAINT benchmarking_data_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: benchmarking_data benchmarking_data_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarking_data
    ADD CONSTRAINT benchmarking_data_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: benchmarking_data benchmarking_data_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmarking_data
    ADD CONSTRAINT benchmarking_data_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: billing_accounts billing_accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_accounts
    ADD CONSTRAINT billing_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: blockchain_audit blockchain_audit_compliance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blockchain_audit
    ADD CONSTRAINT blockchain_audit_compliance_id_fkey FOREIGN KEY (compliance_id) REFERENCES public.compliance_calendar(compliance_id) ON DELETE CASCADE;


--
-- Name: chat_feedback chat_feedback_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.chat_responses(response_id) ON DELETE CASCADE;


--
-- Name: chat_feedback chat_feedback_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE;


--
-- Name: chat_queries chat_queries_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_queries
    ADD CONSTRAINT chat_queries_intent_id_fkey FOREIGN KEY (intent_id) REFERENCES public.chat_intents(intent_id) ON DELETE SET NULL;


--
-- Name: chat_queries chat_queries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_queries
    ADD CONSTRAINT chat_queries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE;


--
-- Name: chat_responses chat_responses_query_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_responses
    ADD CONSTRAINT chat_responses_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.chat_queries(query_id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: compliance_audit compliance_audit_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_audit
    ADD CONSTRAINT compliance_audit_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: compliance_audit compliance_audit_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_audit
    ADD CONSTRAINT compliance_audit_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.compliance_submissions(submission_id) ON DELETE CASCADE;


--
-- Name: compliance_calendar compliance_calendar_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_calendar
    ADD CONSTRAINT compliance_calendar_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: compliance_calendar compliance_calendar_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_calendar
    ADD CONSTRAINT compliance_calendar_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.compliance_rules(rule_id) ON DELETE SET NULL;


--
-- Name: compliance_calendar compliance_calendar_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_calendar
    ADD CONSTRAINT compliance_calendar_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: compliance_documents compliance_documents_compliance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_documents
    ADD CONSTRAINT compliance_documents_compliance_id_fkey FOREIGN KEY (compliance_id) REFERENCES public.compliance_calendar(compliance_id) ON DELETE CASCADE;


--
-- Name: compliance_documents compliance_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_documents
    ADD CONSTRAINT compliance_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: compliance_rules compliance_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_rules
    ADD CONSTRAINT compliance_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: compliance_submissions compliance_submissions_compliance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT compliance_submissions_compliance_id_fkey FOREIGN KEY (compliance_id) REFERENCES public.compliance_calendar(compliance_id) ON DELETE CASCADE;


--
-- Name: compliance_submissions compliance_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT compliance_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: connector_sync_logs connector_sync_logs_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_logs
    ADD CONSTRAINT connector_sync_logs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(source_id) ON DELETE CASCADE;


--
-- Name: connector_sync_logs connector_sync_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_logs
    ADD CONSTRAINT connector_sync_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: correlation_matrix correlation_matrix_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correlation_matrix
    ADD CONSTRAINT correlation_matrix_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.ai_insights(insight_id) ON DELETE CASCADE;


--
-- Name: correlation_matrix correlation_matrix_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correlation_matrix
    ADD CONSTRAINT correlation_matrix_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: countries countries_currency_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES public.currencies(currency_code);


--
-- Name: countries countries_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(region_id) ON DELETE SET NULL;


--
-- Name: custom_report_definitions custom_report_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_report_definitions
    ADD CONSTRAINT custom_report_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: custom_report_definitions custom_report_definitions_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_report_definitions
    ADD CONSTRAINT custom_report_definitions_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: custom_report_definitions custom_report_definitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_report_definitions
    ADD CONSTRAINT custom_report_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: dashboard_widgets dashboard_widgets_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT dashboard_widgets_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.dashboards(dashboard_id) ON DELETE CASCADE;


--
-- Name: dashboard_widgets dashboard_widgets_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT dashboard_widgets_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: dashboards dashboards_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: dashboards dashboards_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: dashboards dashboards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: data_consent data_consent_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent
    ADD CONSTRAINT data_consent_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_consent data_consent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent
    ADD CONSTRAINT data_consent_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: data_ingestion_logs data_ingestion_logs_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_ingestion_logs
    ADD CONSTRAINT data_ingestion_logs_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.data_uploads(upload_id) ON DELETE CASCADE;


--
-- Name: data_lineage data_lineage_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_lineage
    ADD CONSTRAINT data_lineage_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: data_lineage data_lineage_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_lineage
    ADD CONSTRAINT data_lineage_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(source_id) ON DELETE SET NULL;


--
-- Name: data_lineage data_lineage_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_lineage
    ADD CONSTRAINT data_lineage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_masking_rules data_masking_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_masking_rules
    ADD CONSTRAINT data_masking_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: data_masking_rules data_masking_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_masking_rules
    ADD CONSTRAINT data_masking_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_quality_scores data_quality_scores_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_scores
    ADD CONSTRAINT data_quality_scores_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.data_uploads(upload_id) ON DELETE CASCADE;


--
-- Name: data_retention_policies data_retention_policies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: data_retention_policies data_retention_policies_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: data_retention_policies data_retention_policies_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: data_retention_policies data_retention_policies_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_sources data_sources_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_uploads data_uploads_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: data_uploads data_uploads_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: data_uploads data_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: data_validation_rules data_validation_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_validation_rules
    ADD CONSTRAINT data_validation_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: deployment_logs deployment_logs_deployed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_logs
    ADD CONSTRAINT deployment_logs_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: distribution_lists distribution_lists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_lists
    ADD CONSTRAINT distribution_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: distribution_lists distribution_lists_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_lists
    ADD CONSTRAINT distribution_lists_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: distribution_lists distribution_lists_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_lists
    ADD CONSTRAINT distribution_lists_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: distribution_members distribution_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members
    ADD CONSTRAINT distribution_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: distribution_members distribution_members_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members
    ADD CONSTRAINT distribution_members_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.distribution_lists(list_id) ON DELETE CASCADE;


--
-- Name: distribution_members distribution_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_members
    ADD CONSTRAINT distribution_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: email_queue email_queue_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(template_id) ON DELETE SET NULL;


--
-- Name: email_queue email_queue_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: error_logs error_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: esg_scores esg_scores_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_scores
    ADD CONSTRAINT esg_scores_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: etl_jobs etl_jobs_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_jobs
    ADD CONSTRAINT etl_jobs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(source_id) ON DELETE SET NULL;


--
-- Name: etl_jobs etl_jobs_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_jobs
    ADD CONSTRAINT etl_jobs_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.data_uploads(upload_id) ON DELETE SET NULL;


--
-- Name: exchange_rates exchange_rates_from_currency_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_fkey FOREIGN KEY (from_currency) REFERENCES public.currencies(currency_code);


--
-- Name: exchange_rates exchange_rates_to_currency_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_to_currency_fkey FOREIGN KEY (to_currency) REFERENCES public.currencies(currency_code);


--
-- Name: executive_narratives executive_narratives_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executive_narratives
    ADD CONSTRAINT executive_narratives_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: executive_narratives executive_narratives_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executive_narratives
    ADD CONSTRAINT executive_narratives_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: executive_narratives executive_narratives_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executive_narratives
    ADD CONSTRAINT executive_narratives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: export_history export_history_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_history
    ADD CONSTRAINT export_history_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: export_history export_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_history
    ADD CONSTRAINT export_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: export_history export_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_history
    ADD CONSTRAINT export_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: export_templates export_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_templates
    ADD CONSTRAINT export_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: export_templates export_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_templates
    ADD CONSTRAINT export_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: external_feeds external_feeds_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_feeds
    ADD CONSTRAINT external_feeds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: feature_flags feature_flags_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: feature_flags feature_flags_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: fiscal_calendars fiscal_calendars_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_calendars
    ADD CONSTRAINT fiscal_calendars_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_data fk_rd_source; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_data
    ADD CONSTRAINT fk_rd_source FOREIGN KEY (source_id) REFERENCES public.data_sources(source_id) ON DELETE SET NULL;


--
-- Name: role_permissions fk_rp_granted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_rp_granted_by FOREIGN KEY (granted_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: forecast_models forecast_models_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: forecast_models forecast_models_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: gdpr_requests gdpr_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: gdpr_requests gdpr_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: gdpr_requests gdpr_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: integration_logs integration_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: ip_allowlist ip_allowlist_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist
    ADD CONSTRAINT ip_allowlist_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: ip_allowlist ip_allowlist_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist
    ADD CONSTRAINT ip_allowlist_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: job_queue job_queue_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_queue
    ADD CONSTRAINT job_queue_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: kpi_benchmarks kpi_benchmarks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_benchmarks
    ADD CONSTRAINT kpi_benchmarks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: kpi_benchmarks kpi_benchmarks_kpi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_benchmarks
    ADD CONSTRAINT kpi_benchmarks_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.report_kpis(kpi_id) ON DELETE CASCADE;


--
-- Name: kpi_history kpi_history_kpi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_history
    ADD CONSTRAINT kpi_history_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.report_kpis(kpi_id) ON DELETE CASCADE;


--
-- Name: kpi_history kpi_history_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_history
    ADD CONSTRAINT kpi_history_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.report_run_history(run_id) ON DELETE SET NULL;


--
-- Name: kpi_history kpi_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_history
    ADD CONSTRAINT kpi_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: llm_usage_logs llm_usage_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage_logs
    ADD CONSTRAINT llm_usage_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: llm_usage_logs llm_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage_logs
    ADD CONSTRAINT llm_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: localization localization_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localization
    ADD CONSTRAINT localization_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: message_streams message_streams_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_streams
    ADD CONSTRAINT message_streams_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: metric_definitions metric_definitions_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_definitions
    ADD CONSTRAINT metric_definitions_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: metric_definitions metric_definitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_definitions
    ADD CONSTRAINT metric_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: mfa_settings mfa_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_settings
    ADD CONSTRAINT mfa_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: model_training_history model_training_history_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_training_history
    ADD CONSTRAINT model_training_history_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.forecast_models(model_id) ON DELETE CASCADE;


--
-- Name: model_training_history model_training_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_training_history
    ADD CONSTRAINT model_training_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(rule_id) ON DELETE SET NULL;


--
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: oauth_providers oauth_providers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_providers
    ADD CONSTRAINT oauth_providers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: partner_integrations partner_integrations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_integrations
    ADD CONSTRAINT partner_integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(plan_id) ON DELETE CASCADE;


--
-- Name: preferences preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: rate_limit_config rate_limit_config_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_config
    ADD CONSTRAINT rate_limit_config_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(plan_id) ON DELETE CASCADE;


--
-- Name: rate_limit_config rate_limit_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_config
    ADD CONSTRAINT rate_limit_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: recommendations recommendations_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.ai_insights(insight_id) ON DELETE CASCADE;


--
-- Name: recommendations recommendations_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: regions regions_parent_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_parent_region_id_fkey FOREIGN KEY (parent_region_id) REFERENCES public.regions(region_id) ON DELETE SET NULL;


--
-- Name: regulatory_contacts regulatory_contacts_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_contacts
    ADD CONSTRAINT regulatory_contacts_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.compliance_rules(rule_id) ON DELETE CASCADE;


--
-- Name: regulatory_contacts regulatory_contacts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_contacts
    ADD CONSTRAINT regulatory_contacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_access_policies report_access_policies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_access_policies report_access_policies_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_access_policies report_access_policies_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- Name: report_access_policies report_access_policies_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(team_id) ON DELETE CASCADE;


--
-- Name: report_access_policies report_access_policies_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_access_policies report_access_policies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_access_policies
    ADD CONSTRAINT report_access_policies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_annotations report_annotations_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_annotations
    ADD CONSTRAINT report_annotations_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_annotations report_annotations_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_annotations
    ADD CONSTRAINT report_annotations_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.report_run_history(run_id) ON DELETE CASCADE;


--
-- Name: report_annotations report_annotations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_annotations
    ADD CONSTRAINT report_annotations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_annotations report_annotations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_annotations
    ADD CONSTRAINT report_annotations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_approvals report_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals
    ADD CONSTRAINT report_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_approvals report_approvals_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals
    ADD CONSTRAINT report_approvals_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_approvals report_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals
    ADD CONSTRAINT report_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_approvals report_approvals_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals
    ADD CONSTRAINT report_approvals_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.report_run_history(run_id) ON DELETE CASCADE;


--
-- Name: report_approvals report_approvals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_approvals
    ADD CONSTRAINT report_approvals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_bookmarks report_bookmarks_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_bookmarks report_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_comments report_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.report_comments(comment_id) ON DELETE CASCADE;


--
-- Name: report_comments report_comments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_comments report_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_data report_data_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_data
    ADD CONSTRAINT report_data_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_data report_data_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_data
    ADD CONSTRAINT report_data_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_data report_data_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_data
    ADD CONSTRAINT report_data_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_fields report_fields_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_fields
    ADD CONSTRAINT report_fields_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE CASCADE;


--
-- Name: report_fields report_fields_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_fields
    ADD CONSTRAINT report_fields_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(source_id) ON DELETE SET NULL;


--
-- Name: report_filters report_filters_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_filters
    ADD CONSTRAINT report_filters_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_join_definitions report_join_definitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_join_definitions
    ADD CONSTRAINT report_join_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_kpis report_kpis_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_kpis
    ADD CONSTRAINT report_kpis_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_run_history report_run_history_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history
    ADD CONSTRAINT report_run_history_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_run_history report_run_history_result_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history
    ADD CONSTRAINT report_run_history_result_data_id_fkey FOREIGN KEY (result_data_id) REFERENCES public.report_data(data_id) ON DELETE SET NULL;


--
-- Name: report_run_history report_run_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history
    ADD CONSTRAINT report_run_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.scheduled_tasks(task_id) ON DELETE SET NULL;


--
-- Name: report_run_history report_run_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history
    ADD CONSTRAINT report_run_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_run_history report_run_history_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_run_history
    ADD CONSTRAINT report_run_history_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_sharing report_sharing_recipient_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing
    ADD CONSTRAINT report_sharing_recipient_user_fkey FOREIGN KEY (recipient_user) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_sharing report_sharing_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing
    ADD CONSTRAINT report_sharing_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_sharing report_sharing_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing
    ADD CONSTRAINT report_sharing_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_sharing report_sharing_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sharing
    ADD CONSTRAINT report_sharing_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_subscriptions report_subscriptions_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT report_subscriptions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_subscriptions report_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT report_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_tags report_tags_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tags
    ADD CONSTRAINT report_tags_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_templates report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_templates report_templates_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_themes report_themes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_themes
    ADD CONSTRAINT report_themes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_themes report_themes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_themes
    ADD CONSTRAINT report_themes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_versions report_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_versions
    ADD CONSTRAINT report_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_versions report_versions_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_versions
    ADD CONSTRAINT report_versions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_view_logs report_view_logs_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_view_logs
    ADD CONSTRAINT report_view_logs_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.dashboards(dashboard_id) ON DELETE SET NULL;


--
-- Name: report_view_logs report_view_logs_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_view_logs
    ADD CONSTRAINT report_view_logs_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: report_view_logs report_view_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_view_logs
    ADD CONSTRAINT report_view_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: report_view_logs report_view_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_view_logs
    ADD CONSTRAINT report_view_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: reports_master reports_master_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_master
    ADD CONSTRAINT reports_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: reports_master reports_master_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_master
    ADD CONSTRAINT reports_master_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id);


--
-- Name: role_permissions role_permissions_perm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_perm_id_fkey FOREIGN KEY (perm_id) REFERENCES public.permissions(perm_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- Name: roles roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: saved_filters saved_filters_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: saved_filters saved_filters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: scenario_simulations scenario_simulations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_simulations
    ADD CONSTRAINT scenario_simulations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scenario_simulations scenario_simulations_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_simulations
    ADD CONSTRAINT scenario_simulations_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.ai_insights(insight_id) ON DELETE CASCADE;


--
-- Name: scenario_simulations scenario_simulations_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_simulations
    ADD CONSTRAINT scenario_simulations_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: scenario_simulations scenario_simulations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_simulations
    ADD CONSTRAINT scenario_simulations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: scheduled_tasks scheduled_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scheduled_tasks scheduled_tasks_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: scheduled_tasks scheduled_tasks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: scorecard_definitions scorecard_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_definitions
    ADD CONSTRAINT scorecard_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scorecard_definitions scorecard_definitions_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_definitions
    ADD CONSTRAINT scorecard_definitions_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: scorecard_definitions scorecard_definitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_definitions
    ADD CONSTRAINT scorecard_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: scorecard_kpis scorecard_kpis_kpi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_kpis
    ADD CONSTRAINT scorecard_kpis_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.report_kpis(kpi_id) ON DELETE CASCADE;


--
-- Name: scorecard_kpis scorecard_kpis_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_kpis
    ADD CONSTRAINT scorecard_kpis_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecard_definitions(scorecard_id) ON DELETE CASCADE;


--
-- Name: search_history search_history_selected_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_selected_report_id_fkey FOREIGN KEY (selected_report_id) REFERENCES public.reports_master(report_id) ON DELETE SET NULL;


--
-- Name: search_history search_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: security_events security_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: settings settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: settings settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: source_mappings source_mappings_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_mappings
    ADD CONSTRAINT source_mappings_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: source_mappings source_mappings_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_mappings
    ADD CONSTRAINT source_mappings_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(source_id) ON DELETE CASCADE;


--
-- Name: system_metrics system_metrics_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics
    ADD CONSTRAINT system_metrics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: task_history task_history_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_history
    ADD CONSTRAINT task_history_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.workflow_instances(instance_id) ON DELETE SET NULL;


--
-- Name: task_history task_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_history
    ADD CONSTRAINT task_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.scheduled_tasks(task_id) ON DELETE CASCADE;


--
-- Name: team_members team_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(team_id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: teams teams_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE SET NULL;


--
-- Name: teams teams_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_invitations tenant_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: tenant_invitations tenant_invitations_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE SET NULL;


--
-- Name: tenant_invitations tenant_invitations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_subscriptions tenant_subscriptions_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: tenant_subscriptions tenant_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(plan_id);


--
-- Name: tenant_subscriptions tenant_subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: trend_analysis trend_analysis_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trend_analysis
    ADD CONSTRAINT trend_analysis_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.ai_insights(insight_id) ON DELETE CASCADE;


--
-- Name: trend_analysis trend_analysis_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trend_analysis
    ADD CONSTRAINT trend_analysis_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports_master(report_id) ON DELETE CASCADE;


--
-- Name: upload_validation_rules upload_validation_rules_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_validation_rules
    ADD CONSTRAINT upload_validation_rules_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.data_validation_rules(rule_id) ON DELETE CASCADE;


--
-- Name: upload_validation_rules upload_validation_rules_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_validation_rules
    ADD CONSTRAINT upload_validation_rules_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.data_uploads(upload_id) ON DELETE CASCADE;


--
-- Name: usage_metrics usage_metrics_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_metrics
    ADD CONSTRAINT usage_metrics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE SET NULL;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: webhooks webhooks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: workflow_definitions workflow_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: workflow_definitions workflow_definitions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.scheduled_tasks(task_id) ON DELETE SET NULL;


--
-- Name: workflow_definitions workflow_definitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: workflow_instances workflow_instances_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(workflow_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict IpVuyKCBNEkR3VK3ateefP9EwdQOfNsusbUlUusHbsMhkigFjpVX8kteUr3DyXz

