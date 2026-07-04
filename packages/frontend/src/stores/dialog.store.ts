import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading: boolean;
  resolvePromise?: (value: boolean) => void;
  rejectPromise?: (reason?: any) => void;
}

export const useDialogStore = defineStore('dialog', () => {
  const { t } = useI18n();

  const defaultState: DialogState = {
    visible: false,
    title: '',
    message: '',
    confirmText: t('common.confirm', '确认'),
    cancelText: t('common.cancel', '取消'),
    isLoading: false,
  };

  const state = ref<DialogState>({ ...defaultState });

  const showDialog = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> => {
    state.value = {
      ...defaultState,
      ...options,
      visible: true,
      isLoading: false,
    };
    return new Promise((resolve, reject) => {
      state.value.resolvePromise = resolve;
      state.value.rejectPromise = reject;
    });
  };

  const handleConfirm = async () => {
    if (state.value.resolvePromise) {
      state.value.resolvePromise(true);
    }
    state.value.visible = false;
  };

  const handleCancel = () => {
    if (state.value.resolvePromise) {
      state.value.resolvePromise(false);
    }
    state.value.visible = false;
  };
  
  const setLoading = (loading: boolean) => {
    state.value.isLoading = loading;
  };

  return {
    visible: computed(() => state.value.visible),
    title: computed(() => state.value.title),
    message: computed(() => state.value.message),
    confirmText: computed(() => state.value.confirmText),
    cancelText: computed(() => state.value.cancelText),
    isLoading: computed(() => state.value.isLoading),
    state,
    showDialog,
    handleConfirm,
    handleCancel,
    setLoading,
  };
});