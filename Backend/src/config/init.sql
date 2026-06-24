-- NEWSFLOW — Full Database Initialization Script
-- Run this script once to set up the entire database schema.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- ENUMS (safe to re-run — skips if already exists)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Student', 'Faculty', 'Admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM (
    'Draft', 'Pending', 'Approved', 'Rejected', 'Selected', 'Published', 'Archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE newsletter_status AS ENUM ('Draft', 'Published', 'Archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_type AS ENUM (
    'PLACEMENT', 'RESEARCH', 'SPORTS', 'CERTIFICATION',
    'WORKSHOP', 'GUEST_LECTURE', 'FACULTY_ACHIEVEMENT', 'STUDENT_ACHIEVEMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- TABLE 1: Departments
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Departments (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE
);

-- ─────────────────────────────────────────────
-- TABLE 2: Users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES Departments(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  role          user_role NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 3: Submissions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES Users(id) ON DELETE CASCADE,
  type        submission_type NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  metadata    JSONB,
  status      submission_status DEFAULT 'Draft',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 4: Submission_Files
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Submission_Files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES Submissions(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  file_type     VARCHAR(50),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 5: Approval_History (full audit log)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Approval_History (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES Submissions(id) ON DELETE CASCADE,
  admin_id      UUID REFERENCES Users(id) ON DELETE SET NULL,
  action        VARCHAR(50) NOT NULL, -- 'Approved' | 'Rejected'
  remarks       TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 6: Newsletters (department-scoped, unique per month/year/dept)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Newsletters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES Departments(id) ON DELETE CASCADE,
  month         VARCHAR(20) NOT NULL,
  year          INT NOT NULL,
  status        newsletter_status DEFAULT 'Draft',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year, department_id)
);

-- ─────────────────────────────────────────────
-- TABLE 7: Newsletter_Items (admin-curated submissions + order)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Newsletter_Items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES Newsletters(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES Submissions(id) ON DELETE CASCADE,
  position      INT NOT NULL,
  section       VARCHAR(100) -- 'Student Achievements', 'Placements', etc.
);

-- ─────────────────────────────────────────────
-- TABLE 8: Newsletter_Files (generated PDF / future HTML paths)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Newsletter_Files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES Newsletters(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  file_type     VARCHAR(50), -- 'PDF' | 'HTML' | 'EMAIL'
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 9: Notifications (DB-first, no WebSockets in MVP)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES Users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL, -- 'APPROVAL' | 'REJECTION' | 'PUBLICATION' | 'SYSTEM'
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────

-- Departments
INSERT INTO Departments (name) VALUES ('AIML'), ('CSE')
ON CONFLICT (name) DO NOTHING;

-- Demo Users
-- Note: No passwords — mock auth only for MVP
INSERT INTO Users (id, department_id, name, email, role) VALUES
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'AIML'), 'Riya Sharma',   'riya.aiml@newsflow.dev',    'Student'),
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'AIML'), 'Arjun Mehta',   'arjun.aiml@newsflow.dev',   'Student'),
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'AIML'), 'Dr. Priya Nair','priya.aiml@newsflow.dev',   'Faculty'),
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'AIML'), 'Admin AIML',    'admin.aiml@newsflow.dev',   'Admin'),
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'CSE'),  'Sneha Patel',   'sneha.cse@newsflow.dev',    'Student'),
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'CSE'),  'Dr. Ramesh Kumar','ramesh.cse@newsflow.dev', 'Faculty'),
  (gen_random_uuid(), (SELECT id FROM Departments WHERE name = 'CSE'),  'Admin CSE',     'admin.cse@newsflow.dev',    'Admin')
ON CONFLICT (email) DO NOTHING;
