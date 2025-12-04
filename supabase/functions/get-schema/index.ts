import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get tables
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables_info')
    
    // Get RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc('get_rls_policies')
    
    // Get functions
    const { data: functions, error: functionsError } = await supabase.rpc('get_db_functions')

    console.log('Tables:', tables, tablesError)
    console.log('Policies:', policies, policiesError)
    console.log('Functions:', functions, functionsError)

    return new Response(
      JSON.stringify({
        tables: tables || [],
        policies: policies || [],
        functions: functions || [],
        errors: {
          tables: tablesError?.message,
          policies: policiesError?.message,
          functions: functionsError?.message,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching schema:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})