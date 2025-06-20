import axios from "axios";
import { CONFIG } from './config.js';

class PrintTaskTester {
    constructor() {
        this.stats = {
            mode1: {
                totalTasks: 0,
                submittedTasks: 0,
                completedTasks: 0,
                failedTasks: 0,
                retryAttempts: 0,
                startTime: null,
                endTime: null
            },
            mode2: {
                totalGenerated: 0,
                completedTasks: 0,
                failedTasks: 0,
                startTime: null,
                endTime: null
            }
        };
        this.runningJobs = new Map(); // job_id -> job info
    }

    // 生成随机任务数据
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

    // 提交打印任务
    async submitPrintTask(taskData, retryCount = 0) {
        try {
            const response = await axios.post(`${CONFIG.BASE_URL}/print`, taskData);
            if (response.data.status === 'success') {
                return {
                    success: true,
                    job_id: response.data.data.job_id,
                    retryCount
                };
            } else {
                throw new Error(`提交失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error(`任务提交失败 (重试次数: ${retryCount}):`, error.message);
            return {
                success: false,
                error: error.message,
                retryCount
            };
        }
    }

    // 查询任务状态
    async getJobStatus(jobId) {
        try {
            const response = await axios.post(`${CONFIG.BASE_URL}/get_job_info`, { id: jobId });
            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(`查询失败: ${response.data.message}`);
            }
        } catch (error) {
            console.error(`查询任务状态失败 (job_id: ${jobId}):`, error.message);
            return null;
        }
    }

    // 模式1：固定数量任务，失败重试
    async runFixedCountMode() {
        console.log('\n=== 开始模式1：固定数量任务测试 ===');
        console.log(`目标任务数: ${CONFIG.FIXED_MODE.TOTAL_TASKS}`);
        console.log(`最大重试次数: ${CONFIG.FIXED_MODE.MAX_RETRY_ATTEMPTS}`);
        
        const stats = this.stats.mode1;
        stats.startTime = new Date();
        stats.totalTasks = CONFIG.FIXED_MODE.TOTAL_TASKS;

        // 生成并提交所有任务
        for (let i = 0; i < CONFIG.FIXED_MODE.TOTAL_TASKS; i++) {
            const taskData = this.generateTaskData(i);
            let submitResult = null;
            let retryCount = 0;

            // 重试逻辑
            while (retryCount <= CONFIG.FIXED_MODE.MAX_RETRY_ATTEMPTS) {
                submitResult = await this.submitPrintTask(taskData, retryCount);
                stats.retryAttempts += retryCount;

                if (submitResult.success) {
                    stats.submittedTasks++;
                    this.runningJobs.set(submitResult.job_id, {
                        job_id: submitResult.job_id,
                        taskData,
                        submitTime: new Date(),
                        retryCount,
                        mode: 'fixed'
                    });
                    console.log(`✓ 任务 ${i + 1} 提交成功 (job_id: ${submitResult.job_id})`);
                    break;
                } else {
                    retryCount++;
                    if (retryCount <= CONFIG.FIXED_MODE.MAX_RETRY_ATTEMPTS) {
                        console.log(`⚠ 任务 ${i + 1} 提交失败，${CONFIG.FIXED_MODE.RETRY_INTERVAL}ms后重试...`);
                        await new Promise(resolve => setTimeout(resolve, CONFIG.FIXED_MODE.RETRY_INTERVAL));
                    } else {
                        console.log(`✗ 任务 ${i + 1} 最终提交失败`);
                        stats.failedTasks++;
                    }
                }
            }
        }

        // 开始轮询任务状态
        console.log('\n开始监控任务执行状态...');
        await this.pollJobStatuses('fixed');

        stats.endTime = new Date();
        this.printMode1Results();
    }

    // 模式2：规定时间内不定时生成任务
    async runTimeBasedMode() {
        console.log('\n=== 开始模式2：规定时间内任务测试 ===');
        console.log(`运行时长: ${CONFIG.TIME_BASED_MODE.DURATION / 1000}秒`);
        
        const stats = this.stats.mode2;
        stats.startTime = new Date();
        const endTime = Date.now() + CONFIG.TIME_BASED_MODE.DURATION;
        let taskIndex = 0;

        // 任务生成器
        const generateTasks = async () => {
            while (Date.now() < endTime) {
                const taskData = this.generateTaskData(taskIndex++);
                const submitResult = await this.submitPrintTask(taskData);
                
                stats.totalGenerated++;
                
                if (submitResult.success) {
                    this.runningJobs.set(submitResult.job_id, {
                        job_id: submitResult.job_id,
                        taskData,
                        submitTime: new Date(),
                        retryCount: 0,
                        mode: 'time'
                    });
                    console.log(`✓ 任务 ${taskIndex} 提交成功 (job_id: ${submitResult.job_id})`);
                } else {
                    console.log(`✗ 任务 ${taskIndex} 提交失败`);
                    stats.failedTasks++;
                }

                // 随机间隔时间
                const interval = Math.random() * 
                    (CONFIG.TIME_BASED_MODE.MAX_INTERVAL - CONFIG.TIME_BASED_MODE.MIN_INTERVAL) + 
                    CONFIG.TIME_BASED_MODE.MIN_INTERVAL;
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        };

        // 同时启动任务生成和状态轮询
        await Promise.all([
            generateTasks(),
            this.pollJobStatuses('time', endTime)
        ]);

        stats.endTime = new Date();
        this.printMode2Results();
    }

    // 轮询任务状态
    async pollJobStatuses(mode, endTime = null) {
        const pollInterval = mode === 'fixed' ? 
            CONFIG.FIXED_MODE.POLL_INTERVAL : 
            CONFIG.TIME_BASED_MODE.POLL_INTERVAL;

        let pollCount = 0;
        
        while (this.runningJobs.size > 0) {
            pollCount++;
            
            // 检查时间限制（仅在时间模式下）
            if (endTime && Date.now() > endTime) {
                console.log('\n⏰ 时间到，停止监控剩余任务');
                break;
            }

            const jobsToCheck = Array.from(this.runningJobs.keys());
            console.log(`\n🔍 第${pollCount}次状态检查 - 检查${jobsToCheck.length}个任务: [${jobsToCheck.join(', ')}]`);
            
            const statusResults = [];
            
            for (const jobId of jobsToCheck) {
                const jobInfo = this.runningJobs.get(jobId);
                const status = await this.getJobStatus(jobId);

                if (status) {
                    statusResults.push(`job_id:${jobId}(${status.status})`);
                    
                    switch (status.status) {
                        case 'Completed':
                            this.runningJobs.delete(jobId);
                            if (mode === 'fixed') {
                                this.stats.mode1.completedTasks++;
                            } else {
                                this.stats.mode2.completedTasks++;
                            }
                            console.log(`  ✅ 任务完成 (job_id: ${jobId})`);
                            break;
                            
                        case 'SubmitFailed':
                            if (mode === 'fixed') {
                                // 模式1需要重新提交
                                console.log(`  ⚠ 任务失败，重新提交 (job_id: ${jobId})`);
                                this.runningJobs.delete(jobId);
                                
                                const newResult = await this.submitPrintTask(jobInfo.taskData, jobInfo.retryCount + 1);
                                this.stats.mode1.retryAttempts++;
                                
                                if (newResult.success) {
                                    this.runningJobs.set(newResult.job_id, {
                                        ...jobInfo,
                                        job_id: newResult.job_id,
                                        retryCount: jobInfo.retryCount + 1
                                    });
                                } else {
                                    this.stats.mode1.failedTasks++;
                                }
                            } else {
                                // 模式2不重试，直接标记为失败
                                this.runningJobs.delete(jobId);
                                this.stats.mode2.failedTasks++;
                                console.log(`❌ 任务失败 (job_id: ${jobId})`);
                            }
                            break;
                            
                        case 'Waiting':
                            // 继续等待
                            break;
                            
                        default:
                            console.log(`  ⚡ 任务状态: ${status.status} (job_id: ${jobId})`);
                    }
                } else {
                    statusResults.push(`job_id:${jobId}(获取失败)`);
                }
            }
            
            // 显示本次检查的状态摘要
            console.log(`📊 状态摘要: [${statusResults.join(', ')}]`);
            const completedCount = mode === 'fixed' ? this.stats.mode1.completedTasks : this.stats.mode2.completedTasks;
            const totalTasks = mode === 'fixed' ? this.stats.mode1.totalTasks : this.stats.mode2.totalTasks;
            console.log(`进度: ${completedCount}/${totalTasks} 已完成，剩余 ${this.runningJobs.size} 个任务运行中`);

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    // 打印模式1结果
    printMode1Results() {
        const stats = this.stats.mode1;
        const duration = (stats.endTime - stats.startTime) / 1000;
        
        console.log('\n' + '='.repeat(50));
        console.log('模式1 测试结果统计');
        console.log('='.repeat(50));
        console.log(`总任务数: ${stats.totalTasks}`);
        console.log(`成功提交: ${stats.submittedTasks}`);
        console.log(`完成任务: ${stats.completedTasks}`);
        console.log(`失败任务: ${stats.failedTasks}`);
        console.log(`重试次数: ${stats.retryAttempts}`);
        console.log(`运行时长: ${duration.toFixed(2)}秒`);
        console.log(`成功率: ${((stats.completedTasks / stats.totalTasks) * 100).toFixed(2)}%`);
        console.log(`平均完成时间: ${(duration / stats.completedTasks).toFixed(2)}秒/任务`);
        console.log('='.repeat(50));
    }

    // 打印模式2结果
    printMode2Results() {
        const stats = this.stats.mode2;
        const duration = (stats.endTime - stats.startTime) / 1000;
        
        console.log('\n' + '='.repeat(50));
        console.log('模式2 测试结果统计');
        console.log('='.repeat(50));
        console.log(`生成任务数: ${stats.totalGenerated}`);
        console.log(`完成任务: ${stats.completedTasks}`);
        console.log(`失败任务: ${stats.failedTasks}`);
        console.log(`运行时长: ${duration.toFixed(2)}秒`);
        console.log(`完成率: ${((stats.completedTasks / stats.totalGenerated) * 100).toFixed(2)}%`);
        console.log(`任务生成速率: ${(stats.totalGenerated / duration).toFixed(2)}任务/秒`);
        console.log(`任务完成速率: ${(stats.completedTasks / duration).toFixed(2)}任务/秒`);
        console.log('='.repeat(50));
    }
}

// 主函数
async function main() {
    console.log('🚀 打印任务测试工具启动...');
    console.log(`📊 配置信息: 服务器地址 ${CONFIG.BASE_URL}`);
    
    const tester = new PrintTaskTester();
    
    // 获取命令行参数
    const mode = process.argv[2] || 'both';
    console.log(`🎯 运行模式: ${mode}`);
    
    try {
        switch (mode) {
            case '1':
            case 'fixed':
                console.log('🔧 开始执行模式1：固定数量任务测试');
                await tester.runFixedCountMode();
                break;
                
            case '2':
            case 'time':
                console.log('🔧 开始执行模式2：时间限制任务测试');
                await tester.runTimeBasedMode();
                break;
                
            case 'both':
            default:
                console.log('🔧 开始执行模式1：固定数量任务测试');
                await tester.runFixedCountMode();
                console.log('\n⏰ 等待2秒后开始模式2...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // 间隔2秒
                console.log('🔧 开始执行模式2：时间限制任务测试');
                await tester.runTimeBasedMode();
                break;
        }
        console.log('✅ 所有测试完成！');
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 运行主函数
main();