# Database Migration Workflow

## 🚨 IMPORTANT: Never Ask User to Copy-Paste SQL

**Always use the automated script to apply SQL files.**

## How to Apply SQL Migrations

### Simple Command:
```bash
pnpm db:apply <sql-file-path>
```

### Examples:
```bash
# Apply a specific migration file
pnpm db:apply APPLY_ALL_NEW_MIGRATIONS.sql

# Apply from supabase migrations folder
pnpm db:apply supabase/migrations/20251025160001_support_multi_gym_membership.sql

# Apply any SQL file
pnpm db:apply fix-policies.sql
```

## Prerequisites

The `.env` file must contain:
```bash
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres
```

Get this from: Supabase Dashboard → "Connect" button → Connection String (URI)

## When to Use This

- ✅ Applying new migration files
- ✅ Running fix scripts
- ✅ Executing any SQL that modifies the database
- ✅ Files with complex PL/pgSQL functions
- ✅ Large SQL files (100+ lines)

## What the Script Does

1. Attempts to use Supabase CLI first
2. Falls back to `psql` if needed
3. Handles complex PL/pgSQL with `$$` delimiters
4. Shows clear progress and error messages

## Script Location

`scripts/apply-sql.sh` - Handles all SQL execution automatically

## NPM Scripts

- `pnpm db:apply <file>` - Apply any SQL file
- Can add more shortcuts in package.json as needed

---

**AI Note:** When generating SQL migrations or fixes, always use `pnpm db:apply <file>` instead of instructing the user to copy-paste into Supabase dashboard.

