import { useEffect, useRef, useState, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
  const webcontainerRef = useRef<WebContainer | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'booting' | 'mounting' | 'installing' | 'running' | 'ready' | 'error'>('idle');
  const [output, setOutput] = useState<string>('');

  const appendOutput = (data: string) => {
    setOutput(prev => prev + data);
  };

  const boot = useCallback(async () => {
    if (webcontainerRef.current) return;
    try {
      setStatus('booting');
      const instance = await WebContainer.boot();
      webcontainerRef.current = instance;
      setStatus('idle');
      console.log('WebContainer booted');
    } catch (e) {
      console.error('WebContainer boot failed', e);
      setStatus('error');
      appendOutput(`\nBoot error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const mountAndRun = useCallback(async (files: any) => {
    if (!webcontainerRef.current) {
      await boot();
    }
    if (!webcontainerRef.current) return;

    try {
      setOutput('');
      setStatus('mounting');
      await webcontainerRef.current.mount(files);

      setStatus('installing');
      appendOutput('Installing dependencies...\n');
      const installProcess = await webcontainerRef.current.spawn('npm', ['install']);

      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          appendOutput(data);
        }
      }));

      const installCode = await installProcess.exit;
      if (installCode !== 0) {
        throw new Error(`Installation failed with code ${installCode}`);
      }

      setStatus('running');
      appendOutput('Starting dev server...\n');
      const devProcess = await webcontainerRef.current.spawn('npm', ['run', 'dev']);

      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          appendOutput(data);
        }
      }));

      webcontainerRef.current.on('server-ready', (port, url) => {
        console.log(`Server ready at ${url} on port ${port}`);
        setUrl(url);
        setStatus('ready');
      });
    } catch (e) {
      console.error('WebContainer run failed', e);
      setStatus('error');
      appendOutput(`\nRun error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [boot]);

  return {
    url,
    status,
    output,
    mountAndRun,
    instance: webcontainerRef.current
  };
}
