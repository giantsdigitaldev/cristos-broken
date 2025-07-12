#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.error('🔧 MCP Supabase Server Starting...');
console.error(`URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.error(`Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
console.error(`Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// MCP Server implementation
class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'supabase-database',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Database Schema Operations
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_table':
            return await this.createTable(args);
          case 'drop_table':
            return await this.dropTable(args);
          case 'create_rls_policy':
            return await this.createRLSPolicy(args);
          case 'drop_rls_policy':
            return await this.dropRLSPolicy(args);
          case 'enable_rls':
            return await this.enableRLS(args);
          case 'disable_rls':
            return await this.disableRLS(args);
          case 'execute_sql':
            return await this.executeSQL(args);
          case 'list_tables':
            return await this.listTables(args);
          case 'get_table_schema':
            return await this.getTableSchema(args);
          case 'insert_data':
            return await this.insertData(args);
          case 'update_data':
            return await this.updateData(args);
          case 'delete_data':
            return await this.deleteData(args);
          case 'query_data':
            return await this.queryData(args);
          case 'create_index':
            return await this.createIndex(args);
          case 'drop_index':
            return await this.dropIndex(args);
          case 'create_function':
            return await this.createFunction(args);
          case 'drop_function':
            return await this.dropFunction(args);
          case 'create_trigger':
            return await this.createTrigger(args);
          case 'drop_trigger':
            return await this.dropTrigger(args);
          case 'backup_table':
            return await this.backupTable(args);
          case 'restore_table':
            return await this.restoreTable(args);
          case 'test_connection':
            return await this.testConnection(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
        };
      }
    });

    // Tool definitions
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'test_connection',
            description: 'Test the Supabase connection and list basic info',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'create_table',
            description: 'Create a new table in the database',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string', description: 'Name of the table to create' },
                columns: { 
                  type: 'array', 
                  description: 'Array of column definitions',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      constraints: { type: 'string' }
                    }
                  }
                }
              },
              required: ['table_name', 'columns']
            }
          },
          {
            name: 'drop_table',
            description: 'Drop a table from the database',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string', description: 'Name of the table to drop' }
              },
              required: ['table_name']
            }
          },
          {
            name: 'create_rls_policy',
            description: 'Create a Row Level Security policy',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string' },
                policy_name: { type: 'string' },
                operation: { type: 'string', enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'] },
                definition: { type: 'string' }
              },
              required: ['table_name', 'policy_name', 'operation', 'definition']
            }
          },
          {
            name: 'enable_rls',
            description: 'Enable Row Level Security on a table',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string' }
              },
              required: ['table_name']
            }
          },
          {
            name: 'execute_sql',
            description: 'Execute raw SQL commands',
            inputSchema: {
              type: 'object',
              properties: {
                sql: { type: 'string', description: 'SQL command to execute' }
              },
              required: ['sql']
            }
          },
          {
            name: 'list_tables',
            description: 'List all tables in the database',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_table_schema',
            description: 'Get the schema of a specific table',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string' }
              },
              required: ['table_name']
            }
          },
          {
            name: 'insert_data',
            description: 'Insert data into a table',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string' },
                data: { type: 'object' }
              },
              required: ['table_name', 'data']
            }
          },
          {
            name: 'query_data',
            description: 'Query data from a table',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: { type: 'string' },
                select: { type: 'string', default: '*' },
                where: { type: 'string' },
                order_by: { type: 'string' },
                limit: { type: 'number' }
              },
              required: ['table_name']
            }
          }
        ]
      };
    });
  }

  // Tool implementations
  async testConnection(args) {
    console.error('🧪 Testing Supabase connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('⚠️  Connection test result:', error.message);
      } else {
        console.error('✅ Supabase connection successful');
      }
      
      // Test SQL execution capability
      const { data: sqlTest, error: sqlError } = await supabase.rpc('exec_sql', {
        sql: 'SELECT current_database() as db_name, version() as pg_version'
      });
      
      if (sqlError) {
        console.error('⚠️  SQL execution test:', sqlError.message);
        console.error('   You may need to create the exec_sql function in Supabase');
      } else {
        console.error('✅ SQL execution capability confirmed');
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `🔧 Supabase Connection Test Results:\n\n` +
                  `✅ Basic connection: ${error ? 'Failed' : 'Success'}\n` +
                  `✅ SQL execution: ${sqlError ? 'Failed' : 'Success'}\n\n` +
                  `Database: ${sqlTest?.[0]?.db_name || 'Unknown'}\n` +
                  `PostgreSQL: ${sqlTest?.[0]?.pg_version?.split(' ')[0] || 'Unknown'}\n\n` +
                  `Ready for database operations!`
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Connection test failed: ${error.message}`,
          },
        ],
      };
    }
  }

  async createTable(args) {
    const { table_name, columns } = args;
    
    let sql = `CREATE TABLE IF NOT EXISTS ${table_name} (`;
    const columnDefs = columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.constraints) {
        def += ` ${col.constraints}`;
      }
      return def;
    });
    sql += columnDefs.join(', ') + ')';

    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`Failed to create table: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Table '${table_name}' created successfully with ${columns.length} columns`,
        },
      ],
    };
  }

  async dropTable(args) {
    const { table_name } = args;
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `DROP TABLE IF EXISTS ${table_name} CASCADE` 
    });
    
    if (error) {
      throw new Error(`Failed to drop table: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Table '${table_name}' dropped successfully`,
        },
      ],
    };
  }

  async createRLSPolicy(args) {
    const { table_name, policy_name, operation, definition } = args;
    
    const sql = `
      CREATE POLICY "${policy_name}" ON "${table_name}"
      FOR ${operation}
      USING (${definition})
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`Failed to create RLS policy: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ RLS policy '${policy_name}' created successfully on table '${table_name}'`,
        },
      ],
    };
  }

  async enableRLS(args) {
    const { table_name } = args;
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `ALTER TABLE "${table_name}" ENABLE ROW LEVEL SECURITY` 
    });
    
    if (error) {
      throw new Error(`Failed to enable RLS: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Row Level Security enabled on table '${table_name}'`,
        },
      ],
    };
  }

  async executeSQL(args) {
    const { sql } = args;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ SQL executed successfully:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  async listTables(args) {
    const sql = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`Failed to list tables: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `📋 Database tables:\n${data.map(row => `- ${row.table_name}`).join('\n')}`,
        },
      ],
    };
  }

  async getTableSchema(args) {
    const { table_name } = args;
    
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${table_name}'
      ORDER BY ordinal_position
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`Failed to get table schema: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `📋 Schema for table '${table_name}':\n${data.map(col => 
            `- ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ''}${col.column_default ? ` default: ${col.column_default}` : ''}`
          ).join('\n')}`,
        },
      ],
    };
  }

  async insertData(args) {
    const { table_name, data } = args;
    
    const { data: result, error } = await supabase
      .from(table_name)
      .insert(data)
      .select();
    
    if (error) {
      throw new Error(`Failed to insert data: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Data inserted successfully into '${table_name}':\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async queryData(args) {
    const { table_name, select = '*', where, order_by, limit } = args;
    
    let query = supabase.from(table_name).select(select);
    
    if (where) {
      query = query.filter(where);
    }
    
    if (order_by) {
      query = query.order(order_by);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to query data: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `📋 Query results from '${table_name}':\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  async createIndex(args) {
    const { table_name, index_name, columns } = args;
    
    const sql = `CREATE INDEX IF NOT EXISTS "${index_name}" ON "${table_name}" (${columns.join(', ')})`;
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`Failed to create index: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Index '${index_name}' created successfully on table '${table_name}'`,
        },
      ],
    };
  }

  async createFunction(args) {
    const { function_name, function_body } = args;
    
    const { error } = await supabase.rpc('exec_sql', { sql: function_body });
    
    if (error) {
      throw new Error(`Failed to create function: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Function '${function_name}' created successfully`,
        },
      ],
    };
  }

  async backupTable(args) {
    const { table_name } = args;
    const backup_table = `${table_name}_backup_${Date.now()}`;
    
    const sql = `CREATE TABLE "${backup_table}" AS SELECT * FROM "${table_name}"`;
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw new Error(`Failed to backup table: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Table '${table_name}' backed up as '${backup_table}'`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✅ Supabase MCP Server started and ready');
  }
}

// Start the server
const server = new SupabaseMCPServer();
server.run().catch(console.error); 