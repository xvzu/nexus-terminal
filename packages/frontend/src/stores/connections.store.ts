import { defineStore } from 'pinia';
import apiClient from '../utils/apiClient'; // 使用统一的 apiClient

// 定义连接信息接口 (与后端对应，不含敏感信息)
export interface ConnectionInfo {
    id: number;
    name: string;
    type: 'SSH' | 'RDP' | 'VNC'; // Use uppercase to match backend data
    host: string;
    port: number;
    username: string;
    auth_method: 'password' | 'key';
    proxy_id?: number | null; // 关联的代理 ID (可选)
    proxy_type?: 'proxy' | 'jump' | null; 
    tag_ids?: number[]; // 关联的标签 ID 数组 (可选)
    ssh_key_id?: number | null; // +++ 关联的 SSH 密钥 ID (可选) +++
    created_at: number;
    updated_at: number;
    last_connected_at: number | null;
notes?: string | null;
    vncPassword?: string; // VNC specific password
    jump_chain?: number[] | null;
}

// 定义 Store State 的接口
interface ConnectionsState {
    connections: ConnectionInfo[];
    isLoading: boolean;
    error: string | null;
}

// 定义 Pinia Store
export const useConnectionsStore = defineStore('connections', {
    state: (): ConnectionsState => ({
        connections: [],
        isLoading: false,
        error: null,
    }),
    actions: {
        // 获取连接列表 Action (带缓存)
        async fetchConnections() {
            const cacheKey = 'connectionsCache';
            this.error = null; // 重置错误状态

            // 1. 尝试从 localStorage 加载缓存
            try {
                const cachedData = localStorage.getItem(cacheKey);
                if (cachedData) {
                    this.connections = JSON.parse(cachedData);
                    this.isLoading = false; // 先显示缓存，设置为 false
                } else {
                    // 没有缓存时，初始加载状态设为 true
                    this.isLoading = true;
                }
            } catch (e) {
                console.error('[ConnectionsStore] Failed to load or parse connections cache:', e);
                localStorage.removeItem(cacheKey); // 解析失败则移除缓存
                this.isLoading = true; // 缓存无效，需要加载
            }

            // 2. 后台获取最新数据
            this.isLoading = true; // 标记正在后台获取
            try {
                const response = await apiClient.get<ConnectionInfo[]>('/connections');
                const freshData = response.data;
                const freshDataString = JSON.stringify(freshData);

                // 3. 对比并更新
                const currentDataString = JSON.stringify(this.connections);
                if (currentDataString !== freshDataString) {
                    this.connections = freshData;
                    localStorage.setItem(cacheKey, freshDataString); // 更新缓存
                } else {
                }
                this.error = null; // 清除之前的错误（如果有）
            } catch (err: any) {
                console.error('[ConnectionsStore] 获取连接列表失败:', err);
                this.error = err.response?.data?.message || err.message || '获取连接列表时发生未知错误。';
                // 保留缓存数据，仅设置错误状态
                if (err.response?.status === 401) {
                    console.warn('[ConnectionsStore] 未授权，需要登录才能获取连接列表。');
                    // 可能需要触发全局的未授权处理逻辑
                }
            } finally {
                this.isLoading = false; // 无论成功失败，最终加载完成
            }
        },

        // 添加新连接 Action (添加后应清除缓存或重新获取)
        // 更新参数类型以接受新的认证字段
        async addConnection(newConnectionData: {
            name: string;
            type: 'SSH' | 'RDP' | 'VNC';
            host: string;
            port: number;
            username: string;
            auth_method: 'password' | 'key';
            password?: string;
            private_key?: string;
            passphrase?: string;
            vncPassword?: string;
            proxy_id?: number | null;
            proxy_type?: 'proxy' | 'jump' | null; 
            tag_ids?: number[];
            jump_chain?: number[] | null;
        }) {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await apiClient.post<{ message: string; connection: ConnectionInfo }>('/connections', newConnectionData);
                const newConn = response.data.connection;
                this.connections.unshift(newConn);
                try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
                return true;
            } catch (err: any) {
                console.error('添加连接失败:', err);
                this.error = err.response?.data?.message || err.message || '添加连接时发生未知错误。';
                 if (err.response?.status === 401) {
                    console.warn('未授权，需要登录才能添加连接。');
                }
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        async updateConnection(connectionId: number, updatedData: Partial<Omit<ConnectionInfo, 'id' | 'created_at' | 'updated_at' | 'last_connected_at'> & { type?: 'SSH' | 'RDP' | 'VNC'; password?: string; private_key?: string; passphrase?: string; vncPassword?: string; proxy_id?: number | null; proxy_type?: 'proxy' | 'jump' | null; tag_ids?: number[]; jump_chain?: number[] | null; }>) {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await apiClient.put<{ message: string; connection: ConnectionInfo }>(`/connections/${connectionId}`, updatedData);
                const index = this.connections.findIndex(conn => conn.id === connectionId);
                if (index !== -1) {
                    this.connections[index] = { ...this.connections[index], ...response.data.connection };
                }
                try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
                return true;
            } catch (err: any) {
                console.error(`更新连接 ${connectionId} 失败:`, err);
                this.error = err.response?.data?.message || err.message || `更新连接时发生未知错误。`;
                if (err.response?.status === 401) {
                    console.warn('未授权，需要登录才能更新连接。');
                }
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        // 删除连接 Action
        async deleteConnection(connectionId: number) {
            this.isLoading = true; // 可以为删除操作单独设置加载状态
            this.error = null;
            try {
                // 发送 DELETE 请求到 /api/v1/connections/:id
                await apiClient.delete(`/connections/${connectionId}`); // 使用 apiClient

                this.connections = this.connections.filter(conn => conn.id !== connectionId);
                try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
                return true;
            } catch (err: any) {
                console.error(`删除连接 ${connectionId} 失败:`, err);
                this.error = err.response?.data?.message || err.message || `删除连接时发生未知错误。`;
                if (err.response?.status === 401) {
                    console.warn('未授权，需要登录才能删除连接。');
                }
                // 即使删除失败，也可能需要通知用户
                return false; // 表示失败
            } finally {
                this.isLoading = false;
            }
        },

        async deleteBatchConnections(connectionIds: number[]): Promise<boolean> {
            if (!connectionIds || connectionIds.length === 0) {
                return true;
            }
            this.isLoading = true;
            this.error = null;
            const results = await Promise.allSettled(
                connectionIds.map(id =>
                    apiClient.delete(`/connections/${id}`)
                )
            );
            const failed: string[] = [];
            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    failed.push(`ID ${connectionIds[i]}: ${r.reason?.response?.data?.message || r.reason?.message || '未知错误'}`);
                }
            });
            if (failed.length > 0) {
                this.error = `批量删除操作中部分连接未能成功删除。详情: ${failed.join('; ')}`;
            } else {
                this.connections = this.connections.filter(c => !connectionIds.includes(c.id));
                try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
            }
            this.isLoading = false;
            return failed.length === 0;
        },

        // 测试连接 Action
        async testConnection(connectionId: number): Promise<{ success: boolean; message?: string; latency?: number }> {
            // 注意：这里不改变 isLoading 状态，或者可以引入单独的 testing 状态
            // this.isLoading = true;
            // this.error = null;
            try {
                // 假设后端返回 { success: boolean; message: string; latency?: number }
                const response = await apiClient.post<{ success: boolean; message: string; latency?: number }>(`/connections/${connectionId}/test`); // 使用 apiClient
                return { success: response.data.success, message: response.data.message, latency: response.data.latency };
            } catch (err: any) {
                console.error(`测试连接 ${connectionId} 失败:`, err);
                const errorMessage = err.response?.data?.message || err.message || '测试连接时发生未知错误。';
                 if (err.response?.status === 401) {
                    console.warn('未授权，需要登录才能测试连接。');
                }
                // 返回失败状态和错误消息
                return { success: false, message: errorMessage };
            } finally {
                // this.isLoading = false;
            }
        },

        // 克隆连接 Action (调用后端克隆接口)
        async cloneConnection(originalId: number, newName: string): Promise<boolean> {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await apiClient.post<{ message: string; connection: ConnectionInfo }>(`/connections/${originalId}/clone`, { name: newName });
                if (response.data.connection) {
                    this.connections.unshift(response.data.connection);
                }
                try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
                return true;
            } catch (err: any) {
                console.error(`克隆连接 ${originalId} 失败:`, err);
                this.error = err.response?.data?.message || err.message || `克隆连接时发生未知错误。`;
                if (err.response?.status === 401) {
                    console.warn('未授权，需要登录才能克隆连接。');
                }
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        async addTagToConnectionsAction(connectionIds: number[], tagId: number): Promise<boolean> {
             if (connectionIds.length === 0) return true;
             this.isLoading = true;
             this.error = null;
             try {
                 await apiClient.post('/connections/add-tag', {
                     connection_ids: connectionIds,
                     tag_id: tagId
                 });
                 this.connections.forEach(conn => {
                     if (connectionIds.includes(conn.id)) {
                         if (!conn.tag_ids) conn.tag_ids = [];
                         if (!conn.tag_ids.includes(tagId)) conn.tag_ids.push(tagId);
                     }
                 });
                 try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
                 return true;
             } catch (err: any) {
                 console.error(`为连接添加标签失败:`, err);
                 this.error = err.response?.data?.message || err.message || `为连接添加标签时发生未知错误。`;
                 if (err.response?.status === 401) {
                     console.warn('未授权，需要登录才能为连接添加标签。');
                 }
                 return false;
             } finally {
                 this.isLoading = false;
             }
        },

        async updateConnectionTags(connectionId: number, tagIds: number[]): Promise<boolean> {
            this.isLoading = true;
            this.error = null;
            try {
                await apiClient.put(`/connections/${connectionId}/tags`, { tag_ids: tagIds });
                const conn = this.connections.find(c => c.id === connectionId);
                if (conn) conn.tag_ids = tagIds;
                try { localStorage.setItem('connectionsCache', JSON.stringify(this.connections)); } catch {}
                return true;
            } catch (err: any) {
                console.error(`更新连接 ${connectionId} 的标签失败:`, err);
                this.error = err.response?.data?.message || err.message || `更新连接标签时发生未知错误。`;
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        // +++ 获取 VNC 会话令牌 +++
        async getVncSessionToken(connectionId: number, width?: number, height?: number): Promise<string | null> {
            // this.isLoading = true; // 考虑是否需要独立的加载状态，或者由调用方处理
            // this.error = null;
            try {
                let apiUrl = `/connections/${connectionId}/vnc-session`;
                const params = new URLSearchParams();
                if (width !== undefined) {
                    params.append('width', String(width));
                }
                if (height !== undefined) {
                    params.append('height', String(height));
                }
                const queryString = params.toString();
                if (queryString) {
                    apiUrl += `?${queryString}`;
                }
                // 调用后端 API POST /connections/:id/vnc-session (现在带有可选的 width/height 查询参数)
                const response = await apiClient.post<{ token: string }>(apiUrl);
                return response.data.token;
            } catch (err: any) {
                console.error(`获取 VNC 会话令牌失败 (连接 ID: ${connectionId}):`, err);
                // this.error = err.response?.data?.message || err.message || '获取 VNC 会话令牌时发生未知错误。';
                if (err.response?.status === 401) {
                    console.warn('未授权，需要登录才能获取 VNC 会话令牌。');
                }
                // 对于这种一次性获取数据的操作，错误通常由调用方处理并显示给用户
                throw err; // 重新抛出错误，让调用方处理
            } finally {
                // this.isLoading = false;
            }
        },
    },
});
