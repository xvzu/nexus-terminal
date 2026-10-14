<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TerminalSyncMode } from '../types/sftp.types';
import MobileFileManagerHeader from './MobileFileManagerHeader.vue';

const props = defineProps<{
  currentPath: string;
  isConnected: boolean;
  isLoading: boolean;
  isMobile: boolean;
  isMultiSelectMode: boolean;
  showPopupFileEditor: boolean;
  searchQuery: string;
  isSearchActive: boolean;
  isCompactMode?: boolean;
  showDirectoryTree?: boolean;
  viewMode?: 'list' | 'tile';
  terminalSyncMode?: TerminalSyncMode;
}>();

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:isSearchActive', value: boolean): void;
  (e: 'toggle-compact-mode'): void;
  (e: 'toggle-directory-tree'): void;
  (e: 'toggle-view-mode'): void;
  (e: 'cd-to-terminal'): void;
  (e: 'cycle-terminal-sync-mode'): void;
  (e: 'open-popup-editor'): void;
  (e: 'upload-files'): void;
  (e: 'new-folder'): void;
  (e: 'new-file'): void;
  (e: 'toggle-multi-select'): void;
  (e: 'keydown-search', event: KeyboardEvent): void;
}>();

const { t } = useI18n();

// --- 4态终端路径同步按钮图标、样式与文案 ---
const effectiveSyncMode = computed<TerminalSyncMode>(() => props.terminalSyncMode ?? 'off');

const terminalSyncButtonIcon = computed(() => {
  switch (effectiveSyncMode.value) {
    case 'bidirectional':
      return 'fas fa-up-down text-xs';
    case 'to_terminal':
      return 'fas fa-arrow-down text-xs';
    case 'from_terminal':
      return 'fas fa-arrow-up text-xs';
    case 'off':
    default:
      return 'fas fa-link-slash text-xs text-text-secondary/70';
  }
});

const terminalSyncButtonClass = computed(() => {
  if (effectiveSyncMode.value !== 'off') {
    return 'bg-primary/20 text-primary font-medium hover:bg-primary/30 ring-1 ring-primary/40';
  }
  return 'text-text-secondary hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground';
});

const terminalSyncButtonTitle = computed(() => {
  switch (effectiveSyncMode.value) {
    case 'bidirectional':
      return t('fileManager.sync.modeBidirectional', '路径同步：双向互通 (点击切换到同步到终端)');
    case 'to_terminal':
      return t('fileManager.sync.modeToTerminal', '路径同步：同步到终端 (点击切换到终端同步到这)');
    case 'from_terminal':
      return t('fileManager.sync.modeFromTerminal', '路径同步：终端同步到这 (点击关闭)');
    case 'off':
    default:
      return t('fileManager.sync.modeOff', '路径同步：已关闭 (点击开启双向同步)');
  }
});

// --- 容器宽度自适应响应式监听 ---
const headerContainerRef = ref<HTMLDivElement | null>(null);
const containerWidth = ref<number>(600);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (headerContainerRef.value) {
    containerWidth.value = headerContainerRef.value.offsetWidth;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          containerWidth.value = entry.contentRect.width;
        }
      }
    });
    resizeObserver.observe(headerContainerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

const showButtonLabels = computed(() => {
  if (props.isMobile) return false;
  return containerWidth.value >= 530;
});

// --- 搜索输入框引用与交互 ---
const searchInputRef = ref<HTMLInputElement | null>(null);

const toggleSearch = () => {
  emit('update:isSearchActive', !props.isSearchActive);
};

const activateSearch = () => {
  emit('update:isSearchActive', true);
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

const cancelSearch = () => {
  emit('update:searchQuery', '');
  emit('update:isSearchActive', false);
};

const onSearchInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:searchQuery', target.value);
};

const mobileHeaderRef = ref<InstanceType<typeof MobileFileManagerHeader> | null>(null);

const focusSearchInput = (): boolean => {
  if (props.isMobile && mobileHeaderRef.value) {
    return mobileHeaderRef.value.focusSearchInput();
  }
  if (!props.isSearchActive) {
    activateSearch();
    nextTick(() => {
      searchInputRef.value?.focus();
    });
    return true;
  } else if (searchInputRef.value) {
    searchInputRef.value.focus();
    return true;
  }
  return false;
};

// 暴露用于外部焦点的引用和操作方法
defineExpose({
  searchInputRef,
  focusSearchInput,
});
</script>

<template>
  <!-- 移动端专属模式 -->
  <MobileFileManagerHeader
    v-if="isMobile"
    ref="mobileHeaderRef"
    :is-connected="isConnected"
    :is-compact-mode="isCompactMode"
    :is-multi-select-mode="isMultiSelectMode"
    :search-query="searchQuery"
    :is-search-active="isSearchActive"
    :terminal-sync-mode="props.terminalSyncMode"
    @update:search-query="emit('update:searchQuery', $event)"
    @update:is-search-active="emit('update:isSearchActive', $event)"
    @toggle-compact-mode="emit('toggle-compact-mode')"
    @toggle-multi-select="emit('toggle-multi-select')"
    @cd-to-terminal="emit('cd-to-terminal')"
    @cycle-terminal-sync-mode="emit('cycle-terminal-sync-mode')"
    @upload-files="emit('upload-files')"
    @new-folder="emit('new-folder')"
    @new-file="emit('new-file')"
    @keydown-search="emit('keydown-search', $event)"
  />

</template>

<style scoped>
</style>
