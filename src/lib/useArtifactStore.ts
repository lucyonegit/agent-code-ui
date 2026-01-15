/**
 * Artifact 状态管理 Store
 * 使用 zustand 实现跨组件通信
 */

import { create } from 'zustand';
import type { ArtifactInfo } from '../types/events';
import { getReactArtifactContent, getPlannerArtifactContent } from '../services/sseClient';

interface ArtifactStore {
  // 侧边栏状态
  isOpen: boolean;
  // 侧边栏宽度
  sidebarWidth: number;
  // 当前查看的 artifact
  currentArtifact: ArtifactInfo | null;
  // 文件内容
  content: string;
  // 加载状态
  loading: boolean;
  // 会话信息（用于 API 调用）
  conversationId: string | null;
  mode: 'react' | 'plan' | null;

  // Actions
  openArtifact: (conversationId: string, mode: 'react' | 'plan', artifact: ArtifactInfo) => Promise<void>;
  setSidebarWidth: (width: number) => void;
  setContent: (content: string) => void;
  setLoading: (loading: boolean) => void;
  close: () => void;
}

export const useArtifactStore = create<ArtifactStore>((set) => ({
  // Initial state
  isOpen: false,
  sidebarWidth: 500, // 默认宽度
  currentArtifact: null,
  content: '',
  loading: false,
  conversationId: null,
  mode: null,

  // Actions
  openArtifact: async (conversationId: string, mode: 'react' | 'plan', artifact: ArtifactInfo) => {
    set({
      isOpen: true,
      currentArtifact: artifact,
      conversationId,
      mode,
      loading: true,
      content: '',
    });

    try {
      // 根据模式调用对应的 API
      const content = mode === 'react'
        ? await getReactArtifactContent(conversationId, artifact.name)
        : await getPlannerArtifactContent(conversationId, artifact.name);

      set({ content, loading: false });
    } catch (error) {
      console.error('Failed to load artifact content:', error);
      set({ content: '加载失败', loading: false });
    }
  },

  setSidebarWidth: (width: number) => set({ sidebarWidth: width }),

  setContent: (content: string) => set({ content }),

  setLoading: (loading: boolean) => set({ loading }),

  close: () => set({
    isOpen: false,
    currentArtifact: null,
    content: '',
    loading: false,
    conversationId: null,
    mode: null,
  }),
}));
