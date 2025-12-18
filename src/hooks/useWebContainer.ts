import { useEffect, useRef, useState, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
  const webcontainerRef = useRef<WebContainer | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'booting' | 'mounting' | 'installing' | 'running' | 'ready' | 'error'>('idle');
  const [output, setOutput] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0); // 用于强制刷新 iframe
  const devProcessRef = useRef<any>(null);
  const isServerRunningRef = useRef(false);

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

  /**
   * 检测 package.json 依赖是否变化
   */
  const hasDependencyChanged = useCallback((oldTree: any, newTree: any): boolean => {
    try {
      const oldPkg = oldTree?.['package.json']?.file?.contents;
      const newPkg = newTree?.['package.json']?.file?.contents;
      if (!oldPkg || !newPkg) return true;

      const oldDeps = JSON.parse(oldPkg).dependencies || {};
      const newDeps = JSON.parse(newPkg).dependencies || {};

      // 检查是否有新增或修改的依赖
      for (const key of Object.keys(newDeps)) {
        if (oldDeps[key] !== newDeps[key]) {
          return true;
        }
      }
      return false;
    } catch {
      return true; // 解析失败则重新安装
    }
  }, []);

  /**
   * 首次挂载并启动开发服务器
   */
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
      devProcessRef.current = devProcess;

      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          appendOutput(data);
        }
      }));

      webcontainerRef.current.on('server-ready', (port, url) => {
        console.log(`Server ready at ${url} on port ${port}`);
        setUrl(url);
        setStatus('ready');
        isServerRunningRef.current = true;
      });
    } catch (e) {
      console.error('WebContainer run failed', e);
      setStatus('error');
      appendOutput(`\nRun error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [boot]);

  /**
   * 增量更新文件 - 用于多轮对话时的代码更新
   * 利用 Vite HMR 自动检测变化并刷新
   */
  const remount = useCallback(async (files: any, previousTree?: any) => {
    if (!webcontainerRef.current) {
      // 如果容器未启动，则走首次挂载流程
      return mountAndRun(files);
    }

    try {
      setStatus('mounting');
      appendOutput('\n--- Updating project files ---\n');

      // 挂载新文件，Vite HMR 会自动检测变化
      await webcontainerRef.current.mount(files);

      // 检查依赖是否变化，如果变化则重新安装
      if (previousTree && hasDependencyChanged(previousTree, files)) {
        setStatus('installing');
        appendOutput('Dependencies changed, reinstalling...\n');
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
      }

      // 如果服务器已在运行，强制刷新 iframe
      if (isServerRunningRef.current && url) {
        setStatus('ready');
        appendOutput('Files updated. Forcing page refresh...\n');
        // 触发 iframe 强制刷新
        setRefreshKey(prev => prev + 1);
      } else {
        // 服务器未运行，需要启动
        setStatus('running');
        appendOutput('Starting dev server...\n');
        const devProcess = await webcontainerRef.current.spawn('npm', ['run', 'dev']);
        devProcessRef.current = devProcess;

        devProcess.output.pipeTo(new WritableStream({
          write(data) {
            appendOutput(data);
          }
        }));

        webcontainerRef.current.on('server-ready', (port, newUrl) => {
          console.log(`Server ready at ${newUrl} on port ${port}`);
          setUrl(newUrl);
          setStatus('ready');
          isServerRunningRef.current = true;
        });
      }
    } catch (e) {
      console.error('WebContainer remount failed', e);
      setStatus('error');
      appendOutput(`\nRemount error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [boot, mountAndRun, hasDependencyChanged, url]);

  return {
    url,
    status,
    output,
    refreshKey,
    mountAndRun,
    remount,
    hasDependencyChanged,
    instance: webcontainerRef.current
  };
}
