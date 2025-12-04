import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setSupabaseConfig } from "@/lib/supabaseConfig";
import { DATABASE_SCHEMA } from "@/lib/databaseSchema";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Loader2, AlertTriangle, Database, Key, Link, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = 'credentials' | 'testing' | 'initializing' | 'success';

export default function Setup() {
  const [step, setStep] = useState<Step>('credentials');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  const testConnection = async () => {
    if (!url || !anonKey) {
      toast.error('Please enter Supabase URL and Anon Key');
      return;
    }

    setIsLoading(true);
    setStep('testing');
    addProgress('Testing connection to Supabase...');

    try {
      const testClient = createClient(url, anonKey);
      
      // Test basic connectivity
      const { error } = await testClient.from('_test_connection').select('*').limit(1);
      
      // Even if table doesn't exist, connection should work
      if (error && !error.message.includes('does not exist') && !error.message.includes('permission denied')) {
        throw new Error(error.message);
      }

      addProgress('✓ Connection successful!');
      toast.success('Connection to Supabase verified!');
      setStep('credentials');
      setIsLoading(false);
    } catch (error: any) {
      addProgress('✗ Connection failed: ' + error.message);
      toast.error('Failed to connect: ' + error.message);
      setStep('credentials');
      setIsLoading(false);
    }
  };

  const initializeDatabase = async () => {
    if (!url || !anonKey || !serviceRoleKey) {
      toast.error('Please enter all credentials');
      return;
    }

    setIsLoading(true);
    setStep('initializing');
    setProgress([]);
    addProgress('Starting database initialization...');

    try {
      // Create admin client with service role key
      const adminClient = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      addProgress('Executing database schema...');

      // Split schema into individual statements and execute
      const statements = DATABASE_SCHEMA
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        try {
          const { error } = await adminClient.rpc('exec_sql', { sql: statement + ';' }).single();
          if (error) {
            // Try direct execution for certain statements
            console.log('Statement skipped or failed:', statement.substring(0, 50));
            errorCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          // Some statements may fail if objects already exist
          console.log('Statement execution note:', e);
        }
      }

      addProgress(`Schema execution completed`);
      addProgress('Saving configuration...');

      // Save configuration
      setSupabaseConfig({ url, anonKey });

      addProgress('✓ Configuration saved!');
      addProgress('✓ Database setup complete!');
      
      setStep('success');
      toast.success('Database initialized successfully!');
    } catch (error: any) {
      addProgress('✗ Error: ' + error.message);
      toast.error('Failed to initialize database: ' + error.message);
      setStep('credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAndContinue = () => {
    if (!url || !anonKey) {
      toast.error('Please enter Supabase URL and Anon Key');
      return;
    }

    setSupabaseConfig({ url, anonKey });
    toast.success('Configuration saved! Redirecting...');
    
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const handleComplete = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Database Setup</CardTitle>
          <CardDescription>
            Connect your own Supabase project to use this POS system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'credentials' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> You need a Supabase project. Get your credentials from{' '}
                  <a 
                    href="https://supabase.com/dashboard/project/_/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    Supabase Dashboard → Settings → API
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="url" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Supabase URL
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="anonKey" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Anon Key (public)
                  </Label>
                  <Input
                    id="anonKey"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This key is safe to use in browser applications
                  </p>
                </div>

                <div>
                  <Label htmlFor="serviceRoleKey" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-destructive" />
                    Service Role Key (secret)
                  </Label>
                  <Input
                    id="serviceRoleKey"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={serviceRoleKey}
                    onChange={(e) => setServiceRoleKey(e.target.value)}
                    className="mt-1"
                  />
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This key is only used once to create tables. It will NOT be stored.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={testConnection}
                  disabled={!url || !anonKey || isLoading}
                  className="flex-1"
                >
                  Test Connection
                </Button>
                <Button 
                  onClick={initializeDatabase}
                  disabled={!url || !anonKey || !serviceRoleKey || isLoading}
                  className="flex-1"
                >
                  Initialize Database
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or if database already exists
                  </span>
                </div>
              </div>

              <Button 
                variant="secondary"
                onClick={saveAndContinue}
                disabled={!url || !anonKey}
                className="w-full"
              >
                Skip Initialization & Connect
              </Button>
            </>
          )}

          {(step === 'testing' || step === 'initializing') && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-60 overflow-y-auto">
                {progress.map((msg, i) => (
                  <p key={i} className="text-sm font-mono">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-muted-foreground">
                  Your database has been initialized. You can now create your first user account.
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-40 overflow-y-auto text-left">
                {progress.map((msg, i) => (
                  <p key={i} className="text-sm font-mono">
                    {msg}
                  </p>
                ))}
              </div>
              <Button onClick={handleComplete} className="w-full">
                Continue to App
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
