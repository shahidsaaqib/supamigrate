import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sql, supabaseUrl, serviceRoleKey } = await req.json();

    if (!sql || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sql, supabaseUrl, serviceRoleKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Initializing database for:', supabaseUrl);

    // Create admin client with provided credentials
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Execute the SQL using the admin client
    // Note: This requires the exec_sql function to exist, or we use raw SQL
    const { data, error } = await adminClient.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('SQL execution error:', error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Database initialization completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Database initialized successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
