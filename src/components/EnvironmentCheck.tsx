import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Loader, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

const EnvironmentCheck: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const isConfigured = supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'https://your-project-ref.supabase.co' && 
    supabaseAnonKey !== 'your-anon-key-here';

  useEffect(() => {
    const checkConnection = async () => {
      if (!isConfigured) {
        setConnectionStatus('error');
        setErrorMessage('Supabase credentials not configured');
        return;
      }

      try {
        // Test the connection by making a simple query
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);

        if (error) {
          throw error;
        }

        setConnectionStatus('connected');
      } catch (error) {
        console.error('Supabase connection error:', error);
        setConnectionStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
      }
    };

    checkConnection();
  }, [isConfigured]);

  if (connectionStatus === 'connected') {
    return null; // Don't show anything if properly connected
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 p-4 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start space-x-3">
          {connectionStatus === 'checking' ? (
            <Loader className="h-5 w-5 text-yellow-600 animate-spin mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          )}
          
          <div className="flex-1">
            <div className="text-sm text-yellow-800">
              <strong>
                {connectionStatus === 'checking' 
                  ? 'Checking Supabase Connection...' 
                  : 'Supabase Configuration Required'
                }
              </strong>
            </div>
            
            {connectionStatus === 'error' && (
              <div className="mt-2 text-sm text-yellow-700">
                {!isConfigured ? (
                  <div>
                    <p className="mb-2">Please set up your Supabase environment variables:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Create a <code className="bg-yellow-100 px-1 rounded">.env</code> file in your project root</li>
                      <li>Add your Supabase URL and anonymous key</li>
                      <li>Restart the development server</li>
                    </ol>
                    <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                      <p className="font-medium mb-1">Example .env file:</p>
                      <pre className="text-xs">
{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">Connection Error: {errorMessage}</p>
                    <p>Please check your Supabase credentials and ensure your project is active.</p>
                  </div>
                )}
                
                <div className="mt-3 flex items-center space-x-4">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Supabase Dashboard
                  </a>
                  <a
                    href="https://supabase.com/docs/guides/getting-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Setup Guide
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentCheck;