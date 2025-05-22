import { useEffect, useState } from 'react';

export default function Troubleshoot() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiData, setApiData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se o servidor está funcionando
    fetch('/api/settings')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setServerStatus('online');
        setApiData(data);
      })
      .catch(err => {
        setServerStatus('offline');
        setError(err.message);
      });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Diagnóstico do Sistema</h1>
      
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-semibold">Status do Servidor API</h2>
        <p className="my-2">
          Status: {' '}
          {serverStatus === 'checking' && 'Verificando...'}
          {serverStatus === 'online' && (
            <span className="text-green-600 font-bold">Online</span>
          )}
          {serverStatus === 'offline' && (
            <span className="text-red-600 font-bold">Offline</span>
          )}
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-2 rounded mt-2">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {apiData && (
        <div className="mb-4 p-4 border rounded">
          <h2 className="text-xl font-semibold">Dados da API</h2>
          <pre className="bg-gray-100 p-2 mt-2 overflow-auto max-h-60 rounded">
            {JSON.stringify(apiData, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Informações do Ambiente</h2>
        <ul className="list-disc pl-5">
          <li>URL da página: {window.location.href}</li>
          <li>User Agent: {navigator.userAgent}</li>
          <li>Data/Hora: {new Date().toLocaleString()}</li>
        </ul>
      </div>
    </div>
  );
}