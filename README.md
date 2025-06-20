# 打印任务批量测试工具

这是一个用于测试打印服务性能和稳定性的工具，支持两种不同的测试模式。

## 功能特性

### 模式1：固定数量任务测试
- 生成固定数量的随机打印任务
- 失败时自动重试（可配置重试次数）
- 记录详细的发送次数和执行统计
- 持续监控直到所有任务完成或重试次数用尽

### 模式2：规定时间内任务测试
- 在规定时间内不定时生成随机任务
- 失败不重试，专注于测试峰值处理能力
- 记录在有限时间内能完成的任务数量
- 评估系统的实时处理性能

## 使用方法

### 安装依赖
```bash
pnpm install
```

### 运行测试

#### 运行所有测试模式
```bash
npm start
# 或
npm run test:both
```

#### 只运行模式1（固定数量任务）
```bash
npm run test:fixed
# 或
node index.js 1
```

#### 只运行模式2（规定时间任务）
```bash
npm run test:time
# 或
node index.js 2
```

## 配置说明

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
