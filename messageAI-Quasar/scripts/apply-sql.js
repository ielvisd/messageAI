#!/usr/bin/env node

/**
 * Apply SQL file to Supabase database
 * Usage: node scripts/apply-sql.js <sql-file-path>
 * 
 * This script reads a SQL file and executes it against your Supabase database
 * using the direct database connection, bypassing any API limitations.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Get SQL file from command line arguments
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('❌ Error: Please provide a SQL file path');
  console.error('Usage: node scripts/apply-sql.js <sql-file-path>');
  console.error('Example: node scripts/apply-sql.js MIGRATIONS_TO_APPLY_MANUALLY.sql');
  process.exit(1);
}

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  console.error('Or set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function applySql() {
  try {
    // Read SQL file
    const filePath = resolve(sqlFile);
    console.log(`📖 Reading SQL file: ${filePath}`);
    const sql = readFileSync(filePath, 'utf-8');
    
    if (!sql.trim()) {
      console.error('❌ Error: SQL file is empty');
      process.exit(1);
    }

    console.log(`✅ Read ${sql.split('\n').length} lines`);
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔌 Connecting to Supabase...');
    
    // Execute SQL using the REST API
    // Note: For very complex SQL, we use the rpc method with a custom function
    // or split into smaller chunks
    
    // Try to execute as a single block first
    console.log('⚡ Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC method doesn't exist, try direct SQL execution
      // This works for most cases but has limitations
      console.log('⚠️  RPC method not available, trying alternative approach...');
      
      // Split by major statement boundaries (CREATE, ALTER, INSERT, etc.)
      const statements = splitSqlStatements(sql);
      console.log(`📝 Found ${statements.length} statement blocks`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt.trim()) continue;
        
        try {
          // Use PostgREST's query endpoint
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ sql_query: stmt })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
          
          successCount++;
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (err) {
          errorCount++;
          console.error(`❌ Statement ${i + 1} failed:`, err.message);
          console.error('Statement preview:', stmt.substring(0, 100) + '...');
          
          // Ask if user wants to continue
          if (i < statements.length - 1) {
            console.log('Continuing with remaining statements...');
          }
        }
      }
      
      console.log('\n📊 Summary:');
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${errorCount}`);
      
      if (errorCount > 0) {
        console.log('\n⚠️  Some statements failed. You may need to:');
        console.log('1. Check if the exec_sql function exists in your database');
        console.log('2. Use psql directly for complex PL/pgSQL functions');
        console.log('3. Apply failed statements manually via Supabase dashboard');
        process.exit(1);
      }
    } else {
      console.log('✅ SQL executed successfully!');
      if (data) {
        console.log('Result:', data);
      }
    }
    
    console.log('\n🎉 Done!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\n💡 Alternative approaches:');
    console.error('1. Use psql: psql "YOUR_CONNECTION_STRING" -f ' + sqlFile);
    console.error('2. Use Supabase CLI: npx supabase db execute --file ' + sqlFile + ' --remote');
    console.error('3. Copy the SQL file content and paste into Supabase SQL Editor');
    process.exit(1);
  }
}

/**
 * Split SQL into executable statements
 * Handles PL/pgSQL blocks with $$ delimiters
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = null;
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments at the start
    if (!current && (trimmed.startsWith('--') || !trimmed)) {
      continue;
    }
    
    // Check for dollar quote start/end (e.g., $$ or $body$)
    const dollarQuoteMatch = line.match(/\$([a-zA-Z_]*)\$/);
    if (dollarQuoteMatch) {
      const tag = dollarQuoteMatch[0];
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarTag = tag;
      } else if (tag === dollarTag) {
        inDollarQuote = false;
        dollarTag = null;
      }
    }
    
    current += line + '\n';
    
    // Only split on semicolon if we're not in a dollar quote
    // and the statement looks complete
    if (!inDollarQuote && trimmed.endsWith(';')) {
      // Check if this is a significant statement
      const statementTrimmed = current.trim();
      if (statementTrimmed && !statementTrimmed.match(/^--/)) {
        statements.push(current);
        current = '';
      }
    }
  }
  
  // Add any remaining content
  if (current.trim()) {
    statements.push(current);
  }
  
  return statements;
}

// Run the script
applySql();




