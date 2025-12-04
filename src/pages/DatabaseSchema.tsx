import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Shield, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface RLSPolicy {
  table_name: string;
  policy_name: string;
  command: string;
  permissive: string;
  roles: string[];
  using_expression: string | null;
  with_check_expression: string | null;
}

interface DBFunction {
  function_name: string;
  arguments: string;
  return_type: string;
  function_definition: string;
}

interface SchemaData {
  tables: TableColumn[];
  policies: RLSPolicy[];
  functions: DBFunction[];
  errors: {
    tables?: string;
    policies?: string;
    functions?: string;
  };
}

const DatabaseSchema = () => {
  const [data, setData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke('get-schema');
      
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      
      setData(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  // Group columns by table
  const tablesByName = data?.tables.reduce((acc, col) => {
    if (!acc[col.table_name]) {
      acc[col.table_name] = [];
    }
    acc[col.table_name].push(col);
    return acc;
  }, {} as Record<string, TableColumn[]>) || {};

  // Group policies by table
  const policiesByTable = data?.policies.reduce((acc, policy) => {
    const tableName = policy.table_name.replace('public.', '');
    if (!acc[tableName]) {
      acc[tableName] = [];
    }
    acc[tableName].push(policy);
    return acc;
  }, {} as Record<string, RLSPolicy[]>) || {};

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchSchema} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Schema</h1>
          <p className="text-muted-foreground">View your Supabase tables, RLS policies, and functions</p>
        </div>
        <Button onClick={fetchSchema} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="functions" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Functions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          {Object.entries(tablesByName).map(([tableName, columns]) => (
            <Card key={tableName}>
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Database className="h-5 w-5 text-primary" />
                      {tableName}
                      <Badge variant="secondary" className="ml-2">
                        {columns.length} columns
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Nullable</TableHead>
                          <TableHead>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columns.map((col) => (
                          <TableRow key={col.column_name}>
                            <TableCell className="font-mono text-sm">{col.column_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{col.data_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={col.is_nullable === 'YES' ? 'secondary' : 'default'}>
                                {col.is_nullable === 'YES' ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-xs truncate">
                              {col.column_default || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {Object.entries(policiesByTable).map(([tableName, policies]) => (
            <Card key={tableName}>
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5 text-primary" />
                      {tableName}
                      <Badge variant="secondary" className="ml-2">
                        {policies.length} policies
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {policies.map((policy) => (
                      <div key={policy.policy_name} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{policy.policy_name}</span>
                          <Badge>{policy.command}</Badge>
                          <Badge variant={policy.permissive === 'PERMISSIVE' ? 'default' : 'destructive'}>
                            {policy.permissive}
                          </Badge>
                        </div>
                        {policy.using_expression && (
                          <div>
                            <span className="text-sm text-muted-foreground">USING: </span>
                            <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 overflow-x-auto">
                              {policy.using_expression}
                            </code>
                          </div>
                        )}
                        {policy.with_check_expression && (
                          <div>
                            <span className="text-sm text-muted-foreground">WITH CHECK: </span>
                            <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 overflow-x-auto">
                              {policy.with_check_expression}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          {data?.functions.map((func) => (
            <Card key={func.function_name}>
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Code className="h-5 w-5 text-primary" />
                      {func.function_name}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {func.return_type}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Arguments: </span>
                        <code className="text-sm">{func.arguments || 'none'}</code>
                      </div>
                      <ScrollArea className="h-64 w-full rounded border">
                        <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                          {func.function_definition}
                        </pre>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseSchema;