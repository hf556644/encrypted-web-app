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

    // 获取当前月份（两位数字，如01、02）
    getCurrentMonth() {
        const now = new Date();
        const month = now.getMonth() + 1;
        return month.toString().padStart(2, '0');
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

        // 获取当前月份
        const currentMonth = this.getCurrentMonth();
        
        // 检查当前月份是否有对应的令牌
        if (!this.config.tokens || !this.config.tokens[currentMonth]) {
            throw new Error('本月暂无有效访问令牌，请联系管理员');
        }

        // 验证token是否匹配
        const monthToken = this.config.tokens[currentMonth];
        
        if (this.currentToken !== monthToken) {
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
        if (!this.config) return;
        
        const currentMonth = this.getCurrentMonth();
        const expiry = new Date(new Date().getFullYear(), parseInt(currentMonth), 0); // 当月最后一天
        
        const currentDate = document.getElementById('current-date');
        const expiryDate = document.getElementById('expiry-date');
        const tokenMonth = document.getElementById('token-month');
        
        if (currentDate) {
            currentDate.textContent = new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        if (expiryDate) {
            expiryDate.textContent = expiry.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        if (tokenMonth) {
            tokenMonth.textContent = expiry.toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' });
        }
    }

    // 主验证流程
    async authenticate() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const error = document.getElementById('error');

        try {
            await this.validateToken();
            
            // 验证成功
            if (loading) loading.classList.add('hidden');
            this.updatePageInfo();
            if (content) content.classList.remove('hidden');
            
            // 记录访问日志
            this.logAccess();
            
        } catch (errorMsg) {
            // 验证失败
            if (loading) loading.classList.add('hidden');
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) errorMessage.textContent = errorMsg;
            if (error) error.classList.remove('hidden');
        }
    }

    // 记录访问日志
    logAccess() {
        const log = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            token: this.currentToken ? this.currentToken.substring(0, 8) + '...' : 'none',
            verified: true
        };
        console.log('访问记录:', log);
    }
}

// 页面加载时启动验证
document.addEventListener('DOMContentLoaded', () => {
    const auth = new AuthSystem();
    auth.authenticate();
});
