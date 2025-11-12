# Healthcare Production Requirements & Best Practices

**Last Updated:** 2025-11-10
**Application:** AngstromSCD (Sickle Cell Disease Research Platform)
**Tech Stack:** Node.js, React, Supabase (PostgreSQL), BoundaryML (BAML)

This document provides comprehensive, actionable guidance for building a production-ready medical/healthcare application based on current industry standards, regulatory requirements, and successful real-world implementations.

---

## Table of Contents

1. [HIPAA Compliance Requirements](#1-hipaa-compliance-requirements)
2. [Medical Application Security](#2-medical-application-security)
3. [Clinical Data Standards](#3-clinical-data-standards)
4. [Production Deployment Best Practices](#4-production-deployment-best-practices)
5. [Testing Requirements](#5-testing-requirements)
6. [AI/ML in Healthcare](#6-aiml-in-healthcare)
7. [Supabase-Specific Implementation](#7-supabase-specific-implementation)
8. [Quick Reference Checklist](#8-quick-reference-checklist)
9. [Resources & Citations](#9-resources--citations)

---

## 1. HIPAA Compliance Requirements

### 1.1 Overview

HIPAA (Health Insurance Portability and Accountability Act) compliance is **mandatory** for any application handling Protected Health Information (PHI) in the United States. The 2025 HIPAA Security Rule updates (published January 6, 2025) represent the most significant changes to healthcare cybersecurity requirements in over two decades.

**Authority Level:** Federal Law (Mandatory)
**Applicable To:** AngstromSCD (handles patient SCD data, VOE episodes, medical records)

### 1.2 PHI Handling Best Practices

#### What Constitutes PHI?

Protected Health Information includes:
- Patient names, dates of birth, addresses
- Medical record numbers (MRNs)
- Diagnoses (e.g., Sickle Cell Disease status)
- Treatment information (e.g., Hydroxyurea dosing)
- Vaso-Occlusive Episode (VOE) records
- Clinical observations and test results
- Any identifiable health information

#### Core Principles (MUST HAVE)

1. **Minimum Necessary Standard**
   - Only access/transmit the minimum PHI needed for the specific task
   - Implement role-based data filtering at the application layer
   - Log all PHI access with justification

2. **Data Segregation**
   - Store PHI in separate database tables/schemas from non-PHI data
   - Use database-level row-level security (RLS) policies
   - Implement data tagging to identify PHI fields

3. **De-identification When Possible**
   - Use de-identified data for analytics, research, and development
   - Implement Safe Harbor or Expert Determination methods
   - Consider pseudonymization for internal identifiers

**Implementation in AngstromSCD:**
```typescript
// Example: Minimum necessary data retrieval
// apps/api/src/routes/patients.ts
app.get('/api/patients/:id/voe-risk', async (c) => {
  const userId = c.get('userId'); // From auth middleware

  // Only return fields necessary for VOE risk calculation
  const patient = await db
    .from('scd_patients')
    .select('id, age, genotype, recent_voe_count')
    .eq('id', patientId)
    .single();

  // Audit log PHI access
  await logPHIAccess({
    userId,
    resource: 'scd_patients',
    action: 'read',
    patientId,
    purpose: 'voe_risk_assessment',
    timestamp: new Date(),
  });

  return c.json(patient);
});
```

### 1.3 Data Encryption Requirements

#### Encryption at Rest (REQUIRED as of 2025)

**Standard:** AES-256 encryption
**Authority:** NIST recommendations, 2025 HIPAA Security Rule updates

**Implementation:**
- **Database:** Enable Transparent Data Encryption (TDE) on PostgreSQL
- **File Storage:** Encrypt files before storing in S3/blob storage
- **Backups:** Ensure all backups are encrypted

**Supabase Implementation:**
```sql
-- Enable encryption for specific columns (high-sensitivity PHI)
-- Execute in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt patient SSN or MRN
ALTER TABLE scd_patients
  ADD COLUMN encrypted_mrn BYTEA;

-- Application-level encryption before storage
-- apps/api/src/lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY!; // 32-byte key
const ALGORITHM = 'aes-256-gcm';

export function encryptPHI(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptPHI(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### Encryption in Transit (REQUIRED)

**Standard:** TLS 1.2 minimum, TLS 1.3 recommended
**Authority:** HIPAA Security Rule

**Requirements:**
- All HTTP traffic must use HTTPS
- API endpoints must reject non-TLS connections
- WebSocket connections (if used) must use WSS
- Disable TLS 1.0 and 1.1 (deprecated)

**Implementation:**
```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono();

// Enforce HTTPS in production
app.use('*', async (c, next) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = c.req.header('x-forwarded-proto');
    if (proto !== 'https') {
      return c.redirect(`https://${c.req.header('host')}${c.req.url}`);
    }
  }
  await next();
});

// Apply security headers
app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", process.env.API_URL!],
  },
}));
```

### 1.4 Access Controls and Audit Logging

#### Role-Based Access Control (RBAC) - REQUIRED

**Roles for AngstromSCD:**
- **Patient:** Access own records only
- **Clinician:** Access assigned patients, read/write clinical data
- **Researcher:** Access de-identified data, read-only literature
- **Administrator:** Manage users, system configuration (no direct PHI access)

**Implementation:**
```typescript
// apps/api/src/middleware/rbac.ts
export const roles = {
  PATIENT: 'patient',
  CLINICIAN: 'clinician',
  RESEARCHER: 'researcher',
  ADMIN: 'admin',
} as const;

export const permissions = {
  READ_OWN_PHI: [roles.PATIENT],
  READ_PATIENT_PHI: [roles.CLINICIAN],
  WRITE_PATIENT_PHI: [roles.CLINICIAN],
  READ_DEIDENTIFIED_DATA: [roles.RESEARCHER, roles.CLINICIAN],
  MANAGE_USERS: [roles.ADMIN],
} as const;

export function requirePermission(permission: keyof typeof permissions) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const allowedRoles = permissions[permission];

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await next();
  };
}

// Usage in routes
app.get('/api/patients/:id', requirePermission('READ_PATIENT_PHI'), async (c) => {
  // Handler code
});
```

#### Audit Logging - REQUIRED

**What to Log (Minimum):**
- Who (user ID, role)
- What (action: create, read, update, delete)
- When (timestamp with timezone)
- Where (resource type, resource ID)
- Why (purpose/reason for access)
- Result (success/failure, error codes)

**HIPAA Requirement:** Logs must be retained for 6 years minimum (some states require 10 years)

**Implementation:**
```typescript
// apps/api/src/lib/audit-log.ts
import { createClient } from '@supabase/supabase-js';

interface AuditLogEntry {
  user_id: string;
  user_role: string;
  action: 'create' | 'read' | 'update' | 'delete';
  resource_type: string;
  resource_id: string;
  purpose?: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  error_message?: string;
  timestamp: Date;
}

export async function logPHIAccess(entry: AuditLogEntry) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for audit logs
  );

  await supabase.from('audit_logs').insert({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  });

  // Also log to external SIEM if configured
  if (process.env.SIEM_ENDPOINT) {
    await fetch(process.env.SIEM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  }
}

// Middleware for automatic audit logging
export function auditMiddleware(resourceType: string) {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    let status: 'success' | 'failure' = 'success';
    let errorMessage: string | undefined;

    try {
      await next();
    } catch (error) {
      status = 'failure';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const user = c.get('user');
      const action = methodToAction(c.req.method);

      await logPHIAccess({
        user_id: user.id,
        user_role: user.role,
        action,
        resource_type: resourceType,
        resource_id: c.req.param('id') || 'N/A',
        ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        user_agent: c.req.header('user-agent') || 'unknown',
        status,
        error_message: errorMessage,
        timestamp: new Date(),
      });
    }
  };
}

function methodToAction(method: string): AuditLogEntry['action'] {
  switch (method) {
    case 'GET': return 'read';
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'read';
  }
}
```

**Database Schema:**
```sql
-- Execute in Supabase SQL Editor
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  purpose TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance and compliance queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Row Level Security: Only admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Service role can always insert (bypasses RLS)
```

### 1.5 Business Associate Agreements (BAA)

**Requirement:** All third-party services that handle PHI must sign a BAA

#### Required Services for AngstromSCD:

| Service | Handles PHI? | BAA Required? | Status |
|---------|--------------|---------------|--------|
| **Supabase** | Yes (database stores patient data) | Yes | Available on Team Plan+ |
| **OpenAI** | Yes (if PHI in prompts) | Yes | Available on Enterprise |
| **Anthropic** | Yes (if PHI in prompts) | Yes | Available on request |
| **Hosting Provider** (AWS/GCP/Azure) | Yes (infrastructure) | Yes | Standard offering |
| **Analytics** (e.g., PostHog) | No (de-identified only) | No | N/A |
| **Error Tracking** (e.g., Sentry) | No (must redact PHI) | No | N/A |

**CRITICAL:** Do not send PHI to AI models unless:
1. BAA is in place with the AI provider
2. Data is de-identified before sending
3. User has explicitly consented to AI processing

**Implementation:**
```typescript
// packages/baml/src/services/phi-filter.ts
import { encryptPHI } from './encryption';

/**
 * Redact PHI from text before sending to LLMs without BAA
 */
export function redactPHI(text: string): string {
  // Remove common PHI patterns
  let redacted = text;

  // Names (simple pattern - consider using NER model for production)
  redacted = redacted.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME_REDACTED]');

  // Dates
  redacted = redacted.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[DATE_REDACTED]');

  // MRNs (assuming format like MRN-123456)
  redacted = redacted.replace(/\bMRN-?\d+\b/gi, '[MRN_REDACTED]');

  // Phone numbers
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');

  // Email addresses
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');

  return redacted;
}

/**
 * Check if BAA is in place for AI provider
 */
export function hasBAA(provider: 'openai' | 'anthropic' | 'ollama'): boolean {
  // Ollama (local) doesn't need BAA
  if (provider === 'ollama') return true;

  // Check environment variables for BAA confirmation
  const baaConfirmed = process.env[`${provider.toUpperCase()}_BAA_CONFIRMED`] === 'true';

  if (!baaConfirmed) {
    console.warn(`WARNING: No BAA confirmed for ${provider}. PHI will be redacted.`);
  }

  return baaConfirmed;
}

// Usage in BAML service
export async function sendToLLM(prompt: string, provider: string) {
  let processedPrompt = prompt;

  if (!hasBAA(provider as any)) {
    processedPrompt = redactPHI(prompt);
  }

  // Send to LLM
  return await callLLM(processedPrompt, provider);
}
```

### 1.6 2025 HIPAA Security Rule Updates

**Published:** January 6, 2025 (Federal Register)
**Impact:** High - New mandatory requirements

#### Key Changes:

1. **Multi-Factor Authentication (MFA) - NOW MANDATORY**
   - Required for all systems accessing ePHI
   - Implementation deadline: TBD (check final rule)

2. **Encryption - NOW REQUIRED (was "addressable")**
   - Data at rest: AES-256
   - Data in transit: TLS 1.2+

3. **Vulnerability Scanning - INCREASED FREQUENCY**
   - Was: Annual recommended
   - Now: Every 6 months mandatory

4. **Penetration Testing - NOW MANDATORY**
   - Annual penetration testing required
   - Must be performed by qualified professionals

5. **Network Segmentation - REQUIRED**
   - Separate PHI systems from other networks
   - Implement VLANs or virtual network segmentation

**Action Items for AngstromSCD:**
- [ ] Implement MFA for all user accounts (use Supabase Auth MFA)
- [ ] Schedule bi-annual vulnerability scans
- [ ] Contract annual penetration testing
- [ ] Document network architecture and segmentation
- [ ] Update policies and procedures

---

## 2. Medical Application Security

### 2.1 Authentication Patterns

#### Recommended: OAuth 2.0 + OpenID Connect (OIDC)

**Why:** Industry standard, supports SSO, federated identity, MFA

**Implementation with Supabase Auth:**
```typescript
// apps/api/src/middleware/auth.ts
import { createClient } from '@supabase/supabase-js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Attach user to context
  c.set('user', user);
  c.set('supabase', supabase);

  await next();
}
```

**Frontend Implementation:**
```typescript
// apps/frontend/src/lib/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// Sign in with email/password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Enable MFA (REQUIRED for HIPAA 2025)
export async function enrollMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });

  if (error) throw error;

  // Return QR code for user to scan with authenticator app
  return data;
}

// Verify MFA challenge
export async function verifyMFA(factorId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    code,
  });

  if (error) throw error;
  return data;
}
```

#### Token Management Best Practices

**Access Token Expiry:** 15-60 minutes (recommended: 30 minutes)
**Refresh Token Expiry:** 7-30 days
**Token Storage:**
- Frontend: HTTPOnly cookies (preferred) or sessionStorage (never localStorage for PHI apps)
- Backend: Redis for session management

```typescript
// apps/frontend/src/lib/token-manager.ts
export class TokenManager {
  private static REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 min before expiry

  static async getValidToken(): Promise<string> {
    const session = await supabase.auth.getSession();

    if (!session.data.session) {
      throw new Error('No active session');
    }

    const expiresAt = session.data.session.expires_at! * 1000;
    const now = Date.now();

    // Refresh if token expires soon
    if (expiresAt - now < this.REFRESH_BUFFER) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data.session!.access_token;
    }

    return session.data.session.access_token;
  }
}
```

### 2.2 Password Security

**Standards:**
- Minimum 12 characters (healthcare-specific recommendation)
- Require mix of uppercase, lowercase, numbers, symbols
- Password history: prevent reuse of last 5 passwords
- Account lockout: 5 failed attempts, 15-minute lockout
- Password expiry: 90 days (HIPAA recommendation)

**Implementation:**
```typescript
// Supabase password policy (configured in Supabase dashboard)
// Or enforce in application layer:

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special characters');
  }

  // Check against common passwords (use library like zxcvbn in production)
  const commonPasswords = ['Password123!', 'Healthcare1!', 'Admin1234!'];
  if (commonPasswords.includes(password)) {
    errors.push('Password is too common');
  }

  return { valid: errors.length === 0, errors };
}
```

### 2.3 Security Testing and Vulnerability Scanning

#### Vulnerability Scanning - REQUIRED (every 6 months)

**Tools:**
- **OWASP Dependency-Check:** Scan Node.js dependencies for known vulnerabilities
- **npm audit / bun audit:** Built-in dependency vulnerability scanning
- **Snyk:** Commercial option with better vulnerability database

**Implementation:**
```bash
# Add to package.json scripts
{
  "scripts": {
    "security:audit": "bun audit",
    "security:check": "bun run security:audit && bun run security:scan",
    "security:scan": "npx @owasp/dependency-check --project AngstromSCD --scan ."
  }
}

# Run in CI/CD pipeline
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 1 */6 *' # Every 6 months
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run dependency audit
        run: bun audit --production

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'AngstromSCD'
          path: '.'
          format: 'HTML'

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: security-scan-results
          path: dependency-check-report.html
```

#### Penetration Testing - REQUIRED (annually)

**When to Perform:**
- Before initial production deployment
- Annually thereafter
- After major architectural changes
- After security incidents

**What to Test:**
- Authentication/authorization bypass
- SQL injection, XSS, CSRF
- API security (rate limiting, input validation)
- Session management
- PHI data exposure
- Third-party integrations

**Vendors/Options:**
- Internal security team (if available)
- External pentest firms (recommended for healthcare):
  - Coalfire
  - Tevora
  - Clearwater Compliance
  - HealthTech Advisors

**Deliverables Required:**
- Executive summary
- Detailed findings with CVSS scores
- Remediation recommendations
- Retest results after fixes

**Budget:** $15,000 - $50,000 for external pentest (varies by scope)

### 2.4 Incident Response Procedures

#### Breach Notification Requirements

**HIPAA Breach Notification Rule:**
- Report breaches affecting 500+ individuals to HHS within 60 days
- Report breaches affecting <500 individuals annually
- Notify affected individuals within 60 days
- Notify media if breach affects 500+ individuals in a state/jurisdiction

**What Constitutes a Breach:**
- Unauthorized access to PHI
- Accidental disclosure of PHI
- Loss or theft of devices containing PHI
- Ransomware affecting PHI systems

**Implementation:**
```typescript
// apps/api/src/lib/incident-response.ts
export interface SecurityIncident {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'unauthorized_access' | 'data_breach' | 'malware' | 'dos' | 'other';
  description: string;
  affectedRecords: number;
  affectedPatients?: string[]; // Patient IDs
  detectedAt: Date;
  reportedAt?: Date;
  resolvedAt?: Date;
  notificationsSent: boolean;
}

export async function reportSecurityIncident(incident: Omit<SecurityIncident, 'id'>) {
  const incidentId = crypto.randomUUID();

  // Log to incident database
  await db.from('security_incidents').insert({
    id: incidentId,
    ...incident,
  });

  // Alert security team immediately for high/critical
  if (incident.severity === 'high' || incident.severity === 'critical') {
    await alertSecurityTeam(incident);
  }

  // If potential PHI breach, initiate breach assessment
  if (incident.type === 'data_breach' || incident.type === 'unauthorized_access') {
    await initiateBreachAssessment(incidentId, incident);
  }

  return incidentId;
}

async function initiateBreachAssessment(incidentId: string, incident: Partial<SecurityIncident>) {
  // Determine if breach notification required (HIPAA 4-factor test)
  const riskAssessment = await assessBreachRisk(incident);

  if (riskAssessment.notificationRequired) {
    // Create tasks for compliance team
    await createBreachNotificationTasks(incidentId, incident.affectedRecords!);

    // If 500+ records, immediate escalation
    if (incident.affectedRecords! >= 500) {
      await escalateToExecutiveTeam(incidentId);
    }
  }
}

async function assessBreachRisk(incident: Partial<SecurityIncident>): Promise<{
  notificationRequired: boolean;
  reasoning: string;
}> {
  // HIPAA 4-factor breach risk assessment:
  // 1. Nature and extent of PHI involved
  // 2. Unauthorized person who accessed PHI
  // 3. Whether PHI was actually acquired or viewed
  // 4. Extent to which risk has been mitigated

  // This should involve human review - just creating placeholder
  return {
    notificationRequired: true, // Conservative default
    reasoning: 'Automatic assessment pending human review',
  };
}
```

**Incident Response Plan Template:**
1. **Detection and Analysis** (0-2 hours)
   - Identify incident source and scope
   - Preserve evidence
   - Assess severity

2. **Containment** (2-8 hours)
   - Isolate affected systems
   - Prevent further unauthorized access
   - Patch vulnerabilities

3. **Eradication and Recovery** (8-48 hours)
   - Remove threat
   - Restore systems from clean backups
   - Verify system integrity

4. **Post-Incident** (48+ hours)
   - Root cause analysis
   - Update security controls
   - Breach notification (if required)
   - Lessons learned documentation

---

## 3. Clinical Data Standards

### 3.1 FHIR Compliance

**Fast Healthcare Interoperability Resources (FHIR)** is the modern standard for healthcare data exchange, developed by HL7.

**Authority:** HL7 International
**Current Version:** R4 (R5 available but R4 is production standard)
**Applicability:** Required for EHR integration, recommended for all clinical data structures

#### Why FHIR for AngstromSCD?

1. **Interoperability:** Easily exchange data with EHRs (Epic, Cerner, etc.)
2. **Standard Terminologies:** Built-in support for SNOMED, LOINC, ICD-10
3. **Modern Architecture:** RESTful APIs, JSON support
4. **Clinical Validity:** Resources designed by clinical experts

#### Key FHIR Resources for SCD Application

| FHIR Resource | AngstromSCD Use Case | Priority |
|---------------|----------------------|----------|
| **Patient** | SCD patient demographics | MUST HAVE |
| **Condition** | SCD diagnosis, genotype | MUST HAVE |
| **Observation** | Lab results, VOE risk scores | MUST HAVE |
| **MedicationRequest** | Hydroxyurea prescriptions | SHOULD HAVE |
| **Encounter** | VOE episodes, clinic visits | SHOULD HAVE |
| **DocumentReference** | Literature citations, research papers | COULD HAVE |

#### Implementation Strategy

**Option 1: FHIR-Native Storage (Recommended for new projects)**
Store data in FHIR format directly in database.

**Option 2: FHIR Mapping Layer (Recommended for AngstromSCD)**
Keep existing database schema, provide FHIR API interface.

**Implementation (Option 2):**
```typescript
// apps/api/src/lib/fhir/patient-mapper.ts
import { Patient as FHIRPatient } from 'fhir/r4';

interface SCDPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  genotype: 'HbSS' | 'HbSC' | 'HbS-beta-thal' | 'other';
}

export function toFHIRPatient(patient: SCDPatient): FHIRPatient {
  return {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [
      {
        system: 'https://angstromscd.com/patient-id',
        value: patient.id,
      },
    ],
    name: [
      {
        use: 'official',
        family: patient.last_name,
        given: [patient.first_name],
      },
    ],
    gender: patient.gender === 'male' ? 'male' : patient.gender === 'female' ? 'female' : 'other',
    birthDate: patient.date_of_birth,
    // SCD-specific extension
    extension: [
      {
        url: 'http://angstromscd.com/fhir/StructureDefinition/scd-genotype',
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: genotypeToSNOMED(patient.genotype),
              display: patient.genotype,
            },
          ],
        },
      },
    ],
  };
}

function genotypeToSNOMED(genotype: string): string {
  const mapping: Record<string, string> = {
    'HbSS': '127040003', // Sickle cell-hemoglobin SS disease
    'HbSC': '35434009',  // Sickle cell-hemoglobin C disease
    'HbS-beta-thal': '417357006', // Sickle cell-beta-thalassemia
  };
  return mapping[genotype] || '417357006';
}

// FHIR API endpoint
// apps/api/src/routes/fhir.ts
import { Hono } from 'hono';

const fhir = new Hono();

// GET /fhir/Patient/:id
fhir.get('/Patient/:id', authMiddleware, async (c) => {
  const patientId = c.req.param('id');

  const patient = await db
    .from('scd_patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (!patient) {
    return c.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'not-found',
        diagnostics: `Patient ${patientId} not found`,
      }],
    }, 404);
  }

  const fhirPatient = toFHIRPatient(patient);
  return c.json(fhirPatient);
});

// POST /fhir/Patient (create)
fhir.post('/Patient', authMiddleware, requirePermission('WRITE_PATIENT_PHI'), async (c) => {
  const fhirPatient = await c.req.json() as FHIRPatient;

  // Validate FHIR resource (use validator library)
  const validation = await validateFHIR(fhirPatient);
  if (!validation.valid) {
    return c.json({
      resourceType: 'OperationOutcome',
      issue: validation.errors.map(err => ({
        severity: 'error',
        code: 'invalid',
        diagnostics: err,
      })),
    }, 400);
  }

  // Convert to internal format and store
  const patient = fromFHIRPatient(fhirPatient);
  const result = await db.from('scd_patients').insert(patient).select().single();

  return c.json(toFHIRPatient(result), 201);
});

export default fhir;
```

**FHIR Libraries for Node.js:**
- **fhir-kit-client:** Client for consuming FHIR APIs
- **node-fhir-server-core:** Framework for building FHIR servers
- **fhir:** TypeScript types for FHIR resources

**Installation:**
```bash
bun add fhir-kit-client @types/fhir
```

#### FHIR Validation

Always validate FHIR resources against official profiles:

```typescript
// apps/api/src/lib/fhir/validator.ts
import { Validator } from '@fhir-typescript/r4-core';

export async function validateFHIR(resource: any): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Basic structural validation
  if (!resource.resourceType) {
    errors.push('Missing required field: resourceType');
  }

  // Use official FHIR validator (can integrate with Java-based validator)
  // For production, consider using HAPI FHIR validator service

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

**US Core Implementation Guide:**
For US-based applications, implement US Core profiles (stricter requirements than base FHIR):
- US Core Patient Profile
- US Core Condition Profile
- US Core Observation Profile

**Reference:** http://hl7.org/fhir/us/core/

### 3.2 Medical Terminology Standards

#### 3.2.1 ICD-10-CM (Diagnosis Codes)

**Purpose:** Classify diseases and health conditions for billing and statistics
**Maintained by:** WHO (ICD-10), CDC (ICD-10-CM for US)
**Update Frequency:** Annual (October 1)

**Sickle Cell Disease ICD-10 Codes:**
```typescript
// apps/api/src/lib/terminology/icd10.ts
export const SCD_ICD10_CODES = {
  'D57.00': 'Hb-SS disease with crisis, unspecified',
  'D57.01': 'Hb-SS disease with acute chest syndrome',
  'D57.02': 'Hb-SS disease with splenic sequestration',
  'D57.1': 'Sickle-cell disease without crisis',
  'D57.20': 'Sickle-cell/Hb-C disease without crisis',
  'D57.211': 'Sickle-cell/Hb-C disease with acute chest syndrome',
  'D57.212': 'Sickle-cell/Hb-C disease with splenic sequestration',
  'D57.219': 'Sickle-cell/Hb-C disease with crisis, unspecified',
  'D57.40': 'Sickle-cell thalassemia without crisis',
  'D57.411': 'Sickle-cell thalassemia with acute chest syndrome',
  'D57.412': 'Sickle-cell thalassemia with splenic sequestration',
  'D57.419': 'Sickle-cell thalassemia with crisis, unspecified',
  'D57.80': 'Other sickle-cell disorders without crisis',
  'D57.811': 'Other sickle-cell disorders with acute chest syndrome',
  'D57.812': 'Other sickle-cell disorders with splenic sequestration',
  'D57.819': 'Other sickle-cell disorders with crisis, unspecified',
} as const;

export function getDiagnosisCode(condition: string): string | undefined {
  // Map internal condition strings to ICD-10
  const mapping: Record<string, keyof typeof SCD_ICD10_CODES> = {
    'HbSS_no_crisis': 'D57.1',
    'HbSS_acute_chest': 'D57.01',
    'HbSS_splenic_sequestration': 'D57.02',
    'HbSC_no_crisis': 'D57.20',
    // ... etc
  };

  return mapping[condition];
}
```

**Integration:**
- Include ICD-10 codes in FHIR Condition resources
- Use for insurance billing integration
- Map SCD genotypes to appropriate ICD-10 codes

#### 3.2.2 SNOMED CT (Clinical Terminology)

**Purpose:** Comprehensive clinical terminology for EHR documentation
**Maintained by:** SNOMED International
**Concepts:** 350,000+ active concepts

**Why SNOMED for AngstromSCD:**
- More granular than ICD-10
- Supports complex clinical relationships
- Required for US EHR systems (Meaningful Use Stage 2+)
- Better for clinical decision support

**Key SNOMED Concepts for SCD:**
```typescript
// apps/api/src/lib/terminology/snomed.ts
export const SCD_SNOMED_CONCEPTS = {
  // Disorders
  SICKLE_CELL_DISEASE: '417357006',
  SICKLE_CELL_ANEMIA: '127040003',
  VOE: '21522001', // Vaso-occlusive crisis
  ACUTE_CHEST_SYNDROME: '88969007',

  // Observations
  HEMOGLOBIN_SS: '16402005',
  HEMOGLOBIN_SC: '55995006',
  HEMOGLOBIN_S_BETA_THAL: '35885006',

  // Medications
  HYDROXYUREA: '126106007',

  // Procedures
  BLOOD_TRANSFUSION: '116859006',
  EXCHANGE_TRANSFUSION: '116860001',
} as const;

export interface SNOMEDCoding {
  system: 'http://snomed.info/sct';
  code: string;
  display: string;
}

export function getSNOMEDCoding(concept: keyof typeof SCD_SNOMED_CONCEPTS): SNOMEDCoding {
  const conceptId = SCD_SNOMED_CONCEPTS[concept];

  // In production, look up display name from SNOMED terminology server
  // For now, use static mapping
  const displays: Record<string, string> = {
    '417357006': 'Sickle cell disease',
    '127040003': 'Sickle cell-hemoglobin SS disease',
    '21522001': 'Vaso-occlusive crisis',
    '88969007': 'Acute chest syndrome',
    // ... etc
  };

  return {
    system: 'http://snomed.info/sct',
    code: conceptId,
    display: displays[conceptId] || `SNOMED ${conceptId}`,
  };
}
```

**SNOMED CT Resources:**
- Free for use in SNOMED member countries (US, UK, etc.)
- Download from: https://www.nlm.nih.gov/healthit/snomedct/
- UMLS Terminology Services API: https://uts.nlm.nih.gov/uts/

#### 3.2.3 LOINC (Laboratory Observations)

**Purpose:** Universal codes for lab tests and clinical observations
**Maintained by:** Regenstrief Institute
**Use Cases:** Lab results, vital signs, clinical assessments

**Key LOINC Codes for SCD:**
```typescript
// apps/api/src/lib/terminology/loinc.ts
export const SCD_LOINC_CODES = {
  // Hemoglobin panel
  HEMOGLOBIN: '718-7',
  HEMOGLOBIN_S: '28560-3',
  HEMOGLOBIN_F: '4576-3',
  HEMOGLOBIN_A2: '4551-6',

  // Other relevant labs
  RETICULOCYTE_COUNT: '4679-7',
  BILIRUBIN_TOTAL: '1975-2',
  LDH: '2532-0',

  // Pain assessment
  PAIN_SEVERITY: '72514-3',

  // VOE risk score (custom - would need to register with LOINC)
  VOE_RISK_SCORE: 'CUSTOM-VOE-001', // Placeholder
} as const;

export interface LOINCObservation {
  code: string;
  display: string;
  value: number | string;
  unit: string;
  referenceRange?: { low: number; high: number };
}

export function createLOINCObservation(
  loincCode: keyof typeof SCD_LOINC_CODES,
  value: number | string,
  unit: string
): LOINCObservation {
  const code = SCD_LOINC_CODES[loincCode];

  return {
    code,
    display: loincCode.replace(/_/g, ' '),
    value,
    unit,
  };
}

// FHIR Observation with LOINC
export function toFHIRObservation(obs: LOINCObservation, patientId: string) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'laboratory',
      }],
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: obs.code,
        display: obs.display,
      }],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    valueQuantity: typeof obs.value === 'number' ? {
      value: obs.value,
      unit: obs.unit,
    } : undefined,
    valueString: typeof obs.value === 'string' ? obs.value : undefined,
  };
}
```

**LOINC Resources:**
- Free download: https://loinc.org/downloads/
- FHIR Terminology Server: https://loinc.org/fhir/

#### 3.2.4 Terminology Integration Strategy

**Recommended Approach:**
1. **Local Caching:** Download and cache terminology data in PostgreSQL
2. **API Layer:** Provide internal API for terminology lookups
3. **Validation:** Validate codes on data entry
4. **Mapping:** Map between code systems (ICD-10 ↔ SNOMED)

**Database Schema:**
```sql
-- Terminology tables
CREATE TABLE terminology_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT NOT NULL, -- 'ICD10', 'SNOMED', 'LOINC'
  code TEXT NOT NULL,
  display TEXT NOT NULL,
  definition TEXT,
  active BOOLEAN DEFAULT true,
  UNIQUE(system, code)
);

CREATE INDEX idx_terminology_system_code ON terminology_codes(system, code);

-- Concept mappings (e.g., SNOMED to ICD-10)
CREATE TABLE terminology_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  source_code TEXT NOT NULL,
  target_system TEXT NOT NULL,
  target_code TEXT NOT NULL,
  equivalence TEXT, -- 'equivalent', 'narrower', 'broader', 'inexact'
  FOREIGN KEY (source_system, source_code) REFERENCES terminology_codes(system, code),
  FOREIGN KEY (target_system, target_code) REFERENCES terminology_codes(system, code)
);
```

### 3.3 Citation and Literature Reference Standards

#### PMID (PubMed ID)

**Format:** Integer (e.g., 12345678)
**Source:** National Library of Medicine (NLM)
**Use Case:** Citing medical literature in research features

```typescript
// apps/api/src/lib/literature/pmid.ts
export async function fetchPubMedArticle(pmid: string) {
  const response = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`
  );

  const xml = await response.text();
  // Parse XML to extract citation details

  return {
    pmid,
    title: '...', // Extract from XML
    authors: ['...'],
    journal: '...',
    year: 2024,
    doi: '...', // If available
  };
}
```

#### DOI (Digital Object Identifier)

**Format:** 10.xxxx/yyyy (e.g., 10.1038/s41467-024-12345-6)
**Source:** International DOI Foundation
**Use Case:** Persistent identifiers for journal articles

```typescript
// apps/api/src/lib/literature/doi.ts
export async function fetchDOIMetadata(doi: string) {
  const response = await fetch(
    `https://api.crossref.org/works/${doi}`,
    {
      headers: {
        'User-Agent': 'AngstromSCD/1.0 (mailto:contact@angstromscd.com)',
      },
    }
  );

  const data = await response.json();

  return {
    doi,
    title: data.message.title[0],
    authors: data.message.author.map((a: any) => `${a.given} ${a.family}`),
    journal: data.message['container-title'][0],
    year: data.message.published['date-parts'][0][0],
    url: data.message.URL,
  };
}
```

#### Database Schema for Literature References

```sql
CREATE TABLE literature_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmid TEXT UNIQUE,
  doi TEXT UNIQUE,
  title TEXT NOT NULL,
  authors JSONB, -- Array of author names
  journal TEXT,
  publication_year INTEGER,
  abstract TEXT,
  url TEXT,
  relevance_score FLOAT, -- For semantic search ranking
  embedding VECTOR(1536), -- For semantic search (OpenAI ada-002)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citations_pmid ON literature_citations(pmid);
CREATE INDEX idx_citations_doi ON literature_citations(doi);
CREATE INDEX idx_citations_embedding ON literature_citations USING ivfflat (embedding vector_cosine_ops);
```

---

## 4. Production Deployment Best Practices

### 4.1 Monitoring and Alerting

#### Key Metrics to Monitor

**Application Performance:**
- Response time (p50, p95, p99)
- Error rate
- Request throughput
- Database query performance

**Infrastructure:**
- CPU utilization
- Memory usage
- Disk I/O
- Network latency

**Healthcare-Specific:**
- PHI access latency (must be responsive for clinical use)
- AI model response time
- Audit log write latency
- Authentication failures (potential security issues)

#### SLA Requirements for Healthcare Applications

**Uptime Targets:**
- **Critical (patient safety):** 99.99% (4.38 minutes downtime/month)
- **Production (clinical use):** 99.9% (43.8 minutes downtime/month)
- **Non-critical (research):** 99.5% (3.65 hours downtime/month)

**Response Time Targets:**
- **API endpoints:** p95 < 200ms, p99 < 500ms
- **Database queries:** p95 < 100ms
- **AI inference:** < 5 seconds for clinical decision support

**Recommended Monitoring Stack:**
```bash
# For Node.js/React applications
bun add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
bun add prom-client # Prometheus metrics
```

```typescript
// apps/api/src/lib/monitoring/metrics.ts
import promClient from 'prom-client';

// Create metrics registry
export const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom healthcare metrics
export const phiAccessCounter = new promClient.Counter({
  name: 'phi_access_total',
  help: 'Total number of PHI access operations',
  labelNames: ['user_role', 'resource_type', 'action'],
  registers: [register],
});

export const phiAccessDuration = new promClient.Histogram({
  name: 'phi_access_duration_seconds',
  help: 'PHI access operation duration',
  labelNames: ['resource_type', 'action'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const aiInferenceDuration = new promClient.Histogram({
  name: 'ai_inference_duration_seconds',
  help: 'AI model inference duration',
  labelNames: ['model', 'provider'],
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const authFailuresCounter = new promClient.Counter({
  name: 'auth_failures_total',
  help: 'Total authentication failures',
  labelNames: ['reason'],
  registers: [register],
});

// Middleware to track request metrics
export function metricsMiddleware(c: Context, next: Next) {
  const start = Date.now();

  await next();

  const duration = (Date.now() - start) / 1000;

  httpRequestDuration.observe(
    {
      method: c.req.method,
      route: c.req.routePath,
      status: c.res.status,
    },
    duration
  );
}

// Metrics endpoint
app.get('/metrics', async (c) => {
  c.header('Content-Type', register.contentType);
  return c.text(await register.metrics());
});
```

#### Alerting Rules

**Critical Alerts (Page on-call immediately):**
- API error rate > 5% for 5 minutes
- Database connection failures
- Authentication service down
- PHI access by unauthorized user
- Security incident detected

**Warning Alerts (Notify team, investigate during business hours):**
- API p95 latency > 500ms for 10 minutes
- Memory usage > 85%
- Disk usage > 80%
- Unusual PHI access patterns

**Implementation with Prometheus AlertManager:**
```yaml
# prometheus-alerts.yml
groups:
  - name: healthcare_critical
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.route }}"

      - alert: UnauthorizedPHIAccess
        expr: increase(phi_access_total{authorized="false"}[1m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Unauthorized PHI access attempt"
          description: "User {{ $labels.user_id }} attempted unauthorized access"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database is down"

  - name: healthcare_warnings
    interval: 1m
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "p95 latency is {{ $value }}s"
```

### 4.2 Backup and Disaster Recovery

#### HIPAA Requirements

**Mandatory (45 CFR § 164.308(a)(7)(ii)(A)):**
- **Data Backup Plan:** All ePHI must be backed up regularly
- **Disaster Recovery Plan:** Procedures to restore ePHI to original state
- **Emergency Mode Operation Plan:** Maintain critical functions during disaster
- **Testing & Revision:** Periodic testing of plans (recommended: annually)

#### Backup Strategy

**RTO (Recovery Time Objective):** Maximum acceptable downtime
- **Critical systems:** RTO = 4 hours
- **Non-critical:** RTO = 24 hours

**RPO (Recovery Point Objective):** Maximum acceptable data loss
- **Patient data:** RPO = 15 minutes (near-zero with replication)
- **Research data:** RPO = 24 hours

**Backup Types:**
1. **Continuous Replication:** PostgreSQL streaming replication to standby
2. **Daily Full Backup:** Complete database dump, retained for 30 days
3. **Hourly Incremental:** WAL (Write-Ahead Log) archiving
4. **Weekly Application Backup:** Full server snapshot

**Implementation with Supabase:**
```sql
-- Point-in-Time Recovery (PITR) - Available on Supabase Pro+
-- Enabled in Supabase Dashboard > Database Settings
-- Allows restore to any point in last 7 days (Pro) or 30 days (Enterprise)

-- Manual backup script (additional protection)
-- Execute via cron job
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/var/backups/angstromscd"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Backup database (use read replica to avoid impacting production)
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Encrypt backup
gpg --encrypt --recipient backup@angstromscd.com $BACKUP_FILE

# Upload to S3 with encryption
aws s3 cp ${BACKUP_FILE}.gpg s3://angstromscd-backups/ \
  --storage-class GLACIER \
  --server-side-encryption AES256

# Remove local backup after 7 days
find $BACKUP_DIR -name "backup_*.sql.gz*" -mtime +7 -delete

# Log backup completion
echo "$(date): Backup completed - $BACKUP_FILE" >> /var/log/backup.log
```

**Cron schedule:**
```cron
# Daily full backup at 2 AM
0 2 * * * /opt/angstromscd/scripts/backup-database.sh

# Test restore monthly
0 3 1 * * /opt/angstromscd/scripts/test-restore.sh
```

#### Disaster Recovery Plan

**Scenarios:**
1. **Database corruption:** Restore from PITR or latest backup
2. **Regional outage:** Failover to secondary region
3. **Ransomware:** Restore from immutable backup (Glacier)
4. **Data center failure:** Activate DR site

**DR Testing Checklist:**
- [ ] Verify backups are valid (test restore quarterly)
- [ ] Document restoration procedures
- [ ] Test failover to DR environment
- [ ] Measure actual RTO/RPO
- [ ] Update runbooks based on test results

**Supabase High Availability Setup:**
```typescript
// For production, use connection pooler and read replicas
import { createClient } from '@supabase/supabase-js';

// Primary connection (writes)
export const supabasePrimary = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
  }
);

// Read replica connection (reads only)
export const supabaseRead = createClient(
  process.env.SUPABASE_READ_REPLICA_URL!, // Available on Enterprise
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
  }
);

// Smart router: writes to primary, reads from replica
export function getSupabaseClient(operation: 'read' | 'write') {
  return operation === 'write' ? supabasePrimary : supabaseRead;
}
```

### 4.3 High Availability Architecture

**Recommended Infrastructure:**

```
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │   (CDN + WAF)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Load Balancer  │
                                    │   (AWS ALB)     │
                                    └────┬───────┬────┘
                                         │       │
                        ┌────────────────┘       └────────────────┐
                        │                                          │
                ┌───────▼────────┐                        ┌───────▼────────┐
                │   API Server   │                        │   API Server   │
                │   (Primary)    │                        │   (Standby)    │
                │   Docker/K8s   │                        │   Docker/K8s   │
                └───────┬────────┘                        └───────┬────────┘
                        │                                          │
                        └───────────────┬──────────────────────────┘
                                        │
                                ┌───────▼────────┐
                                │   Supabase     │
                                │   PostgreSQL   │
                                │  (Multi-AZ)    │
                                └────────────────┘
```

**Deployment Configuration (Docker Compose for staging):**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: angstromscd/api:latest
    deploy:
      replicas: 2 # Multiple instances for HA
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: angstromscd/frontend:latest
    deploy:
      replicas: 2
    environment:
      - VITE_API_URL=${API_URL}

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
      - frontend
```

**Kubernetes Deployment (recommended for production):**
```yaml
# k8s/api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: angstromscd-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: angstromscd-api
  template:
    metadata:
      labels:
        app: angstromscd-api
    spec:
      containers:
      - name: api
        image: angstromscd/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: angstromscd-api-service
spec:
  type: LoadBalancer
  selector:
    app: angstromscd-api
  ports:
  - port: 80
    targetPort: 3001
```

### 4.4 Performance Benchmarks

**Healthcare Application Standards:**
- **Page Load Time:** < 2 seconds (first contentful paint)
- **Time to Interactive:** < 3 seconds
- **API Response:** < 200ms (p95)
- **Database Query:** < 100ms (p95)
- **AI Inference:** < 5 seconds for clinical decision support

**Performance Testing:**
```bash
# Load testing with k6
bun add -D k6

# k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://api.angstromscd.com/api/patients');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

---

## 5. Testing Requirements

### 5.1 Medical Software Testing Standards

#### IEC 62304 - Medical Device Software Lifecycle

**Applicability:** If AngstromSCD is considered a "medical device" (provides diagnosis/treatment recommendations), it must comply with IEC 62304.

**Software Safety Classification:**
- **Class A:** No injury possible → Lower testing requirements
- **Class B:** Non-serious injury possible → Moderate testing
- **Class C:** Death or serious injury possible → Highest testing requirements

**For AngstromSCD VOE Risk Assessment:**
- Likely **Class B or C** (clinical decision support affecting patient care)

#### Required Testing Activities (IEC 62304)

1. **Unit Testing**
   - Test individual functions and modules
   - Code coverage: 80%+ recommended, 100% for Class C safety-critical functions

2. **Integration Testing**
   - Test interactions between components
   - API contract testing
   - Database integration testing

3. **System Testing**
   - End-to-end functional testing
   - Performance testing
   - Security testing

4. **Verification Testing**
   - Verify design outputs meet design inputs
   - Traceability matrix required

5. **Validation Testing**
   - Verify software meets user needs
   - Clinical validation (users = clinicians)
   - Must involve actual end users

**FDA Guidance:** "Software testing by itself is not sufficient" - must include design reviews, code reviews, static analysis.

### 5.2 Testing Implementation

#### Unit Testing Setup

```bash
# Install testing frameworks
bun add -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.ts',
      ],
      // IEC 62304 compliance: track coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**Example Unit Tests:**
```typescript
// apps/api/src/lib/__tests__/voe-risk-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateVOERisk } from '../voe-risk-calculator';

describe('VOE Risk Calculator', () => {
  it('should calculate high risk for HbSS with frequent VOEs', () => {
    const result = calculateVOERisk({
      genotype: 'HbSS',
      recentVOECount: 5,
      age: 25,
      hydroxyureaCompliance: 0.3, // 30% compliance
    });

    expect(result.riskLevel).toBe('high');
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('should calculate low risk for HbSC with no recent VOEs', () => {
    const result = calculateVOERisk({
      genotype: 'HbSC',
      recentVOECount: 0,
      age: 30,
      hydroxyureaCompliance: 0.9,
    });

    expect(result.riskLevel).toBe('low');
    expect(result.score).toBeLessThan(0.3);
  });

  // Edge case testing (IEC 62304 requirement)
  it('should handle missing hydroxyurea compliance gracefully', () => {
    const result = calculateVOERisk({
      genotype: 'HbSS',
      recentVOECount: 2,
      age: 20,
      // hydroxyureaCompliance not provided
    });

    expect(result).toBeDefined();
    expect(result.riskLevel).toBeDefined();
  });
});
```

#### Integration Testing

```typescript
// apps/api/src/__tests__/integration/patient-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
);

describe('Patient API Integration', () => {
  let testPatientId: string;

  beforeAll(async () => {
    // Set up test data
    const { data } = await supabase
      .from('scd_patients')
      .insert({
        first_name: 'Test',
        last_name: 'Patient',
        genotype: 'HbSS',
      })
      .select()
      .single();

    testPatientId = data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase
      .from('scd_patients')
      .delete()
      .eq('id', testPatientId);
  });

  it('should retrieve patient with FHIR format', async () => {
    const response = await fetch(`http://localhost:3001/fhir/Patient/${testPatientId}`);
    const fhirPatient = await response.json();

    expect(fhirPatient.resourceType).toBe('Patient');
    expect(fhirPatient.id).toBe(testPatientId);
  });
});
```

#### End-to-End Testing

```typescript
// apps/frontend/tests/e2e/voe-assessment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('VOE Risk Assessment', () => {
  test('clinician can assess VOE risk for patient', async ({ page }) => {
    // Login as clinician
    await page.goto('/login');
    await page.fill('input[name="email"]', 'clinician@test.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Navigate to patient
    await page.goto('/patients/test-patient-id');

    // Perform VOE risk assessment
    await page.click('button:has-text("Assess VOE Risk")');
    await page.fill('input[name="recentVOECount"]', '3');
    await page.click('button:has-text("Calculate Risk")');

    // Verify results displayed
    await expect(page.locator('[data-testid="risk-level"]')).toBeVisible();

    // Verify audit log created (security requirement)
    const auditLogExists = await page.evaluate(async () => {
      const response = await fetch('/api/audit-logs?action=voe_risk_assessment');
      const logs = await response.json();
      return logs.length > 0;
    });

    expect(auditLogExists).toBe(true);
  });
});
```

### 5.3 Clinical Validation

**Requirement:** Medical software must be validated with actual clinicians

**Process:**
1. **Define Validation Protocol**
   - What clinical scenarios to test
   - What constitutes "correct" output
   - Acceptance criteria

2. **Recruit Clinical Validators**
   - SCD specialists
   - Hematologists
   - Clinical researchers

3. **Conduct Validation Testing**
   - Clinicians use system with real-world scenarios
   - Compare system outputs to clinical judgment
   - Document discrepancies

4. **Analyze Results**
   - Calculate accuracy, sensitivity, specificity
   - Identify failure modes
   - Update system based on findings

5. **Document Validation**
   - Validation report with results
   - Traceability to requirements
   - Store for regulatory/audit purposes

**Example Validation Protocol:**
```markdown
# VOE Risk Assessment Clinical Validation Protocol

## Objective
Validate that the VOE Risk Assessment algorithm produces clinically accurate
risk predictions for SCD patients.

## Validation Criteria
- Sensitivity: ≥ 85% (correctly identify high-risk patients)
- Specificity: ≥ 80% (correctly identify low-risk patients)
- Positive Predictive Value: ≥ 75%

## Test Cases
1. HbSS patient, age 25, 5 VOEs in past year → Expected: High Risk
2. HbSC patient, age 30, 0 VOEs in past year → Expected: Low Risk
3. [20 more clinical scenarios]

## Clinical Validators
- Dr. Jane Smith, MD - SCD Specialist, 15 years experience
- Dr. John Doe, MD - Hematologist, 10 years experience

## Validation Results
[To be completed during testing]
```

### 5.4 Regression Testing

**Requirement:** Re-test after any code changes to ensure no new defects

**Implementation:**
- Run full test suite on every commit (CI/CD)
- Automated regression tests for critical paths
- Manual regression testing before releases

```yaml
# .github/workflows/test.yml
name: Automated Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun run test:unit

      - name: Run integration tests
        run: bun run test:integration
        env:
          TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Run E2E tests
        run: bun run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Check coverage thresholds
        run: bun run test:coverage-check
```

---

## 6. AI/ML in Healthcare

### 6.1 FDA Regulatory Framework for AI/ML Medical Devices

**Current Status (2025):**
- 1,016 FDA-authorized AI/ML medical devices (as of May 2024)
- Majority in radiology (76%), cardiology (10%), neurology (4%)
- **No LLM-based devices authorized yet** (regulatory gap)

**FDA AI/ML SaMD Action Plan (2021):**
1. Good Machine Learning Practice (GMLP)
2. Patient-centered approach (transparency)
3. Bias mitigation
4. Real-world performance monitoring

#### 10 Guiding Principles of GMLP

*(Joint FDA/Health Canada/MHRA guidance)*

1. **Multi-Disciplinary Expertise:** Involve clinical, technical, and regulatory experts
2. **Good Software Engineering:** Follow established software development practices
3. **Clinical Study Participants:** Represent intended patient population
4. **Training Data Sets:** Representative, high-quality, diverse
5. **Model Performance:** Ensure independently evaluated performance
6. **Transparency:** Provide clear information on how model works
7. **Reference Datasets:** Use established benchmarks
8. **User Guidance:** Clear instructions for intended use
9. **Deployed Models:** Monitor real-world performance
10. **Risk Management:** Identify and mitigate risks

**Application to AngstromSCD:**
- Document multi-disciplinary team (clinicians, engineers, ML experts)
- Use diverse SCD patient data for training (multiple demographics)
- Validate model performance with clinical data
- Provide transparency to users on AI limitations
- Monitor for bias in production

### 6.2 LLM-Specific Best Practices

#### Hallucination Detection and Mitigation

**Problem:** LLMs can generate plausible-sounding but medically incorrect information

**Detection Methods:**

1. **Retrieval-Augmented Generation (RAG)**
   - Ground responses in verified medical literature
   - Cite sources for all claims

2. **Self-Check GPT**
   - Ask model to verify its own outputs
   - Compare against trusted sources

3. **Semantic Entropy**
   - Measure uncertainty in model outputs
   - Flag high-uncertainty responses for review

4. **Expert Validation**
   - Have clinicians review AI-generated content
   - IBM Watson: 35% reduction in hallucinations with expert review

**Implementation:**
```typescript
// packages/baml/src/lib/hallucination-detection.ts

export interface HallucinationCheckResult {
  isReliable: boolean;
  confidence: number;
  concerns: string[];
  citations: string[];
}

/**
 * Check LLM response for potential hallucinations
 */
export async function checkForHallucinations(
  query: string,
  response: string,
  citations: string[]
): Promise<HallucinationCheckResult> {
  const concerns: string[] = [];
  let confidence = 1.0;

  // 1. Check if response is grounded in citations
  if (citations.length === 0) {
    concerns.push('No citations provided');
    confidence -= 0.3;
  }

  // 2. Check for medical claims without evidence
  const medicalClaimPatterns = [
    /\b(always|never|all patients|every case)\b/gi,
    /\b(cure|guaranteed|proven to)\b/gi,
    /\b(definitely|certainly|absolutely)\b/gi,
  ];

  for (const pattern of medicalClaimPatterns) {
    if (pattern.test(response)) {
      concerns.push(`Overly definitive claim: ${response.match(pattern)![0]}`);
      confidence -= 0.1;
    }
  }

  // 3. Self-check with verification prompt
  const verificationPrompt = `
You are a medical fact-checker. Review the following response for factual accuracy:

Query: ${query}
Response: ${response}

Identify any medical claims that are:
1. Unsupported by evidence
2. Contradictory to established medical knowledge
3. Missing important caveats or nuances

Return JSON: { "concerns": ["concern1", "concern2"], "isAccurate": boolean }
  `;

  const verification = await callLLM(verificationPrompt, 'gpt-4');
  const verificationResult = JSON.parse(verification);

  if (!verificationResult.isAccurate) {
    concerns.push(...verificationResult.concerns);
    confidence -= 0.4;
  }

  // 4. Check against medical knowledge base (if available)
  // const knowledgeBaseCheck = await queryMedicalKB(response);
  // if (knowledgeBaseCheck.conflicts.length > 0) {
  //   concerns.push(...knowledgeBaseCheck.conflicts);
  //   confidence -= 0.2;
  // }

  return {
    isReliable: confidence > 0.7,
    confidence,
    concerns,
    citations,
  };
}

/**
 * Middleware to add hallucination warnings to LLM responses
 */
export async function addHallucinationWarning(
  response: string,
  check: HallucinationCheckResult
): Promise<string> {
  if (!check.isReliable) {
    return `
⚠️ **CAUTION:** This AI-generated response has low confidence (${Math.round(check.confidence * 100)}%).
Concerns: ${check.concerns.join(', ')}

Please verify with a healthcare professional before making clinical decisions.

---

${response}
    `.trim();
  }

  return response;
}
```

**RAG Implementation for Medical Literature:**
```typescript
// packages/vector/src/lib/medical-rag.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';

export async function answerWithCitations(
  query: string,
  userId: string
): Promise<{ answer: string; citations: string[] }> {
  // 1. Retrieve relevant medical literature
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    embeddings,
    {
      client: supabase,
      tableName: 'literature_citations',
      queryName: 'match_citations',
    }
  );

  const relevantDocs = await vectorStore.similaritySearch(query, 5);

  // 2. Construct prompt with citations
  const citationsText = relevantDocs
    .map((doc, i) => `[${i + 1}] ${doc.pageContent} (PMID: ${doc.metadata.pmid})`)
    .join('\n\n');

  const prompt = `
You are a medical research assistant specializing in Sickle Cell Disease.
Answer the following question using ONLY information from the provided citations.
If the citations don't contain enough information, say so.

Question: ${query}

Citations:
${citationsText}

Instructions:
- Cite sources using [1], [2], etc.
- Do not make claims without citation support
- If uncertain, state limitations clearly
- Use precise medical terminology

Answer:
  `;

  // 3. Generate response with citations
  const answer = await callLLM(prompt, 'gpt-4');

  // 4. Extract citation references
  const citationRefs = [...answer.matchAll(/\[(\d+)\]/g)]
    .map(match => parseInt(match[1]) - 1)
    .filter((i, idx, arr) => arr.indexOf(i) === idx); // unique

  const citations = citationRefs.map(i => {
    const doc = relevantDocs[i];
    return `PMID: ${doc.metadata.pmid} - ${doc.metadata.title}`;
  });

  // 5. Audit log (HIPAA requirement)
  await logPHIAccess({
    user_id: userId,
    action: 'read',
    resource_type: 'medical_literature',
    resource_id: citations.join(','),
    purpose: 'ai_assisted_research',
    timestamp: new Date(),
  });

  return { answer, citations };
}
```

#### Bias Detection and Mitigation

**Types of Bias in Medical AI:**
1. **Data Bias:** Training data not representative of patient population
2. **Annotation Bias:** Human labelers introduce biases
3. **Model Bias:** Algorithm amplifies existing biases
4. **Deployment Bias:** Different performance across demographics

**For SCD Applications:**
- Ensure diverse representation: Multiple genotypes, ages, genders, races
- SCD disproportionately affects African American population - ensure model performs equally across demographics
- Monitor for disparate impact in production

**Implementation:**
```typescript
// packages/baml/src/lib/bias-detection.ts

export interface BiasMetrics {
  demographicParity: number; // Should be close to 1.0
  equalizedOdds: number;
  disparateImpact: number;
  performanceByGroup: Record<string, { accuracy: number; fpr: number; fnr: number }>;
}

/**
 * Detect bias in VOE risk predictions across demographic groups
 */
export async function detectBias(
  predictions: Array<{
    patientId: string;
    predictedRisk: number;
    actualOutcome: boolean; // Did VOE occur?
    demographics: {
      age: number;
      gender: string;
      genotype: string;
      race?: string;
    };
  }>
): Promise<BiasMetrics> {
  // Group predictions by demographic
  const groups = {
    'HbSS': predictions.filter(p => p.demographics.genotype === 'HbSS'),
    'HbSC': predictions.filter(p => p.demographics.genotype === 'HbSC'),
    'male': predictions.filter(p => p.demographics.gender === 'male'),
    'female': predictions.filter(p => p.demographics.gender === 'female'),
  };

  const performanceByGroup: Record<string, any> = {};

  for (const [groupName, groupPredictions] of Object.entries(groups)) {
    const tp = groupPredictions.filter(p => p.predictedRisk > 0.5 && p.actualOutcome).length;
    const fp = groupPredictions.filter(p => p.predictedRisk > 0.5 && !p.actualOutcome).length;
    const tn = groupPredictions.filter(p => p.predictedRisk <= 0.5 && !p.actualOutcome).length;
    const fn = groupPredictions.filter(p => p.predictedRisk <= 0.5 && p.actualOutcome).length;

    performanceByGroup[groupName] = {
      accuracy: (tp + tn) / (tp + fp + tn + fn),
      fpr: fp / (fp + tn), // False positive rate
      fnr: fn / (fn + tp), // False negative rate
      precision: tp / (tp + fp),
      recall: tp / (tp + fn),
    };
  }

  // Calculate fairness metrics
  const demographicParity = calculateDemographicParity(groups);
  const equalizedOdds = calculateEqualizedOdds(performanceByGroup);
  const disparateImpact = calculateDisparateImpact(groups);

  return {
    demographicParity,
    equalizedOdds,
    disparateImpact,
    performanceByGroup,
  };
}

function calculateDemographicParity(groups: Record<string, any[]>): number {
  // Positive prediction rate should be similar across groups
  const positivePredictionRates = Object.values(groups).map(group =>
    group.filter(p => p.predictedRisk > 0.5).length / group.length
  );

  const min = Math.min(...positivePredictionRates);
  const max = Math.max(...positivePredictionRates);

  return min / max; // Closer to 1.0 = more fair
}

function calculateEqualizedOdds(performanceByGroup: Record<string, any>): number {
  // FPR and FNR should be similar across groups
  const fprs = Object.values(performanceByGroup).map(p => p.fpr);
  const fnrs = Object.values(performanceByGroup).map(p => p.fnr);

  const fprRange = Math.max(...fprs) - Math.min(...fprs);
  const fnrRange = Math.max(...fnrs) - Math.min(...fnrs);

  return 1 - (fprRange + fnrRange) / 2; // Closer to 1.0 = more fair
}

function calculateDisparateImpact(groups: Record<string, any[]>): number {
  // 80% rule: minority group selection rate / majority group selection rate ≥ 0.8
  const selectionRates = Object.values(groups).map(group =>
    group.filter(p => p.predictedRisk > 0.5).length / group.length
  );

  const min = Math.min(...selectionRates);
  const max = Math.max(...selectionRates);

  return min / max; // ≥ 0.8 is acceptable
}

// Periodic bias monitoring (run monthly)
export async function generateBiasReport() {
  const predictions = await db
    .from('voe_predictions')
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

  const biasMetrics = await detectBias(predictions);

  // Alert if bias detected
  if (biasMetrics.disparateImpact < 0.8) {
    await alertComplianceTeam({
      severity: 'high',
      message: `Bias detected: Disparate impact = ${biasMetrics.disparateImpact.toFixed(2)}`,
      metrics: biasMetrics,
    });
  }

  // Store report for audit trail
  await db.from('bias_reports').insert({
    report_date: new Date(),
    metrics: biasMetrics,
  });

  return biasMetrics;
}
```

#### Transparency and Explainability

**FDA Guiding Principle:** "Provide clear information on how model works"

**Requirements:**
1. **Model Card:** Document model details, training data, performance
2. **User Warnings:** Clearly state limitations and uncertainties
3. **Explainable Outputs:** Show why model made a prediction

**Implementation:**
```typescript
// packages/baml/src/lib/model-card.ts

export interface ModelCard {
  modelDetails: {
    name: string;
    version: string;
    type: string;
    developer: string;
    modelDate: string;
    modelVersion: string;
  };
  intendedUse: {
    primaryIntendedUses: string[];
    primaryIntendedUsers: string[];
    outOfScopeUseCases: string[];
  };
  trainingData: {
    description: string;
    size: number;
    demographics: Record<string, number>;
    dataCollection: string;
  };
  performance: {
    metrics: Record<string, number>;
    performanceByGroup: Record<string, Record<string, number>>;
    limitations: string[];
  };
  ethicalConsiderations: {
    biasAnalysis: string;
    mitigationStrategies: string[];
  };
  recommendations: {
    idealDataset: string;
    monitoring: string;
    updateFrequency: string;
  };
}

export const VOE_RISK_MODEL_CARD: ModelCard = {
  modelDetails: {
    name: 'VOE Risk Predictor',
    version: '1.0.0',
    type: 'Logistic Regression',
    developer: 'AngstromSCD Research Team',
    modelDate: '2025-01-15',
    modelVersion: 'v1.0',
  },
  intendedUse: {
    primaryIntendedUses: [
      'Predict risk of vaso-occlusive episode in next 30 days',
      'Support clinical decision-making for preventive interventions',
    ],
    primaryIntendedUsers: [
      'Hematologists',
      'SCD specialists',
      'Primary care physicians treating SCD patients',
    ],
    outOfScopeUseCases: [
      'Not for use in emergency settings',
      'Not a substitute for clinical judgment',
      'Not validated for pediatric patients (<18 years)',
    ],
  },
  trainingData: {
    description: 'Electronic health records from 5 SCD clinics, 2019-2024',
    size: 2500, // patients
    demographics: {
      'HbSS': 1500,
      'HbSC': 700,
      'HbS-beta-thal': 300,
      'male': 1200,
      'female': 1300,
    },
    dataCollection: 'Retrospective EHR data extraction with manual validation',
  },
  performance: {
    metrics: {
      accuracy: 0.82,
      sensitivity: 0.85,
      specificity: 0.80,
      auc: 0.87,
    },
    performanceByGroup: {
      'HbSS': { accuracy: 0.83, sensitivity: 0.86 },
      'HbSC': { accuracy: 0.81, sensitivity: 0.82 },
      'male': { accuracy: 0.82, sensitivity: 0.85 },
      'female': { accuracy: 0.82, sensitivity: 0.85 },
    },
    limitations: [
      'Lower accuracy for patients with <6 months of historical data',
      'Not validated for pregnant patients',
      'Performance may vary for rare genotypes',
    ],
  },
  ethicalConsiderations: {
    biasAnalysis: 'No significant disparate impact detected across gender or genotype (80% rule met)',
    mitigationStrategies: [
      'Stratified sampling to ensure balanced training data',
      'Regular bias monitoring in production',
      'Clinical review of high-risk predictions',
    ],
  },
  recommendations: {
    idealDataset: 'Patients with ≥12 months of clinical history, complete lab results',
    monitoring: 'Monthly bias reports, quarterly performance evaluation',
    updateFrequency: 'Retrain annually or when performance degrades >5%',
  },
};

// Serve model card via API
app.get('/api/models/:modelName/card', (c) => {
  const modelName = c.req.param('modelName');

  if (modelName === 'voe-risk') {
    return c.json(VOE_RISK_MODEL_CARD);
  }

  return c.json({ error: 'Model not found' }, 404);
});
```

**User-Facing Transparency:**
```typescript
// apps/frontend/src/components/VOERiskResult.tsx
export function VOERiskResult({ prediction }: { prediction: VOEPrediction }) {
  return (
    <div className="voe-risk-result">
      <div className="risk-level">
        <h3>VOE Risk: {prediction.riskLevel}</h3>
        <p>Risk Score: {Math.round(prediction.score * 100)}%</p>
      </div>

      {/* Explanation of prediction */}
      <div className="explanation">
        <h4>Why this prediction?</h4>
        <ul>
          {prediction.factors.map(factor => (
            <li key={factor.name}>
              <strong>{factor.name}:</strong> {factor.contribution > 0 ? '+' : ''}{factor.contribution}% risk
              <span className="info-icon" title={factor.explanation}>ℹ️</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Limitations and warnings */}
      <div className="limitations">
        <h4>⚠️ Important Limitations</h4>
        <ul>
          <li>This prediction is for informational purposes only</li>
          <li>Not a substitute for clinical judgment</li>
          <li>Accuracy: 82% (see <a href="/models/voe-risk/card">model card</a>)</li>
          <li>Based on data from {VOE_RISK_MODEL_CARD.trainingData.size} patients</li>
        </ul>
      </div>

      {/* Low confidence warning */}
      {prediction.confidence < 0.7 && (
        <div className="warning">
          <p>⚠️ Low confidence prediction. Consider additional clinical assessment.</p>
        </div>
      )}
    </div>
  );
}
```

### 6.3 Real-World Performance Monitoring

**FDA Requirement:** Monitor AI performance after deployment

**Implementation:**
```typescript
// packages/baml/src/lib/performance-monitoring.ts

export interface PerformanceMetrics {
  modelName: string;
  period: { start: Date; end: Date };
  predictions: number;
  actualOutcomes: number; // How many had known outcomes
  accuracy: number;
  drift: {
    dataDrift: number; // 0-1, input distribution change
    conceptDrift: number; // 0-1, relationship change
  };
  alerts: string[];
}

/**
 * Monitor model performance in production
 */
export async function monitorModelPerformance(
  modelName: string,
  periodDays: number = 30
): Promise<PerformanceMetrics> {
  const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const end = new Date();

  // Get predictions from this period
  const predictions = await db
    .from('voe_predictions')
    .select('*')
    .eq('model_name', modelName)
    .gte('created_at', start)
    .lte('created_at', end);

  // Get actual outcomes (VOE occurrences)
  const outcomes = await db
    .from('voe_episodes')
    .select('patient_id, occurred_at')
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  // Calculate accuracy
  let correct = 0;
  let total = 0;

  for (const prediction of predictions) {
    const outcome = outcomes.find(o =>
      o.patient_id === prediction.patient_id &&
      o.occurred_at >= prediction.created_at &&
      o.occurred_at <= new Date(prediction.created_at.getTime() + 30 * 24 * 60 * 60 * 1000)
    );

    const actualVOE = !!outcome;
    const predictedVOE = prediction.risk_score > 0.5;

    if (actualVOE === predictedVOE) {
      correct++;
    }
    total++;
  }

  const accuracy = correct / total;

  // Detect data drift (input distribution change)
  const dataDrift = await detectDataDrift(predictions);

  // Detect concept drift (relationship change)
  const conceptDrift = await detectConceptDrift(predictions, outcomes);

  // Generate alerts
  const alerts: string[] = [];

  if (accuracy < 0.75) {
    alerts.push(`Low accuracy: ${accuracy.toFixed(2)} (expected 0.82)`);
  }

  if (dataDrift > 0.3) {
    alerts.push(`Significant data drift detected: ${dataDrift.toFixed(2)}`);
  }

  if (conceptDrift > 0.3) {
    alerts.push(`Significant concept drift detected: ${conceptDrift.toFixed(2)}`);
  }

  // Store metrics
  await db.from('model_performance_metrics').insert({
    model_name: modelName,
    period_start: start,
    period_end: end,
    predictions: predictions.length,
    actual_outcomes: outcomes.length,
    accuracy,
    data_drift: dataDrift,
    concept_drift: conceptDrift,
    alerts,
  });

  // Alert if performance degraded
  if (alerts.length > 0) {
    await alertMLTeam({
      severity: 'high',
      message: `Model performance degradation detected for ${modelName}`,
      alerts,
      metrics: { accuracy, dataDrift, conceptDrift },
    });
  }

  return {
    modelName,
    period: { start, end },
    predictions: predictions.length,
    actualOutcomes: outcomes.length,
    accuracy,
    drift: { dataDrift, conceptDrift },
    alerts,
  };
}

// Run monitoring weekly
// cron: 0 0 * * 0 (every Sunday)
export async function runWeeklyMonitoring() {
  await monitorModelPerformance('voe-risk', 7);
  await monitorModelPerformance('hydroxyurea-dosing', 7);
}
```

---

## 7. Supabase-Specific Implementation

### 7.1 HIPAA Compliance with Supabase

**Prerequisites:**
- Supabase Team Plan or higher ($25/month minimum)
- Signed Business Associate Agreement (BAA)

**Steps to Enable HIPAA Compliance:**

1. **Contact Supabase for BAA**
   ```
   Email: support@supabase.com
   Subject: HIPAA BAA Request for [Your Organization]
   Include:
   - Organization name and EIN
   - Project ID
   - Billing plan
   ```

2. **Enable HIPAA Features in Dashboard**
   - Navigate to Settings > Security
   - Enable "HIPAA Compliance Mode"
   - Enable "Point-in-Time Recovery" (PITR)
   - Enable "SSL Enforcement"

3. **Configure Security Settings**
   ```sql
   -- Enable SSL only connections
   ALTER SYSTEM SET ssl = on;
   ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.2';

   -- Enable audit logging
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_connections = on;
   ALTER SYSTEM SET log_disconnections = on;
   ```

4. **Disable Non-HIPAA Features**
   - Disable Supabase AI editor (may send data to third-party)
   - Disable public access to storage buckets
   - Review and disable unnecessary extensions

### 7.2 Row Level Security (RLS) for PHI

**Critical:** RLS is the primary access control mechanism in Supabase

```sql
-- Enable RLS on all PHI tables
ALTER TABLE scd_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE voe_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_notes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Patients can only see their own data
CREATE POLICY "Patients can view own records"
  ON scd_patients
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Policy 2: Clinicians can see assigned patients
CREATE POLICY "Clinicians can view assigned patients"
  ON scd_patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_assignments
      WHERE clinician_id = auth.uid()
      AND patient_id = scd_patients.id
      AND active = true
    )
  );

-- Policy 3: Clinicians can update assigned patients
CREATE POLICY "Clinicians can update assigned patients"
  ON scd_patients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_assignments
      WHERE clinician_id = auth.uid()
      AND patient_id = scd_patients.id
      AND active = true
      AND permissions @> '["write"]'
    )
  );

-- Policy 4: Researchers can only see de-identified data
CREATE POLICY "Researchers can view de-identified data"
  ON scd_patients
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'researcher'
    AND is_deidentified = true
  );

-- Policy 5: Service role bypasses RLS (for server-side operations)
-- No policy needed - service role has full access
```

**Testing RLS Policies:**
```typescript
// apps/api/src/__tests__/security/rls.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Row Level Security', () => {
  it('should prevent patient from seeing other patients data', async () => {
    const patient1Client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Sign in as patient 1
    await patient1Client.auth.signInWithPassword({
      email: 'patient1@test.com',
      password: 'test',
    });

    // Try to access patient 2's data
    const { data, error } = await patient1Client
      .from('scd_patients')
      .select('*')
      .eq('id', 'patient-2-id')
      .single();

    // Should return empty (RLS blocks access)
    expect(data).toBeNull();
  });

  it('should allow clinician to see assigned patients only', async () => {
    const clinicianClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    await clinicianClient.auth.signInWithPassword({
      email: 'clinician@test.com',
      password: 'test',
    });

    // Should see assigned patients
    const { data: assigned } = await clinicianClient
      .from('scd_patients')
      .select('*')
      .eq('id', 'assigned-patient-id')
      .single();

    expect(assigned).toBeDefined();

    // Should NOT see unassigned patients
    const { data: unassigned } = await clinicianClient
      .from('scd_patients')
      .select('*')
      .eq('id', 'unassigned-patient-id')
      .single();

    expect(unassigned).toBeNull();
  });
});
```

### 7.3 Network Restrictions

**Requirement:** Limit database access to authorized IP addresses

```sql
-- In Supabase Dashboard: Settings > Database > Network Restrictions
-- Add allowed IP ranges:
-- - Production API server IPs
-- - Corporate VPN IP range
-- - Developer IPs (for development only)

-- Example using Supabase CLI
supabase network-restrictions add --cidr 203.0.113.0/24 --description "Production API servers"
supabase network-restrictions add --cidr 198.51.100.0/24 --description "Corporate VPN"
```

### 7.4 Audit Logging with Supabase

```sql
-- Supabase provides connection logs, but we need application-level audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  action TEXT CHECK (action IN ('create', 'read', 'update', 'delete')),
  resource_type TEXT,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- RLS: Only admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Audit log trigger function
CREATE OR REPLACE FUNCTION log_phi_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    user_role,
    action,
    resource_type,
    resource_id,
    old_value,
    new_value,
    status
  ) VALUES (
    auth.uid(),
    auth.jwt() ->> 'role',
    TG_OP,
    TG_TABLE_NAME,
    NEW.id::TEXT,
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    'success'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to PHI tables
CREATE TRIGGER audit_scd_patients
  AFTER INSERT OR UPDATE OR DELETE ON scd_patients
  FOR EACH ROW EXECUTE FUNCTION log_phi_access();

CREATE TRIGGER audit_voe_episodes
  AFTER INSERT OR UPDATE OR DELETE ON voe_episodes
  FOR EACH ROW EXECUTE FUNCTION log_phi_access();
```

### 7.5 Backup Configuration

```typescript
// Automated backup verification script
// scripts/verify-backups.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBackups() {
  console.log('Verifying Supabase PITR status...');

  // Check PITR is enabled (via Supabase Management API)
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}`,
      },
    }
  );

  const project = await response.json();

  if (project.database.pitr_enabled) {
    console.log('✅ PITR enabled');
  } else {
    console.error('❌ PITR not enabled - HIPAA compliance at risk!');
    process.exit(1);
  }

  // Verify we can perform test restore (use staging project)
  console.log('Testing backup restore capability...');
  // Implementation depends on your restore process

  console.log('✅ Backup verification complete');
}

verifyBackups();
```

---

## 8. Quick Reference Checklist

### Pre-Production Launch Checklist

#### Security & Compliance
- [ ] BAA signed with Supabase
- [ ] BAA signed with any AI providers (OpenAI/Anthropic) if sending PHI
- [ ] Multi-factor authentication (MFA) enabled for all users
- [ ] Row Level Security (RLS) enabled on all PHI tables
- [ ] SSL/TLS 1.2+ enforced for all connections
- [ ] Data encryption at rest enabled (AES-256)
- [ ] Audit logging implemented and tested
- [ ] Network restrictions configured (IP allowlist)
- [ ] Password policy enforces 12+ characters with complexity
- [ ] Session timeout configured (30 minutes recommended)
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Vulnerability scanning completed (within 6 months)
- [ ] Penetration testing completed (annually)

#### Data Standards
- [ ] FHIR API endpoints implemented (at minimum: Patient, Condition, Observation)
- [ ] SNOMED CT codes mapped for SCD conditions
- [ ] ICD-10 codes mapped for billing/reporting
- [ ] LOINC codes used for lab observations
- [ ] Citation system supports PMID and DOI references
- [ ] Data validation ensures clinical accuracy

#### AI/ML
- [ ] Model card documented and accessible
- [ ] Hallucination detection implemented for LLM responses
- [ ] RAG system uses verified medical literature
- [ ] Bias monitoring implemented
- [ ] Performance monitoring in production
- [ ] User warnings displayed on AI-generated content
- [ ] Explainability features implemented (show reasoning)

#### Backup & DR
- [ ] Point-in-Time Recovery (PITR) enabled
- [ ] Daily backups configured and tested
- [ ] Backup encryption verified
- [ ] Disaster recovery plan documented
- [ ] Recovery Time Objective (RTO) documented
- [ ] Recovery Point Objective (RPO) documented
- [ ] Quarterly backup restore tests scheduled

#### Monitoring & Alerting
- [ ] Uptime monitoring configured (target 99.9%+)
- [ ] Performance metrics tracked (p95 latency < 200ms)
- [ ] Error rate alerting configured (>5% triggers alert)
- [ ] PHI access monitoring implemented
- [ ] Unauthorized access alerts configured
- [ ] Security incident response plan documented
- [ ] On-call rotation established

#### Testing
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests for all API endpoints
- [ ] End-to-end tests for critical user flows
- [ ] Security testing completed (OWASP Top 10)
- [ ] Clinical validation completed with healthcare professionals
- [ ] Regression test suite established
- [ ] Load testing performed (expected traffic + 2x margin)

#### Documentation
- [ ] API documentation complete
- [ ] User guides for clinicians
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] HIPAA privacy notice provided to users
- [ ] Incident response procedures documented
- [ ] Runbooks for common operations
- [ ] Architecture diagrams up to date

#### Legal & Regulatory
- [ ] HIPAA compliance assessment completed
- [ ] Risk assessment documented
- [ ] Policies and procedures documented (retained 6+ years)
- [ ] Staff HIPAA training completed
- [ ] Business continuity plan documented
- [ ] Data retention policy defined
- [ ] Data destruction procedures documented
- [ ] Breach notification procedures documented

---

## 9. Resources & Citations

### Official Documentation

**HIPAA:**
- HHS HIPAA Homepage: https://www.hhs.gov/hipaa/
- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/
- 2025 Security Rule Updates: https://www.federalregister.gov/documents/2025/01/06/2024-30983

**FHIR:**
- HL7 FHIR R4: https://hl7.org/fhir/R4/
- US Core Implementation Guide: http://hl7.org/fhir/us/core/
- SMART on FHIR: https://smarthealthit.org/

**Terminology Standards:**
- SNOMED CT: https://www.snomed.org/
- LOINC: https://loinc.org/
- ICD-10-CM: https://www.cdc.gov/nchs/icd/icd-10-cm.htm

**FDA AI/ML:**
- AI/ML SaMD Action Plan: https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices
- Good Machine Learning Practice: https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development

**IEC 62304:**
- ISO/IEC 62304 Standard: https://www.iso.org/standard/38421.html
- Johner Institute Resources: https://blog.johner-institute.com/category/iec-62304-medical-software/

### Libraries and Tools

**Node.js/React:**
- fhir-kit-client: https://github.com/Vermonster/fhir-kit-client
- node-fhir-server-core: https://github.com/bluehalo/node-fhir-server-core
- fhir-react: https://github.com/1uphealth/fhir-react
- @supabase/supabase-js: https://supabase.com/docs/reference/javascript

**Security:**
- OWASP Node.js Security: https://www.nodejs-security.com/
- Supabase Security Best Practices: https://supabase.com/docs/guides/security

**Testing:**
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- k6 Load Testing: https://k6.io/

### Research Papers

**Bias in Medical AI:**
- "Bias in AI-based models for medical applications" (Nature Digital Medicine, 2023): https://www.nature.com/articles/s41746-023-00858-z
- "Bias recognition and mitigation strategies in AI healthcare" (Nature Digital Medicine, 2025): https://www.nature.com/articles/s41746-025-01503-7

**LLM Hallucinations:**
- "Detecting hallucinations in large language models using semantic entropy" (Nature, 2024): https://www.nature.com/articles/s41586-024-07421-0
- "Framework to assess clinical safety and hallucination rates of LLMs" (Nature Digital Medicine, 2025): https://www.nature.com/articles/s41746-025-01670-7

**FDA AI Devices:**
- "How AI is used in FDA-authorized medical devices" (Nature Digital Medicine, 2025): https://www.nature.com/articles/s41746-025-01800-1

### Industry Benchmarks

**Compliance Vendors:**
- Coalfire: https://www.coalfire.com/solutions/healthcare
- Clearwater Compliance: https://clearwatercompliance.com/
- Tevora: https://tevora.com/services/hipaa-compliance/

**Penetration Testing:**
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- NIST Penetration Testing: https://csrc.nist.gov/glossary/term/penetration_testing

### Community Resources

**Healthcare IT:**
- HIMSS (Healthcare IT News): https://www.himss.org/
- HealthIT.gov: https://www.healthit.gov/

**Open Source Healthcare:**
- Open Health Tools: https://openhealthtools.org/
- SMART Health IT Community: https://smarthealthit.org/community/

---

## Conclusion

Building a production-ready healthcare application requires careful attention to:

1. **HIPAA Compliance:** Mandatory encryption, access controls, audit logging, BAAs
2. **Security:** MFA, vulnerability scanning, penetration testing, incident response
3. **Clinical Standards:** FHIR, SNOMED, ICD-10, LOINC for interoperability
4. **Production Readiness:** 99.9% uptime, comprehensive monitoring, backup/DR
5. **Rigorous Testing:** 80%+ coverage, clinical validation, regression testing
6. **Responsible AI:** Hallucination detection, bias mitigation, transparency, monitoring

**Priority Implementation Order for AngstromSCD:**

**Phase 1 (Critical - Before Beta):**
1. Implement encryption (at rest and in transit)
2. Set up audit logging
3. Enable MFA
4. Configure RLS policies
5. Sign Supabase BAA

**Phase 2 (High Priority - Before Production):**
1. Implement FHIR API
2. Set up monitoring and alerting
3. Configure backups and test restore
4. Vulnerability scanning
5. Performance testing

**Phase 3 (Production Hardening):**
1. Penetration testing
2. Clinical validation
3. Bias monitoring for AI
4. Comprehensive documentation
5. Staff HIPAA training

**Phase 4 (Ongoing):**
1. Quarterly backup restore tests
2. Bi-annual vulnerability scans
3. Annual penetration testing
4. Monthly bias reports
5. Continuous performance monitoring

This document should be treated as a living reference and updated as regulations, technologies, and best practices evolve.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Next Review:** 2025-05-10 (6 months)
