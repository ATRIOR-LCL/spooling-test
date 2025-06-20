// 配置文件
export const CONFIG = {
    // 服务器配置
    BASE_URL: 'http://localhost:8080',
    
    // 模式1：固定数量任务配置
    FIXED_MODE: {
        TOTAL_TASKS: 60,           // 总任务数量
        MAX_RETRY_ATTEMPTS: 3,      // 最大重试次数
        RETRY_INTERVAL: 2000,       // 重试间隔（毫秒）
        POLL_INTERVAL: 1000,        // 状态轮询间隔（毫秒）
    },
    
    // 模式2：规定时间内任务配置
    TIME_BASED_MODE: {
        DURATION: 60000,            // 运行时长（毫秒），60秒
        MIN_INTERVAL: 500,          // 最小任务生成间隔（毫秒）
        MAX_INTERVAL: 3000,         // 最大任务生成间隔（毫秒）
        POLL_INTERVAL: 1000,        // 状态轮询间隔（毫秒）
    },
    
    // 任务配置
    TASK_CONFIG: {
        PRIORITIES: [1, 2, 3],
        COLORS: [true, false],
        TEAM_NAMES: ['A队', 'B队', 'C队', 'D队', 'E队'],
    }
};
