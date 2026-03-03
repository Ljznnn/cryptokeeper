<div align="center">

# CryptoKeeper

**一款安全、便捷的本地密码管理工具**

[![License](https://img.shields.io/github/license/Ljznnn/cryptokeeper)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)]()
[![Version](https://img.shields.io/github/package-json/v/Ljznnn/cryptokeeper)]()

🔐 **安全加密** • 📱 **多平台支持** • 🌐 **离线使用** • 🎨 **简洁界面**

</div>

## 📋 项目简介

CryptoKeeper 是一款基于 Electron + Vue3 + TypeScript 开发的本地密码管理工具，专注于为用户提供安全可靠的密码存储和管理服务。

### 🔑 核心特性

- **企业级加密**：采用 AES-256-GCM 加密算法，确保密码数据绝对安全
- **本地存储**：所有数据存储在本地，无需网络连接，保护隐私安全
- **多空间管理**：支持创建多个工作空间，方便分类管理不同场景的密码
- **密码本系统**：灵活的密码本组织结构，便于分类存储各类账户信息
- **智能掩码**：密码显示采用智能掩码技术，既保护隐私又方便识别
- **跨平台支持**：支持 Windows、macOS、Linux 三大主流操作系统

## 🔐 安全机制

### 加密原理

```
主密码 → PBKDF2(SHA-256, 150,000次迭代) → 主密钥
                    ↓
               HKDF(SHA-256) → 专用加密密钥
                              ↓
                       AES-256-GCM
                              ↓
                        用户密码数据
```

### 安全特性

- ✅ **本地存储**：数据在本地加密，无云端存储
- ✅ **PBKDF2 增强**：主密码经过 15 万次迭代增强（防彩虹表攻击）
- ✅ **HKDF 标准密钥派生**：不同用途使用独立密钥，确保密钥隔离
- ✅ **防时序攻击**：采用恒定时间比较算法验证密码
- ✅ **智能密码强度检测**：引导用户创建高强度密码
- ✅ **防暴力破解**：递增锁定机制（5分钟→10分钟→30分钟）r

### 数据存储

- 采用本地 SQLite 数据库存储结构化数据

## 🚀 快速开始

### 环境要求

- Node.js 20+ (开发环境)

### 安装方式

#### 方式一：下载预编译版本（推荐）

访问 [Releases 页面](https://github.com/Ljznnn/cryptokeeper/releases) 下载对应平台的安装包：

- **Windows**: 下载 `.exe` 安装程序或便携版
- **macOS**: 下载 `.dmg` 镜像文件
- **Linux**: 下载 `.AppImage` 或 `.deb` 包

#### 方式二：源码构建

```bash
# 克隆项目
git clone https://github.com/Ljznnn/cryptokeeper.git
cd cryptokeeper

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## 📖 使用指南

### 首次使用

1. **设置主密码**
   - 首次启动时需要设置主密码
   - 主密码用于加密所有存储的数据
   - ⚠️ 请务必牢记主密码，丢失后无法恢复数据

2. **创建工作空间**
   - 点击右上角"创建工作间"按钮
   - 为不同的使用场景创建独立的工作空间
   - 例如：个人、工作等

3. **创建密码本**
   - 在左侧边栏点击"+"按钮创建密码本
   - 为不同类型的账户创建专门的密码本
   - 例如：社交账号、邮箱等

## 🛠 技术栈

### 前端技术

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 静态类型检查
- **Element Plus** - Vue 3 组件库
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Pinia** - Vue 状态管理
- **Vue Router** - 路由管理

### 后端技术

- **Electron** - 跨平台桌面应用框架
- **Node.js** - JavaScript 运行时
- **Better-SQLite3** - 高性能 SQLite 数据库
- **Crypto** - Node.js 内置加密模块

### 开发工具

- **Electron-Vite** - Electron 专用 Vite 插件
- **Electron Builder** - 应用打包工具

## 📸 界面预览

## 🤝 贡献指南

欢迎任何形式的贡献！

### 开发环境搭建

```bash
# Fork 项目并克隆
git clone https://github.com/Ljznnn/cryptokeeper.git
cd cryptokeeper

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目：

- [Electron](https://www.electronjs.org/)
- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/Ljznnn/cryptokeeper/issues)
- 发送邮件至：526461615@qq.com

---

<p align="center">Made with ❤️ by CryptoKeeper Team</p>
