# 打印任务批量测试工具 (Spooling Test)

## 项目简介

这是一个专为打印服务设计的自动化测试工具，主要用于评估打印系统在不同负载场景下的性能、稳定性和并发处理能力。该工具通过模拟真实的打印任务提交和状态监控流程，帮助运维人员和开发者深入了解打印服务的运行特性。

## 核心功能

### 🎯 双模式测试架构

该工具实现了两种截然不同的测试策略，分别针对不同的测试目标：

**模式1：固定数量任务测试（吞吐量测试）**
- **目标**：测试系统在处理固定数量任务时的可靠性和完成率
- **策略**：批量提交指定数量的打印任务，失败时自动重试
- **特点**：注重任务的最终完成率，适合测试系统的稳定性
- **应用场景**：验证系统在批量处理作业时的可靠性

**模式2：时间限制任务测试（并发压力测试）**  
- **目标**：测试系统在有限时间内的最大处理能力
- **策略**：在规定时间内不定时生成任务，失败不重试
- **特点**：注重系统的实时响应能力和峰值处理性能
- **应用场景**：评估系统在高并发场景下的表现

### 🔍 智能状态监控系统

工具实现了一套完整的任务状态追踪机制：

```javascript
// 核心监控逻辑
async pollJobStatuses(mode, endTime = null) {
    while (this.runningJobs.size > 0) {
        const jobsToCheck = Array.from(this.runningJobs.keys());
        console.log(`🔍 第${pollCount}次状态检查 - 检查${jobsToCheck.length}个任务: [${jobsToCheck.join(', ')}]`);
        
        for (const jobId of jobsToCheck) {
            const status = await this.getJobStatus(jobId);
            // 根据状态做相应处理：Completed, SubmitFailed, Waiting
        }
    }
}
```

**监控特性：**
- **实时状态展示**：每秒检查所有未完成任务的状态
- **详细进度跟踪**：显示每个job_id的当前状态（Waiting/Completed/SubmitFailed）
- **智能任务管理**：完成的任务自动从监控列表移除
- **失败处理策略**：模式1重试失败任务，模式2记录但不重试

### 📊 全面的性能统计

工具提供了丰富的测试结果分析：

```javascript
// 统计数据结构
stats: {
    mode1: {
        totalTasks: 0,      // 总任务数
        submittedTasks: 0,  // 成功提交任务数
        completedTasks: 0,  // 完成任务数
        failedTasks: 0,     // 失败任务数
        retryAttempts: 0,   // 重试次数
        startTime: null,
        endTime: null
    },
    mode2: { /* 类似结构 */ }
}
```

## 技术实现

### 🏗️ 架构设计

项目采用ES6模块化设计，主要包含以下核心组件：

**配置管理（config.js）**
```javascript
export const CONFIG = {
    BASE_URL: 'http://localhost:8080',
    FIXED_MODE: {
        TOTAL_TASKS: 10,
        MAX_RETRY_ATTEMPTS: 3,
        POLL_INTERVAL: 1000
    },
    TIME_BASED_MODE: {
        DURATION: 60000,
        MIN_INTERVAL: 500,
        MAX_INTERVAL: 3000
    }
};
```

**任务生成器**
```javascript
generateTaskData(index = 0) {
    const { PRIORITIES, COLORS, TEAM_NAMES } = CONFIG.TASK_CONFIG;
    return {
        priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
        team_name: TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)],
        file_content: `测试文件内容-${index}-${Date.now()}`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        problem_name: `测试问题-${index}-${Date.now()}`
    };
}
```

### 🔄 异步并发处理

工具采用Promise.all实现任务生成和状态监控的并发执行：

```javascript
// 时间模式下的并发处理
await Promise.all([
    generateTasks(),           // 任务生成协程
    this.pollJobStatuses('time', endTime)  // 状态监控协程
]);
```

### 🛡️ 错误处理与重试机制

**智能重试策略：**
- 模式1：失败任务自动重试，可配置最大重试次数
- 模式2：失败任务直接记录，不重试以模拟真实高负载场景
- 网络错误自动恢复：HTTP请求失败时提供详细错误信息

## API接口适配

工具适配标准的打印服务API：

**任务提交接口 (/print)**
```javascript
// 请求体
{
    "priority": 1,
    "team_name": "A队", 
    "file_content": "测试内容",
    "color": false,
    "problem_name": "测试问题"
}

// 响应体
{
    "data": {"job_id": 21},
    "message": "打印任务提交成功",
    "status": "success"
}
```

**状态查询接口 (/get_job_info)**
```javascript
// 请求体
{"id": 1}

// 响应体  
{
    "data": {
        "job_id": 1,
        "status": "Completed",  // Waiting, SubmitFailed, Completed
        "submit_time": "2025-06-19T04:52:40.624525600Z",
        // ...其他字段
    },
    "status": "success"
}
```

## 使用指南

### 📦 环境准备

```bash
# 安装依赖
pnpm install

# 确保后端服务运行在 http://localhost:8080
# 可在 config.js 中修改服务器地址
```

### 🚀 运行测试

**运行所有测试模式**
```bash
pnpm start
# 或
pnpm run test:both
node index.js both
```

**单独运行模式1（固定数量任务）**
```bash
pnpm run test:fixed
node index.js fixed
```

**单独运行模式2（时间限制任务）**
```bash
pnpm run test:time
node index.js time
```

### 📋 测试输出示例

**任务提交阶段：**
```
✓ 任务 1 提交成功 (job_id: 11)
✓ 任务 2 提交成功 (job_id: 12)
✓ 任务 3 提交成功 (job_id: 13)
```

**状态监控阶段：**
```
🔍 第1次状态检查 - 检查3个任务: [11, 12, 13]
📊 状态摘要: [job_id:11(Waiting), job_id:12(Waiting), job_id:13(Completed)]
进度: 1/3 已完成，剩余 2 个任务运行中
```

**最终统计报告：**
```
==================================================
模式1 测试结果统计
==================================================
总任务数: 10
成功提交: 10
完成任务: 10
失败任务: 0
重试次数: 0
运行时长: 52.78秒
成功率: 100.00%
平均完成时间: 5.28秒/任务
==================================================
```

## 配置参数说明

### 🔧 主要配置项

**服务器配置：**
- `BASE_URL`: 后端服务地址，默认 `http://localhost:8080`

**模式1配置（FIXED_MODE）：**
- `TOTAL_TASKS`: 总任务数量，默认10个
- `MAX_RETRY_ATTEMPTS`: 最大重试次数，默认3次  
- `RETRY_INTERVAL`: 重试间隔，默认2000毫秒
- `POLL_INTERVAL`: 状态轮询间隔，默认1000毫秒

**模式2配置（TIME_BASED_MODE）：**
- `DURATION`: 运行时长，默认60000毫秒（60秒）
- `MIN_INTERVAL`: 最小任务生成间隔，默认500毫秒
- `MAX_INTERVAL`: 最大任务生成间隔，默认3000毫秒

**任务配置（TASK_CONFIG）：**
- `PRIORITIES`: 优先级选项 `[1, 2, 3]`
- `COLORS`: 颜色选项 `[true, false]`  
- `TEAM_NAMES`: 队伍名称 `['A队', 'B队', 'C队', 'D队', 'E队']`

## 测试场景与最佳实践

### 🎯 典型测试场景

**1. 系统稳定性测试**
- 使用模式1，设置较大的任务数量（如100个）
- 配置适当的重试次数，观察系统处理批量任务的稳定性
- 关注失败率和重试成功率

**2. 并发性能测试**  
- 使用模式2，设置较短的任务生成间隔
- 观察系统在高频请求下的响应能力
- 分析任务完成率和响应时间

**3. 长时间压力测试**
- 使用模式2，设置较长的运行时间（如300秒）
- 监控系统在持续负载下的表现
- 检查是否存在内存泄漏或性能衰减

### 💡 配置建议

**轻量测试：**
```javascript
FIXED_MODE: { TOTAL_TASKS: 5, MAX_RETRY_ATTEMPTS: 2 }
TIME_BASED_MODE: { DURATION: 30000, MIN_INTERVAL: 1000 }
```

**标准测试：**
```javascript  
FIXED_MODE: { TOTAL_TASKS: 20, MAX_RETRY_ATTEMPTS: 3 }
TIME_BASED_MODE: { DURATION: 120000, MIN_INTERVAL: 500 }
```

**压力测试：**
```javascript
FIXED_MODE: { TOTAL_TASKS: 100, MAX_RETRY_ATTEMPTS: 5 }  
TIME_BASED_MODE: { DURATION: 300000, MIN_INTERVAL: 100 }
```

## 项目结构

```
spooling-test/
├── index.js          # 主程序文件，包含测试逻辑
├── config.js         # 配置文件  
├── package.json      # 项目依赖和脚本
├── pnpm-lock.yaml   # 依赖锁定文件
└── README.md        # 项目文档
```

## 技术栈

- **运行环境**: Node.js (ES6 Modules)
- **HTTP客户端**: Axios
- **包管理**: pnpm
- **编程范式**: 异步/await, Promise并发处理
- **架构模式**: 面向对象 + 函数式编程

## 扩展性设计

该工具设计时充分考虑了扩展性：

**1. 配置驱动**：所有参数都可通过配置文件调整，无需修改代码

**2. 模块化架构**：核心功能封装在独立的类和方法中，便于扩展

**3. API适配层**：HTTP请求逻辑与业务逻辑分离，便于适配不同的后端接口

**4. 插件化统计**：统计模块独立设计，可轻松添加新的性能指标

## 总结

这个打印任务批量测试工具为打印服务的性能评估提供了全面的解决方案。通过双模式测试策略、智能状态监控和详细的性能统计，运维人员可以深入了解系统在不同负载场景下的表现，为系统优化和容量规划提供数据支撑。

工具的设计注重实用性和可扩展性，既可以用于日常的功能验证，也能够支撑复杂的性能测试需求。其清晰的输出格式和丰富的配置选项，使得测试结果易于分析和比较。

在 `config.js` 中可以修改以下配置：

### 服务器配置
- `BASE_URL`: 后端服务地址

### 模式1配置
- `TOTAL_TASKS`: 总任务数量（默认100）
- `MAX_RETRY_ATTEMPTS`: 最大重试次数（默认3）
- `RETRY_INTERVAL`: 重试间隔毫秒数（默认2000ms）
- `POLL_INTERVAL`: 状态轮询间隔（默认1000ms）

### 模式2配置
- `DURATION`: 运行时长毫秒数（默认60000ms，即60秒）
- `MIN_INTERVAL`: 最小任务生成间隔（默认500ms）
- `MAX_INTERVAL`: 最大任务生成间隔（默认3000ms）
- `POLL_INTERVAL`: 状态轮询间隔（默认1000ms）

### 任务配置
- `PRIORITIES`: 可选的优先级数组
- `COLORS`: 可选的颜色设置
- `TEAM_NAMES`: 可选的队伍名称

## 测试结果

### 模式1统计指标
- 总任务数
- 成功提交数
- 完成任务数
- 失败任务数
- 重试次数
- 运行时长
- 成功率
- 平均完成时间

### 模式2统计指标
- 生成任务数
- 完成任务数
- 失败任务数
- 运行时长
- 完成率
- 任务生成速率
- 任务完成速率

## API接口说明

### 提交打印任务 POST /print
请求体：
```json
{
  "priority": 1,
  "team_name": "A队",
  "file_content": "111",
  "color": false
}
```

响应体：
```json
{
  "data": {
    "job_id": 21
  },
  "message": "打印任务提交成功",
  "status": "success"
}
```

### 查询任务状态 POST /get_job_info
请求体：
```json
{
  "id": 1
}
```

响应体：
```json
{
  "data": {
    "color": false,
    "end_print_time": "2025-06-19T04:52:40.824988700Z",
    "file_content": "...",
    "file_name": "Team_1_20250619_045240_1",
    "job_id": 1,
    "priority": 1,
    "start_print_time": "2025-06-19T04:52:40.730927900Z",
    "status": "Completed",
    "submit_time": "2025-06-19T04:52:40.624525600Z",
    "team_name": "Team_1"
  },
  "status": "success"
}
```

### 任务状态说明
- `Waiting`: 等待处理
- `Completed`: 已完成
- `SubmitFailed`: 提交失败

## 注意事项

1. 确保后端服务已启动并且可以访问
2. 根据服务器性能调整并发数量和轮询间隔
3. 模式1适合测试服务稳定性和重试机制
4. 模式2适合测试服务的峰值处理能力
5. 可以根据需要修改配置文件中的参数
