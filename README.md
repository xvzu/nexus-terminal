![banner.png](https://lsky.tuyu.me/i/2025/04/30/681209e053db7.png)
---

<div align="center">

[![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/xvzu/nexus-terminal) [![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-4CAF50?style=flat-square)](https://github.com/xvzu/nexus-terminal/blob/main/LICENSE)
<br>
[中文](./README.md) | [English](./doc/README_EN.md)

</div>


## 📖 概述

**星枢终端（Nexus Terminal）** 是一款现代化、功能丰富的 Web SSH / RDP / VNC 客户端，致力于提供高度可定制的远程连接体验。提供独立的本地桌面端。

## ✨ 功能特性

*   多标签页管理 SSH 与 SFTP 连接  
*   支持 RDP/VNC 协议
*   支持 PWA
*   采用 Monaco Editor，支持在线编辑文件  
*   集成多重登录安全机制，包括人机验证（hCaptcha、Google reCAPTCHA）与双因素认证（2FA）  
*   高度可定制的界面主题与布局风格
*   内置简易 Docker 容器管理面板，便于容器运维  
*   支持 IP 白名单与黑名单，异常访问自动封禁  
*   通知系统（如登录提醒、异常告警）  
*   审计日志，全面记录用户行为与系统变更
*   基于 Node.js 的轻量级后端，资源占用低
*   内置心跳保活机制，确保连接稳定

## 📸 截图





|                            终端界面（Light）                            |
|:-------------------------------------------------------------:|
| ![workspace_light.png](https://lsky.tuyu.me/i/2025/04/30/68120a8dd0489.png) |

---

|                            终端界面（Dark）                            |
|:-------------------------------------------------------------:|
| ![workspace_darker.png](https://lsky.tuyu.me/i/2025/04/30/68120aa275a76.png) |

---

|                            移动端界面1                            |                            移动端界面2                            |
|:-------------------------------------------------------------:|:-------------------------------------------------------------:|
| ![1746339196937.png](https://lsky.tuyu.me/i/2025/05/04/6817056948ac2.png) |![1746339222136.png](https://lsky.tuyu.me/i/2025/05/04/681705820fe01.png) |

---


## 🚀 快速开始

部署共 7 步：克隆 → 环境变量 → IPv6（可选） → 反代 → 启动。

---

### 1️⃣ 克隆仓库

```bash
git clone https://github.com/xvzu/nexus-terminal.git
cd nexus-terminal

# 创建数据目录（存储数据库、会话文件等）
mkdir -p ./data
```

> **注意**：`data/` 目录用于持久化存储（SQLite 数据库、session 文件、自动生成的密钥等），请定期备份。

目录结构：
```
nexus-terminal/
├── docker-compose.yml       # 容器编排，已配置构建上下文和 IPv6 网络
├── .env                     # 环境变量配置
├── .env.example             # 环境变量示例（含注释说明）
├── data/                    # 数据持久化目录（数据库、密钥等）
├── scripts/
│   └── setup-docker-ipv6.sh # Docker IPv6 一键配置脚本
└── packages/
    ├── backend/             # Node.js 后端（SSH/SFTP/WebSocket）
    ├── frontend/            # Vue 前端 + 内部 nginx
    └── remote-gateway/      # RDP/VNC 网关
```

---

### 2️⃣ 配置环境变量

参考 `.env.example` 创建 `.env`（如已存在则跳过）：
```bash
cp -n .env.example .env
```

关键变量说明：

| 变量 | 是否必改 | 说明 |
|------|----------|------|
| `RP_ID` | 如需 Passkey 登录 | 你的域名，如 `example.com` |
| `RP_ORIGIN` | 如需 Passkey 登录 | 你的完整前端地址，如 `https://example.com` |

> 不需要 Passkey 时可以保持默认，不影响 SSH/SFTP/RDP 等核心功能。
>
> `ENCRYPTION_KEY` 和 `SESSION_SECRET` 会在首次启动时**自动生成**并保存到 `data/.env`，请备份该文件。

---

### 3️⃣ 配置 Docker IPv6（可选）

如果你需要通过容器 **连接 IPv6 服务器**（比如 SSH 到 IPv6 地址），才需要这一步。

只需要在每台机器上**执行一次**：
```bash
sudo ./scripts/setup-docker-ipv6.sh
```

脚本会自动完成：
- 创建 `/etc/docker/daemon.json`（启用 IPv6）
- 重启 Docker 守护进程
- 清除旧网络，让 compose 重建时带上 IPv6

> 不需要 IPv6 连接时，直接跳过此步。

---

### 6️⃣ 配置宿主机反代

nexus-terminal 的 frontend 容器监听宿主机 **18111** 端口。你需要用 nginx 或 caddy 反向代理到该端口。

#### nginx

在宿主机上新建配置文件（如 `/etc/nginx/sites-available/nexus-terminal.conf`）：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改为你的域名

    location / {
        proxy_pass http://127.0.0.1:18111;

        # WebSocket 支持（必需，否则终端无法连接）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_redirect off;
    }
}
```

启用并重载 nginx：
```bash
sudo ln -sf /etc/nginx/sites-available/nexus-terminal.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> **注意**：这是修改宿主机的 nginx 配置（`/etc/nginx/`），不是仓库里的文件。

#### Caddy

```caddyfile
your-domain.com {
    reverse_proxy 127.0.0.1:18111
}
```

---

### 7️⃣ 构建 & 启动

```bash
docker compose up -d
```

首次运行时会**自动构建镜像**（读取每个服务的 `build:` 配置，从源码编译），启动 4 个容器：

| 容器 | 说明 |
|------|------|
| `nexus-terminal-frontend` | 前端界面（nginx, 端口 18111） |
| `nexus-terminal-backend` | 后端服务（SSH/SFTP API, 端口 3001） |
| `nexus-terminal-remote-gateway` | RDP/VNC 网关 |
| `nexus-terminal-guacd` | Guacamole 代理 |

验证是否正常运行：
```bash
docker compose ps
# 所有容器应为 "Up" 状态
```

浏览器访问 `http://your-domain.com`，注册第一个账号即可使用。

> 首次注册的账号会自动成为管理员。

---

### 更新

```bash
cd nexus-terminal
git pull                          # 拉取最新代码
docker compose up -d --build      # 重新构建并启动（--build 强制重新编译）
```
## 📚 使用指南

### 挂起会话组件
你可以在 SSH 标签页中右键选择“挂起会话”（移动界面长按即可）。一旦挂起，即使网页断开连接，后端也会自动接管并保持 SSH 连接不中断。你可以随时通过面板组件重新恢复会话，整个过程确保编译、长任务等操作不会因网络波动等原因中断。

### 命令输入框组件

1.  **标签页切换**：当命令输入框获得焦点时，使用 `Alt + ↑/↓` 切换 SSH 会话标签页，使用 `Alt + ←/→` 切换文本编辑器标签页。
2.  **命令同步**（需在设置中开启）：开启后，在命令输入框中输入的文字将实时同步到选定的目标输入源。使用 `↑/↓` 键选择菜单命令项，然后按下 `Enter` 发送选中的指令。


### 文件管理器组件

1.  **文件快速选择**：在文件搜索框获得焦点时，可以使用 `↑/↓` 键快速选择文件。
2.  **拖拽上传**：支持从浏览器外部拖拽文件或文件夹进行上传。**注意：** 上传大量文件或深层文件夹时，建议先进行打包压缩，以避免浏览器卡死。
3.  **内部拖拽**：可以直接在文件管理器内部拖动文件或文件夹以进行移动。
4.  **多选操作**：按住 `Ctrl` 或 `Shift` 键可以选择多个文件或文件夹。
5.  **右键菜单**：提供复制、粘贴、剪切、删除、重命名、修改权限等常用文件操作。

### 终端组件
1.  Ctrl + Shift + C 复制，Ctrl + Shift + V 粘贴


### 历史命令组件

1.  **查看完整命令**：当历史命令过长被截断时，将鼠标悬停在命令上即可查看完整的指令内容。

### 通用操作

1.  **缩放**：在终端、文件管理器和文本编辑器组件和快捷指令视图中，可以使用 `Ctrl + 鼠标滚轮` 进行缩放。
2.  **侧栏**：展开的侧栏可以通过拖拽调节宽度。
3.  **标签栏**：对于ssh标签栏和文件管理器标签栏可以右键弹出菜单，内容项有：关闭，关闭左侧标签页，关闭其他标签页，关闭右侧标签页。
4.  **标签分组折叠栏** 可以直接点击视图里的标签名字修改标签名称
5.  **自动重连**：在连接断开状态下，可在命令输入框或终端中按回车，或点击连接列表中的同一 SSH 连接以触发自动重连。

### 其他
1. **移动端可以通过双指手势放大缩小终端字体**
2. 如需启用 Passkey 登录，请在 `.env` 文件中设置 `RP_ID` 和 `RP_ORIGIN` 环境变量。


## ⚠️ 注意事项

1.  **双文件管理器**：可以在布局中添加两个文件管理器组件（实验性功能，可能存在不稳定情况）。
2.  **多文本编辑器**：在同一布局中添加多个文本编辑器的功能尚未实现。
3. ARMv7 用户请使用此处的 [docker-compose.yml](https://github.com/xvzu/nexus-terminal/blob/main/doc/arm/docker-compose.yml)。由于 Apache Guacamole 未提供 guacd 的 ARMv7 架构镜像，所以禁用 RDP 功能，相关镜像暂时不再拉取。
4. 关于数据备份，请自行备份目录下的 data 文件夹，本项目不提供相关备份功能。
5. 由于浏览器限制，非https或者localhost无法复制终端内容，请使用https访问


## 💐 致谢

*   预设主题方案来源于优秀的 [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes) 项目。

## ☕ 捐赠

如果你觉得这个项目对你有帮助，欢迎通过以下方式请我喝杯咖啡：

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/0heavrnl)


## 📄 开源协议

本项目采用 [GPL-3.0](LICENSE) 开源协议，详细信息请参阅 [LICENSE](LICENSE) 文件。

