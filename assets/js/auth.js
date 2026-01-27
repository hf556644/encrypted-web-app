// 认证逻辑
class AuthSystem {
    constructor() {
        this.config = null;
        this.currentToken = this.getTokenFromURL();
        this.attempts = 0;
        this.maxAttempts = 3;
    }

    // 从URL获取token
    getTokenFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('token') || params.get('t');
    }

    // 加载配置
    async loadConfig() {
        try {
            const response = await fetch('config.json');
            this.config = await response.json();
            return true;
        } catch (error) {
            console.error('加载配置失败:', error);
            return false;
        }
    }

    // 验证token
    async validateToken() {
        if (!this.currentToken) {
            throw new Error('缺少访问令牌');
        }

        if (!await this.loadConfig()) {
            throw new Error('系统配置加载失败');
        }

        // 检查是否在有效期内
        const now = new Date();
        const expiry = new Date(this.config.tokenExpiry);
        
        if (now > expiry) {
            throw new Error('访问令牌已过期，请获取新二维码');
        }

        // 验证token是否匹配
        if (this.currentToken !== this.config.currentToken) {
            this.attempts++;
            if (this.attempts >= this.maxAttempts) {
                throw new Error('验证失败次数过多，请重新扫描二维码');
            }
            throw new Error(`无效的访问令牌 (尝试 ${this.attempts}/${this.maxAttempts})`);
        }

        return true;
    }

    // 更新页面信息
    updatePageInfo() {
        const expiry = new Date(this.config.tokenExpiry);
        document.getElementById('current-date').textContent = 
            new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        
        document.getElementById('expiry-date').textContent = 
            expiry.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        
        document.getElementById('token-month').textContent = 
            expiry.toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' });
    }

    // 主验证流程
    async authenticate() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const error = document.getElementById('error');

        try {
            await this.validateToken();
            
            // 验证成功
            loading.classList.add('hidden');
            this.updatePageInfo();
            content.classList.remove('hidden');
            
            // 记录访问日志
            this.logAccess();
            
        } catch (errorMsg) {
            // 验证失败
            loading.classList.add('hidden');
            document.getElementById('error-message').textContent = errorMsg;
            error.classList.remove('hidden');
            
            // 如果是无效token，清除URL中的token参数
            if (errorMsg.includes('无效的访问令牌') || errorMsg.includes('已过期')) {
                setTimeout(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }, 3000);
            }
        }
    }

    // 记录访问日志（示例，实际中可能需要后端支持）
    logAccess() {
        const log = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            token: this.currentToken.substring(0, 8) + '...', // 只记录部分token
            ip: '...' // 实际中需要通过后端获取
        };
        console.log('访问记录:', log);
    }
}

// 页面加载时启动验证
document.addEventListener('DOMContentLoaded', () => {
    const auth = new AuthSystem();
    auth.authenticate();
});