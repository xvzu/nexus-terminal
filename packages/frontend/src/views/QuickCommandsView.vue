  <template>
   <div class="flex flex-col h-full overflow-hidden bg-background">
     <div class="flex flex-col flex-grow overflow-hidden bg-background">
      <!-- List Area -->
       <div class="flex-grow overflow-y-auto p-2" @contextmenu.prevent="showBackgroundContextMenu" @wheel.ctrl.prevent="handleWheel">
        <div v-if="isLoading && quickCommandsStore.quickCommandsList.length === 0" class="p-6 text-center text-text-secondary text-sm flex flex-col items-center justify-center h-full">
            <i class="fas fa-spinner fa-spin text-xl mb-2"></i>
            <p>{{ t('common.loading', '加载中...') }}</p>
        </div>
        <div v-else-if="!isLoading && flatFilteredCommands.length === 0" class="p-6 text-center text-text-secondary text-sm flex flex-col items-center justify-center h-full">
            <i class="fas fa-bolt text-xl mb-2"></i>
            <p class="mb-3">{{ $t('quickCommands.empty', '没有快捷指令。') }}</p>
            <button @click="openAddForm" class="px-4 py-2 bg-primary text-white border-none rounded-lg text-sm font-semibold cursor-pointer shadow-md transition-colors duration-200 ease-in-out hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
             {{ $t('quickCommands.addFirst', '创建第一个快捷指令') }}
           </button>
       </div>
        <ul
         v-else
         class="list-none p-0 m-0 outline-none flex-grow flex flex-wrap content-start gap-1.5"
         ref="commandListContainerRef"
         tabindex="0"
          :style="{ '--qc-row-size-multiplier': quickCommandRowSizeMultiplier }"
        >
         <li
             v-for="(cmd) in flatFilteredCommands"
             :key="cmd.id"
             :data-command-id="cmd.id"
             class="inline-flex rounded-md hover:bg-primary/10 transition-colors duration-150"
             :style="{ padding: isCompactMode ? `calc(0.2rem * var(--qc-row-size-multiplier)) calc(0.5rem * var(--qc-row-size-multiplier))` : `calc(0.35rem * var(--qc-row-size-multiplier)) calc(0.6rem * var(--qc-row-size-multiplier))` }"
             :class="{ 'bg-primary/20 font-medium': isCommandSelected(cmd.id) }"
             @contextmenu.prevent.stop="showQuickCommandContextMenu($event, cmd)"
         >
             <span v-if="cmd.name" class="font-medium truncate text-foreground cursor-pointer hover:text-primary"
                   :class="{'leading-tight': isCompactMode}"
                   :style="{ fontSize: isCompactMode ? `calc(0.8em * max(0.8, var(--qc-row-size-multiplier) * 0.5 + 0.5))` : `calc(0.875em * max(0.85, var(--qc-row-size-multiplier) * 0.6 + 0.4))` }"
                   @click.stop="executeCommand(cmd)">{{ cmd.name }}</span>
             <span v-if="!isCompactMode && cmd.command && !cmd.name"
                   class="truncate font-mono text-text-secondary cursor-pointer hover:text-primary"
                   :style="{ fontSize: `calc(0.75em * max(0.85, var(--qc-row-size-multiplier) * 0.6 + 0.4))` }"
                   @click.stop="executeCommand(cmd)">{{ cmd.command }}</span>
         </li>
        </ul>
      </div>
    </div>

    <!-- 添加/编辑表单模态框 -->
    <AddEditQuickCommandForm
      v-if="isFormVisible"
      :command-to-edit="commandToEdit"
      @close="closeForm"
    />

    <!-- Context Menu for Quick Commands -->
    <div
      v-if="quickCommandContextMenuVisible"
      class="fixed bg-background border border-border/50 shadow-xl rounded-lg py-1.5 z-50 min-w-[180px] quick-command-context-menu"
      :style="{ top: `${quickCommandContextMenuPosition.y}px`, left: `${quickCommandContextMenuPosition.x}px` }"
      @click.stop
    >
      <ul class="list-none p-0 m-0">
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('toggleSort')"
        >
          <i :class="[sortButtonIcon, 'mr-2 w-4 text-center']"></i>
          <span>{{ sortButtonTitle }}</span>
        </li>
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('toggleCompact')"
        >
          <i :class="['fas', isCompactMode ? 'fa-compress-alt' : 'fa-expand-alt', 'mr-2 w-4 text-center']"></i>
          <span>{{ isCompactMode ? t('quickCommands.compactModeOff', '退出紧凑模式') : t('quickCommands.compactModeOn', '紧凑模式') }}</span>
        </li>
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('zoomIn')"
        >
          <i class="fas fa-search-plus mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.zoomIn', '放大') }}</span>
        </li>
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('zoomOut')"
        >
          <i class="fas fa-search-minus mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.zoomOut', '缩小') }}</span>
        </li>
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('zoomReset')"
        >
          <i class="fas fa-undo mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.zoomReset', '重置缩放') }}</span>
        </li>
        <li class="border-t border-border/50 my-1"></li>
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('addCommand')"
        >
          <i class="fas fa-plus mr-2 w-4 text-center"></i>
          <span>{{ $t('quickCommands.add', '添加命令') }}</span>
        </li>
        <li
          v-if="quickCommandContextTargetCommand"
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('copyCommand', quickCommandContextTargetCommand!)"
        >
          <i class="fas fa-copy mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.copy', '复制命令') }}</span>
        </li>
        <li
          v-if="quickCommandContextTargetCommand"
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('editCommand', quickCommandContextTargetCommand!)"
        >
          <i class="fas fa-edit mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.edit', '编辑命令') }}</span>
        </li>
        <li
          v-if="quickCommandContextTargetCommand"
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('deleteCommand', quickCommandContextTargetCommand!)"
        >
          <i class="fas fa-times mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.delete', '删除命令') }}</span>
        </li>
        <li v-if="quickCommandContextTargetCommand" class="border-t border-border/50 my-1"></li>
        <li
          v-if="quickCommandContextTargetCommand"
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleContextMenuAction('sendToAllSessions', quickCommandContextTargetCommand!)"
        >
          <i class="fas fa-share mr-2 w-4 text-center"></i>
          <span>{{ t('quickCommands.actions.sendToAllSessions', '发送到全部会话') }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuickCommandsStore, type QuickCommandFE } from '../stores/quickCommands.store';
import { useUiNotificationsStore } from '../stores/uiNotifications.store';
import { useI18n } from 'vue-i18n';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import AddEditQuickCommandForm from '../components/AddEditQuickCommandForm.vue';
import { useSettingsStore } from '../stores/settings.store';
import { useWorkspaceEventEmitter } from '../composables/workspaceEvents';
import { useSessionStore } from '../stores/session.store';
import type { SessionState } from '../stores/session/types'; 
import { useConnectionsStore } from '../stores/connections.store';

const quickCommandsStore = useQuickCommandsStore();
const uiNotificationsStore = useUiNotificationsStore();
const { t } = useI18n();
const { showConfirmDialog } = useConfirmDialog();
const settingsStore = useSettingsStore();
const emitWorkspaceEvent = useWorkspaceEventEmitter();
const sessionStore = useSessionStore(); 
const connectionsStore = useConnectionsStore(); 

const isFormVisible = ref(false);
const commandToEdit = ref<QuickCommandFE | null>(null);
const commandListContainerRef = ref<HTMLDivElement | null>(null);

const quickCommandContextMenuVisible = ref(false);
const quickCommandContextMenuPosition = ref({ x: 0, y: 0 });
const quickCommandContextTargetCommand = ref<QuickCommandFE | null>(null);

const sortBy = computed(() => quickCommandsStore.sortBy);
const isLoading = computed(() => quickCommandsStore.isLoading);

const { selectedIndex: storeSelectedIndex, flatVisibleCommands } = storeToRefs(quickCommandsStore);
const {
  quickCommandRowSizeMultiplierNumber: qcRowSizeMultiplierFromStore,
  quickCommandsCompactModeBoolean,
} = storeToRefs(settingsStore);

const quickCommandRowSizeMultiplier = ref(1.0);

watchEffect(() => {
  const storeVal = qcRowSizeMultiplierFromStore.value;
  if (storeVal && typeof storeVal === 'number' && storeVal > 0) {
    if (quickCommandRowSizeMultiplier.value !== storeVal) {
      quickCommandRowSizeMultiplier.value = storeVal;
    }
  }
});

const handleWheel = (event: WheelEvent) => {
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    setZoom(quickCommandRowSizeMultiplier.value + delta);
};

const flatFilteredCommands = computed(() => {
    return quickCommandsStore.flatVisibleCommands;
});

const isCompactMode = computed(() => quickCommandsCompactModeBoolean.value);

const toggleCompactMode = () => {
  const currentMode = quickCommandsCompactModeBoolean.value;
  settingsStore.updateSetting('quickCommandsCompactMode', String(!currentMode));
};

const isCommandSelected = (commandId: number): boolean => {
    if (storeSelectedIndex.value < 0 || !flatVisibleCommands.value[storeSelectedIndex.value]) {
        return false;
    }
    return flatVisibleCommands.value[storeSelectedIndex.value].id === commandId;
};

onMounted(async () => {
    await quickCommandsStore.fetchQuickCommands();
});

const scrollToSelected = async (index: number) => {
    await nextTick();
    if (index < 0 || !commandListContainerRef.value || !flatVisibleCommands.value[index]) return;

    const selectedCommandId = flatVisibleCommands.value[index].id;
    const listContainer = commandListContainerRef.value;

    const selectedElement = listContainer.querySelector(`li[data-command-id="${selectedCommandId}"]`) as HTMLLIElement;

    if (selectedElement) {
        selectedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }
};

watch(storeSelectedIndex, (newIndex) => {
  scrollToSelected(newIndex);
});

const toggleSortBy = () => {
    const newSortBy = sortBy.value === 'name' ? 'last_used' : 'name';
    quickCommandsStore.setSortBy(newSortBy);
};

const sortButtonTitle = computed(() => {
  return sortBy.value === 'name'
    ? t('quickCommands.sortByName', '按名称排序')
    : t('quickCommands.sortByLastUsed', '按最近使用排序');
});

const sortButtonIcon = computed(() => {
  return sortBy.value === 'name' ? 'fas fa-sort-alpha-down' : 'fas fa-clock';
});


const openAddForm = () => {
  commandToEdit.value = null;
  isFormVisible.value = true;
};

const openEditForm = (command: QuickCommandFE) => {
  commandToEdit.value = command;
  isFormVisible.value = true;
};

const closeForm = () => {
  isFormVisible.value = false;
  commandToEdit.value = null;
};

const setZoom = (value: number) => {
  const clamped = Math.max(0.5, Math.min(2.5, value));
  const rounded = parseFloat(clamped.toFixed(2));
  quickCommandRowSizeMultiplier.value = rounded;
  if (settingsStore.updateQuickCommandRowSizeMultiplier) {
    settingsStore.updateQuickCommandRowSizeMultiplier(rounded);
  }
};

const confirmDelete = async (command: QuickCommandFE) => {
  const confirmed = await showConfirmDialog({
    message: t('quickCommands.confirmDelete', { name: command.name || command.command })
  });
  if (confirmed) {
    quickCommandsStore.deleteQuickCommand(command.id);
  }
};

// 复制命令到剪贴板
const copyCommand = async (command: string) => {
  try {
    await navigator.clipboard.writeText(command);
    uiNotificationsStore.showSuccess(t('commandHistory.copied', '已复制到剪贴板'));
  } catch (err) {
    console.error('使用Clipboard API复制命令失败:', err);
    // 备用方案：使用临时文本区域和execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      textarea.style.position = 'fixed'; // 避免滚动到页面底部
      textarea.style.opacity = '0'; // 隐藏文本区域
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        uiNotificationsStore.showSuccess(t('commandHistory.copied', '已复制到剪贴板'));
      } else {
        uiNotificationsStore.showError(t('commandHistory.copyFailed', '复制失败'));
      }
    } catch (fallbackErr) {
      console.error('备用复制方法也失败:', fallbackErr);
      uiNotificationsStore.showError(t('commandHistory.copyFailed', '复制失败'));
    }
  }
};

// 执行命令
const executeCommand = (cmd: QuickCommandFE) => {
  // 1. 增加使用次数
  quickCommandsStore.incrementUsage(cmd.id);

  let processedCommand = cmd.command;
  const savedVariables = cmd.variables || {}; // 使用已保存的变量

  // 2. 执行变量替换
  for (const varName in savedVariables) {
    const placeholder = new RegExp(`\\$\\{${varName}\\}`, 'g');
    processedCommand = processedCommand.replace(placeholder, savedVariables[varName]);
  }

  // 3. 检查未定义变量
  const variablePlaceholders = cmd.command.match(/\$\{[^\}]+\}/g) || [];
  const undefinedVariables: string[] = [];
  variablePlaceholders.forEach(placeholder => {
    const varName = placeholder.substring(2, placeholder.length - 1);
    if (!savedVariables.hasOwnProperty(varName)) {
      undefinedVariables.push(varName);
    }
  });



  // 4. 获取当前激活的 SSH 会话 ID
  const activeSessionId = sessionStore.activeSessionId;
  if (!activeSessionId) {
    uiNotificationsStore.showError(t('quickCommands.form.errorNoActiveSession', '没有活动的SSH会话可执行指令。'));
    return;
  }

  // 5. 触发 quickCommand:executeProcessed 事件
  emitWorkspaceEvent('quickCommand:executeProcessed', {
    command: processedCommand,
    sessionId: activeSessionId
  });
};



// +++ 右键菜单方法 +++
const showQuickCommandContextMenu = (event: MouseEvent, command: QuickCommandFE) => {
event.preventDefault();
quickCommandContextTargetCommand.value = command;
quickCommandContextMenuPosition.value = { x: event.clientX, y: event.clientY };
quickCommandContextMenuVisible.value = true;
document.addEventListener('click', closeQuickCommandContextMenu, { once: true });

// 使用 nextTick 获取菜单尺寸并调整位置以防止超出屏幕
nextTick(() => {
  const menuElement = document.querySelector('.quick-command-context-menu') as HTMLElement;
  if (menuElement) {
    const menuRect = menuElement.getBoundingClientRect();
    let finalX = quickCommandContextMenuPosition.value.x;
    let finalY = quickCommandContextMenuPosition.value.y;
    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;

    // 调整水平位置
    if (finalX + menuWidth > window.innerWidth) {
      finalX = window.innerWidth - menuWidth - 5;
    }

    // 调整垂直位置
    if (finalY + menuHeight > window.innerHeight) {
      finalY = window.innerHeight - menuHeight - 5;
    }

    // 确保菜单不超出屏幕左上角
    finalX = Math.max(5, finalX);
    finalY = Math.max(5, finalY);

    // 更新位置
    if (finalX !== quickCommandContextMenuPosition.value.x || finalY !== quickCommandContextMenuPosition.value.y) {
      console.log(`[QuickCmdView] Adjusting quick command context menu position: (${quickCommandContextMenuPosition.value.x}, ${quickCommandContextMenuPosition.value.y}) -> (${finalX}, ${finalY})`);
      quickCommandContextMenuPosition.value = { x: finalX, y: finalY };
    }
  }
});
};

const closeQuickCommandContextMenu = () => {
  quickCommandContextMenuVisible.value = false;
  quickCommandContextTargetCommand.value = null;
  document.removeEventListener('click', closeQuickCommandContextMenu);
};

const showBackgroundContextMenu = (event: MouseEvent) => {
  quickCommandContextTargetCommand.value = null;
  quickCommandContextMenuPosition.value = { x: event.clientX, y: event.clientY };
  quickCommandContextMenuVisible.value = true;
  document.addEventListener('click', closeQuickCommandContextMenu, { once: true });
};

const handleContextMenuAction = (action: 'toggleSort' | 'toggleCompact' | 'zoomIn' | 'zoomOut' | 'zoomReset' | 'addCommand' | 'copyCommand' | 'editCommand' | 'deleteCommand' | 'sendToAllSessions', command?: QuickCommandFE) => {
  closeQuickCommandContextMenu();
  switch (action) {
    case 'toggleSort':
      toggleSortBy();
      break;
    case 'toggleCompact':
      toggleCompactMode();
      break;
    case 'zoomIn':
      setZoom(quickCommandRowSizeMultiplier.value + 0.15);
      break;
    case 'zoomOut':
      setZoom(quickCommandRowSizeMultiplier.value - 0.15);
      break;
    case 'zoomReset':
      setZoom(1.0);
      break;
    case 'addCommand':
      openAddForm();
      break;
    case 'copyCommand':
      if (command) copyCommand(command.command);
      break;
    case 'editCommand':
      if (command) openEditForm(command);
      break;
    case 'deleteCommand':
      if (command) confirmDelete(command);
      break;
    case 'sendToAllSessions': {
      if (!command) return;
      const activeSshSessions = Array.from(sessionStore.sessions.values()).filter(
        (s: SessionState) => {
          if (s.wsManager.connectionStatus.value !== 'connected') return false;
          const connInfo = connectionsStore.connections.find(c => c.id === Number(s.connectionId));
          return connInfo?.type === 'SSH';
        }
      );

      if (activeSshSessions.length > 0) {
        activeSshSessions.forEach((session: SessionState) => {
          emitWorkspaceEvent('terminal:sendCommand', { sessionId: session.sessionId, command: command.command });
        });
        uiNotificationsStore.addNotification({
          message: t('quickCommands.notifications.sentToAllSessions', { count: activeSshSessions.length }),
          type: 'success',
        });
      } else {
        uiNotificationsStore.addNotification({
          message: t('quickCommands.notifications.noActiveSshSessions'),
          type: 'info',
        });
      }
      break;
    }
  }
};

</script>
