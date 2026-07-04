import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../utils/apiClient'; // 使用统一的 apiClient

// 定义标签信息接口
export interface TagInfo {
    id: number;
    name: string;
    created_at: number;
    updated_at: number;
}

export const useTagsStore = defineStore('tags', () => {
    const tags = ref<TagInfo[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // 获取标签列表 (带缓存)
    async function fetchTags() {
        const cacheKey = 'tagsCache';
        error.value = null; // 重置错误

        // 1. 尝试从 localStorage 加载缓存
        try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                tags.value = JSON.parse(cachedData);
                isLoading.value = false; // 先显示缓存
            } else {
                isLoading.value = true; // 无缓存，初始加载
            }
        } catch (e) {
            console.error('[TagsStore] Failed to load or parse tags cache:', e);
            localStorage.removeItem(cacheKey); // 解析失败则移除缓存
            isLoading.value = true; // 缓存无效，需要加载
        }

        // 2. 后台获取最新数据
        isLoading.value = true; // 标记正在后台获取
        try {
            const response = await apiClient.get<TagInfo[]>('/tags');
            const freshData = response.data;
            const freshDataString = JSON.stringify(freshData);

            // 3. 对比并更新
            const currentDataString = JSON.stringify(tags.value);
            if (currentDataString !== freshDataString) {
                tags.value = freshData;
                localStorage.setItem(cacheKey, freshDataString); // 更新缓存
            } else {
                console.log('[TagsStore] Tags data is up-to-date.');
            }
            error.value = null; // 清除错误
            return true; // 表示获取成功（即使数据未变）
        } catch (err: any) {
            console.error('[TagsStore] Failed to fetch tags:', err);
            error.value = err.response?.data?.message || err.message || '获取标签列表失败';
            // 保留缓存数据，仅设置错误状态
            return false; // 表示获取失败
        } finally {
            isLoading.value = false; // 加载完成
        }
    }

    // 添加新标签 (添加后清除缓存)
    async function addTag(name: string): Promise<TagInfo | null> {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post<{ message: string, tag: TagInfo }>('/tags', { name });
            const newTag = response.data.tag;
            tags.value.push(newTag);
            try { localStorage.setItem('tagsCache', JSON.stringify(tags.value)); } catch {}
            return newTag;
        } catch (err: any) {
            console.error('Failed to add tag:', err);
            error.value = err.response?.data?.message || err.message || '添加标签失败';
            return null;
        } finally {
            isLoading.value = false;
        }
    }

    // 更新标签
    async function updateTag(id: number, name: string): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.put(`/tags/${id}`, { name });
            const index = tags.value.findIndex(t => t.id === id);
            if (index !== -1) {
                tags.value[index] = { ...tags.value[index], name, updated_at: Date.now() };
            }
            try { localStorage.setItem('tagsCache', JSON.stringify(tags.value)); } catch {}
            return true;
        } catch (err: any) {
            console.error('Failed to update tag:', err);
            error.value = err.response?.data?.message || err.message || '更新标签失败';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteTag(id: number): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/tags/${id}`);
            tags.value = tags.value.filter(t => t.id !== id);
            try { localStorage.setItem('tagsCache', JSON.stringify(tags.value)); } catch {}
            return true;
        } catch (err: any) {
            console.error('Failed to delete tag:', err);
            error.value = err.response?.data?.message || err.message || '删除标签失败';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // 更新标签关联的连接
    async function updateTagConnections(tagId: number, connectionIds: number[]): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.put(`/tags/${tagId}/connections`, { connection_ids: connectionIds });
            try { localStorage.setItem('tagsCache', JSON.stringify(tags.value)); } catch {}
            return true;
        } catch (err: any) {
            console.error(`Failed to update connections for tag ${tagId}:`, err);
            error.value = err.response?.data?.message || err.message || '更新标签连接失败';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        tags,
        isLoading,
        error,
        fetchTags,
        addTag,
        updateTag,
        deleteTag,
        updateTagConnections, // 暴露新的 action
    };
});
