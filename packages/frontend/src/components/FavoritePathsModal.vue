<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFavoritePathsStore, type FavoritePathItem } from '../stores/favoritePaths.store';
import { useSessionStore } from '../stores/session.store';
import { useUiNotificationsStore } from '../stores/uiNotifications.store';
import AddEditFavoritePathForm from './AddEditFavoritePathForm.vue';
import { useWorkspaceEventEmitter } from '../composables/workspaceEvents';
import { useConfirmDialog } from '../composables/useConfirmDialog';

const PADDING = 8; // px

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  triggerElement: {
    type: Object as PropType<HTMLElement | null>,
    default: null,
  },
});

const emit = defineEmits(['close', 'navigateToPath']);

const { t } = useI18n();
const favoritePathsStore = useFavoritePathsStore();
const sessionStore = useSessionStore();
const uiNotificationsStore = useUiNotificationsStore();
const emitWorkspaceEvent = useWorkspaceEventEmitter();
const { showConfirmDialog } = useConfirmDialog();

const showAddEditModal = ref(false);
const editingPathItem = ref<FavoritePathItem | null>(null);
const modalContentRef = ref<HTMLElement | null>(null);
const modalStyle = ref<Record<string, string>>({});

const openAddModal = () => {
  editingPathItem.value = null;
  showAddEditModal.value = true;
};

const favoriteCtxMenuVisible = ref(false);
const favoriteCtxMenuPosition = ref({ x: 0, y: 0 });
const favoriteCtxTarget = ref<FavoritePathItem | null>(null);
const favoriteCtxFromBlank = ref(false);

const showFavoriteContextMenu = (event: MouseEvent, pathItem: FavoritePathItem) => {
  event.preventDefault();
  event.stopPropagation();
  favoriteCtxTarget.value = pathItem;
  favoriteCtxFromBlank.value = false;
  favoriteCtxMenuPosition.value = { x: event.clientX, y: event.clientY };
  favoriteCtxMenuVisible.value = true;
  document.addEventListener('click', closeFavoriteContextMenu, { once: true });
  nextTick(() => {
    positionCtxMenu();
  });
};

const showBlankContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  favoriteCtxTarget.value = null;
  favoriteCtxFromBlank.value = true;
  favoriteCtxMenuPosition.value = { x: event.clientX, y: event.clientY };
  favoriteCtxMenuVisible.value = true;
  document.addEventListener('click', closeFavoriteContextMenu, { once: true });
  nextTick(() => {
    positionCtxMenu();
  });
};

const positionCtxMenu = () => {
  const el = document.querySelector('.fav-ctx-menu') as HTMLElement;
  if (!el) return;
  const r = el.getBoundingClientRect();
  let x = favoriteCtxMenuPosition.value.x;
  let y = favoriteCtxMenuPosition.value.y;
  if (x + r.width > window.innerWidth) x = window.innerWidth - r.width - 5;
  if (y + r.height > window.innerHeight) y = window.innerHeight - r.height - 5;
  x = Math.max(5, x);
  y = Math.max(5, y);
  if (x !== favoriteCtxMenuPosition.value.x || y !== favoriteCtxMenuPosition.value.y) {
    favoriteCtxMenuPosition.value = { x, y };
  }
};

const closeFavoriteContextMenu = () => {
  favoriteCtxMenuVisible.value = false;
  favoriteCtxTarget.value = null;
  document.removeEventListener('click', closeFavoriteContextMenu);
};

const handleItemClick = (pathItem: FavoritePathItem) => {
  handleSendToTerminal(pathItem);
};

const openEditModal = (pathItem: FavoritePathItem) => {
  editingPathItem.value = { ...pathItem };
  showAddEditModal.value = true;
};

const handleDelete = async (pathItem: FavoritePathItem) => {
  const confirmed = await showConfirmDialog({
    message: t('favoritePaths.confirmDelete', { name: pathItem.name || pathItem.path })
  });
  if (confirmed) {
    try {
      await favoritePathsStore.deleteFavoritePath(pathItem.id, t);
    } catch (error) {
      console.error('Failed to delete favorite path from modal:', error);
      uiNotificationsStore.showError(t('favoritePaths.notifications.deleteError', '删除收藏路径失败'));
    }
  }
};

const handleSendToTerminal = (pathItem: FavoritePathItem) => {
  const activeSession = sessionStore.activeSession;
  if (activeSession && activeSession.terminalManager) {
    const escapedPath = `"${pathItem.path.replace(/"/g, '\\"')}"`;
    const command = `cd ${escapedPath}\n`;
    try {
      activeSession.terminalManager.sendData(command);
    } catch (error) {
      console.error('[FavoritePathsModal] Failed to send command to active terminal:', error);
    }
  } else {
    console.warn('[FavoritePathsModal] No active session with a terminal manager found to send path to.');
  }
  closeModal(); 
};

const closeModal = () => {
  emit('close');
};

const updatePosition = () => {
  if (!props.isVisible || !props.triggerElement || !modalContentRef.value) {
    return;
  }

  const triggerRect = props.triggerElement.getBoundingClientRect();
  const modalWidth = modalContentRef.value.offsetWidth;
  const modalHeight = modalContentRef.value.offsetHeight;

  // If dimensions are zero when modal is supposed to be visible,
  // it might mean content affecting size isn't ready. Retry once.
  if (modalWidth === 0 && modalHeight === 0 && props.isVisible) {
    nextTick(updatePosition);
    return;
  }
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = triggerRect.bottom + 2; // Default position below trigger, with a small 2px gap
  let left = triggerRect.left;

  // Check for bottom overflow
  if (top + modalHeight + PADDING > viewportHeight) {
    // Try to position above the trigger
    top = triggerRect.top - modalHeight - 2; // Position above trigger, with a small 2px gap
  }

  // If positioning above also causes top overflow (e.g., trigger is near the top and modal is tall)
  if (top < PADDING) {
    top = PADDING; // Align to viewport top with padding
    // Note: If modalHeight is still greater than viewportHeight - 2*PADDING,
    // it will overflow downwards. The `max-h-80` class on the modal
    // should generally prevent the modal itself from being excessively tall.
  }

  // Check for right overflow
  if (left + modalWidth + PADDING > viewportWidth) {
    left = viewportWidth - modalWidth - PADDING; // Align to viewport right edge
  }

  // Check for left overflow (less likely with initial left alignment to trigger, but good for robustness)
  if (left < PADDING) {
    left = PADDING; // Align to viewport left edge
  }

  modalStyle.value = {
    position: 'fixed', // Position relative to the viewport
    top: `${top}px`,
    left: `${left}px`,
  };
};

// --- Click Outside Logic ---
const handleClickOutside = (event: MouseEvent) => {
  if (props.triggerElement && props.triggerElement.contains(event.target as Node)) {
    return;
  }

  if (modalContentRef.value && !modalContentRef.value.contains(event.target as Node)) {
    if (!showAddEditModal.value) { 
      closeModal();
    }
  }
};

watch(() => props.isVisible, (newValue: boolean) => {
  if (newValue) {
    document.addEventListener('mousedown', handleClickOutside);
    nextTick(() => { // Ensure DOM is ready for measurements
      updatePosition(); // Calculate initial position
      window.addEventListener('resize', updatePosition); // Adjust position on window resize
    });
  } else {
    document.removeEventListener('mousedown', handleClickOutside);
    window.removeEventListener('resize', updatePosition); // Clean up resize listener
  }
});

onMounted(() => {
  if (props.isVisible) {
    document.addEventListener('mousedown', handleClickOutside);
    nextTick(() => { 
      updatePosition();
      window.addEventListener('resize', updatePosition);
    });
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('resize', updatePosition); // Ensure resize listener is cleaned up
});

</script>

<template>
  <!-- New single root element -->
  <div>
    <!-- Favorite Paths Dropdown -->
    <div
      v-if="isVisible"
      ref="modalContentRef"
      :style="modalStyle"
      class="z-50 w-72 md:w-80 rounded-md bg-background shadow-lg border border-border/50 max-h-80 flex flex-col overflow-hidden"
    >
      <!-- Path List - Horizontal -->
      <div class="overflow-y-auto flex-grow p-2" @contextmenu.prevent="showBlankContextMenu">
        <div v-if="favoritePathsStore.isLoading && favoritePathsStore.favoritePaths.length === 0" class="p-3 text-center text-text-secondary text-sm">
          <i class="fas fa-spinner fa-spin mr-1"></i>
          {{ t('favoritePaths.loading', 'Loading favorites...') }}
        </div>
        <div v-else-if="!favoritePathsStore.isLoading && favoritePathsStore.favoritePaths.length === 0" class="p-3 text-center text-text-secondary text-sm">
          <i class="fas fa-star-half-alt mr-1"></i>
          {{ t('favoritePaths.noFavorites', 'No favorite paths yet.') }}
        </div>
        <ul v-else class="list-none p-0 m-0 flex flex-wrap content-start gap-1.5">
          <li
            v-for="favPath in favoritePathsStore.favoritePaths"
            :key="favPath.id"
            class="inline-flex rounded-md hover:bg-primary/10 transition-colors duration-150 cursor-pointer"
            @click="handleItemClick(favPath)"
            @contextmenu.prevent.stop="showFavoriteContextMenu($event, favPath)"
            :title="favPath.path"
          >
            <span class="font-medium truncate text-foreground hover:text-primary px-2 py-1 text-sm"
                  :style="{ maxWidth: '200px' }">{{ favPath.name || favPath.path }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Context Menu for Favorites -->
    <div
      v-if="favoriteCtxMenuVisible"
      class="fixed bg-background border border-border/50 shadow-xl rounded-lg py-1.5 z-[60] min-w-[160px] fav-ctx-menu"
      :style="{ top: `${favoriteCtxMenuPosition.y}px`, left: `${favoriteCtxMenuPosition.x}px` }"
      @click.stop
    >
      <ul class="list-none p-0 m-0">
        <li
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="openAddModal(); closeFavoriteContextMenu()"
        >
          <i class="fas fa-plus mr-2 w-4 text-center"></i>
          <span>{{ t('favoritePaths.addNew', '添加收藏') }}</span>
        </li>
        <li v-if="favoriteCtxTarget" class="border-t border-border/50 my-1"></li>
        <li
          v-if="favoriteCtxTarget"
          class="group px-4 py-1.5 cursor-pointer flex items-center text-foreground hover:bg-primary/10 hover:text-primary text-sm transition-colors duration-150 rounded-md mx-1"
          @click="openEditModal(favoriteCtxTarget); closeFavoriteContextMenu()"
        >
          <i class="fas fa-pencil-alt mr-2 w-4 text-center"></i>
          <span>编辑收藏</span>
        </li>
        <li
          v-if="favoriteCtxTarget"
          class="group px-4 py-1.5 cursor-pointer flex items-center text-error hover:bg-error/10 text-sm transition-colors duration-150 rounded-md mx-1"
          @click="handleDelete(favoriteCtxTarget)"
        >
          <i class="fas fa-trash-alt mr-2 w-4 text-center"></i>
          <span>删除收藏</span>
        </li>
      </ul>
    </div>

    <!-- Add/Edit Modal -->
    <AddEditFavoritePathForm
      v-if="showAddEditModal"
      :is-visible="showAddEditModal"
      :path-data="editingPathItem"
      @close="showAddEditModal = false"
      @save-success="() => { favoritePathsStore.fetchFavoritePaths(t); showAddEditModal = false; }"
    />
  </div> 
</template>


