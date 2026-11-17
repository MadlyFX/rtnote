import type { InfographicSampleTranslation } from "./infographic-samples";

/** Simplified Chinese variants of the bundled infographic samples, keyed by sample id. */
export const INFOGRAPHIC_SAMPLES_ZH_CN: Record<string, Required<InfographicSampleTranslation>> = {
  "sequence-steps": {
    title: "产品研发全周期流程",
    desc: "从需求分析到上线发布的标准敏捷研发流程",
    syntax: `infographic sequence-steps-simple
data
  title 产品研发全周期流程
  desc 从需求调研到交付上线的关键阶段
  sequences
    - label 需求分析
      desc 收集用户反馈与商业目标规划
    - label 原型设计
      desc 交互界面与用户体验方案输出
    - label 敏捷研发
      desc 前后端核心功能模块编码实现
    - label 质量验证
      desc 自动化测试与全链路回归演练
    - label 发布上线
      desc 灰度放量与生产环境监控护航`,
  },
  "sequence-timeline": {
    title: "企业发展关键里程碑",
    desc: "记录团队从创立到规模化的关键跃迁时刻",
    syntax: `infographic sequence-timeline-done-list
data
  title 企业发展关键里程碑
  desc 记录团队从创立到规模化的关键跃迁
  sequences
    - label 2022 年初创成立
      desc 核心创始团队组建，完成天使轮融资
    - label 2023 产品 1.0 发布
      desc 突破首批 10,000 名种子活跃用户
    - label 2024 商业化落地
      desc 上线企业级协同能力，实现自负盈亏
    - label 2025 全球化出海
      desc 布局多语言与跨国合规部署架构`,
  },
  "sequence-roadmap": {
    title: "技术架构演进路线图",
    desc: "基础设施升级与云原生转型的演进路径",
    syntax: `infographic sequence-roadmap-vertical-simple
data
  title 技术架构演进路线图
  desc 基础设施升级与云原生转型的演进路径
  sequences
    - label 阶段一：单体解耦
      desc 拆分核心数据模型，建立统一领域服务接口
    - label 阶段二：容器编排
      desc 全面接入 Kubernetes，实现声明式部署与调度
    - label 阶段三：服务网格
      desc 引入 Istio 网格，实现精细化流量治理与可观测性
    - label 阶段四：智能运维
      desc 结合大模型与日志度量，落地自愈式巡检告警`,
  },
  "compare-vs": {
    title: "云原生与传统部署对比",
    desc: "架构灵活性与运维成本的深度权衡分析",
    syntax: `infographic compare-binary-horizontal-compact-card-vs
data
  title 云原生与传统部署对比
  desc 架构灵活性与运维成本的全面权衡
  compares
    - label 传统物理部署
      desc 依赖固定机房资产与人工维护
      children
        - label 弹性扩展
          desc 扩容周期通常需要数周甚至数月
        - label 资源利用率
          desc 峰谷波动大，服务器平均闲置率高
        - label 运维复杂度
          desc 人工巡检部署，故障恢复时间较长
    - label 云原生架构
      desc 容器化编排与按需弹性扩缩容
      children
        - label 弹性扩展
          desc 秒级自动伸缩，轻松应对突发流量
        - label 资源利用率
          desc 多租户动态调度，整体成本优化 40%
        - label 运维复杂度
          desc CI/CD 自动化流水线与自愈式监控`,
  },
  "compare-swot": {
    title: "产品战略 SWOT 分析",
    desc: "全面审视内部优劣势与外部市场机遇威胁",
    syntax: `infographic compare-swot
data
  title 产品战略 SWOT 分析
  desc 全面审视内部优劣势与外部市场环境
  compares
    - label 优势 (Strengths)
      children
        - label 核心专利技术壁垒
          desc 拥有业内领先的离线协同与加密算法
        - label 敏捷响应能力
          desc 团队扁平，两周一次稳定迭代演进
    - label 劣势 (Weaknesses)
      children
        - label 品牌知名度有限
          desc 市场拓展初期，整体认知度仍在积累
        - label 移动端覆盖刚起步
          desc 部分跨平台高级交互仍在完善中
    - label 机会 (Opportunities)
      children
        - label 远程与混合办公普及
          desc 全球知识管理协同工具需求持续增长
        - label AI Agent 生态蓬勃
          desc 与大模型协同工作流带来全新爆发点
    - label 威胁 (Threats)
      children
        - label 头部大厂生态挤压
          desc 巨头免费捆绑分发带来的竞争压力
        - label 数据合规监管趋严
          desc 全球各地区合规成本与审查风险上升`,
  },
  "compare-arrow": {
    title: "工程体系重构演进",
    desc: "从传统手工操作升级为现代高度自动化流程",
    syntax: `infographic compare-binary-horizontal-simple-arrow
data
  title 工程体系重构演进
  desc 从传统手工操作升级为现代高度自动化流程
  compares
    - label 过去：手工碎片化
      desc 依赖人工执行脚本与零散文档传递
      children
        - label 交付节奏
          desc 每月一次集中发布，风险积聚
        - label 质量门槛
          desc 依赖人工点工测试，漏测率高
    - label 现在：持续自动化
      desc 代码提交即触发完整验证流水线
      children
        - label 交付节奏
          desc 每日主干集成，随时可发布生产
        - label 质量门槛
          desc 90% 自动化测试覆盖与分支保护`,
  },
  "list-grid": {
    title: "团队高效协同五大原则",
    desc: "打造透明、自驱、可预测的高效工程文化",
    syntax: `infographic list-grid-simple
data
  title 团队高效协同五大原则
  desc 打造透明、自驱、可预测的工程文化
  lists
    - label 异步优先
      desc 完整记录决策上下文，减少打断式即时会议
    - label 文档即代码
      desc 核心架构与规范以 Markdown 纳管审查
    - label 小步快跑
      desc 频繁合并短生命周期分支，降低集成风险
    - label 自动化验证
      desc 单元测试与端到端回归门禁拦截潜在缺陷
    - label 结果导向
      desc 聚焦交付价值与用户体验，避免形式主义`,
  },
  "list-pyramid": {
    title: "DIKW 知识层级金字塔",
    desc: "从原始事实到深刻见解的认知跃升模型",
    syntax: `infographic list-pyramid-compact-card
data
  title DIKW 知识层级金字塔
  desc 从原始事实到深刻见解的认知跃升模型
  lists
    - label 智慧 (Wisdom)
      desc 洞察未来趋势与深层本质的决策力
    - label 知识 (Knowledge)
      desc 经验积累、思维模型与实践方法论
    - label 信息 (Information)
      desc 结构化整理、具备上下文的数据集合
    - label 数据 (Data)
      desc 未经加工的原始事实与客观记录`,
  },
  "quadrant-matrix": {
    title: "时间管理四象限法则",
    desc: "按重要性与紧迫性科学分配精力与优先级",
    syntax: `infographic compare-quadrant-quarter-simple-card
data
  title 时间管理四象限法则
  desc 按重要性与紧急性科学规划工作重心
  compares
    - label 第一象限：重要且紧急
      desc 危机突发事件、紧急生产事故与临近截期的核心交付
    - label 第二象限：重要不紧急
      desc 长期战略规划、技术重构、深度学习与身心健康建设
    - label 第三象限：紧急不重要
      desc 突发临时打断、次要琐事与非必要的即时沟通
    - label 第四象限：不重要不紧急
      desc 无效社交闲聊、过度刷屏消遣与低价值重复劳动`,
  },
  "hierarchy-mindmap": {
    title: "现代 Web 全栈技术体系",
    desc: "现代化 Web 应用各层级核心组件与选型参考",
    syntax: `infographic hierarchy-mindmap-branch-gradient-lined-palette
data
  title 现代 Web 全栈技术体系
  desc 现代化 Web 应用各层级核心选型
  root
    label 全栈技术体系
    children
      - label 前端运行时
        desc React / Vite 响应式交互
      - label 服务端逻辑
        desc Hono / Cloudflare Workers
      - label 存储与缓存
        desc D1 SQLite / R2 对象存储
      - label 智能体协同
        desc Model Context Protocol`,
  },
  "relation-network": {
    title: "分布式服务拓扑网络",
    desc: "微服务间调用关系与数据流动链路可视化",
    syntax: `infographic relation-network-simple-circle-node
data
  title 分布式服务拓扑网络
  desc API 网关与后端核心微服务调用链路
  nodes
    - id gateway
      label 统一 API 网关
      desc 流量调度与鉴权中心
    - id auth
      label 统一认证服务
      desc JWT 校验与权限模型
    - id note
      label 笔记核心服务
      desc 内容版本控制与元数据
    - id sync
      label 同步引擎服务
      desc 离线游标与协同合并
  relations
    - from gateway
      to auth
    - from gateway
      to note
    - from note
      to sync`,
  },
  "chart-donut": {
    title: "产品用户来源构成占比",
    desc: "各渠道活跃新用户的占比构成分布",
    syntax: `infographic chart-pie-donut-plain-text
data
  title 产品用户来源构成占比
  desc 季度新增活跃用户的核心来源渠道构成
  values
    - label 开源社区口碑
      value 45
    - label 搜索引擎自然流量
      value 25
    - label 技术博客与媒体
      value 18
    - label 线下沙龙与推荐
      value 12`,
  },
  "chart-column": {
    title: "季度特性交付速率对比",
    desc: "近四个季度研发团队完成的核心特性数量",
    syntax: `infographic chart-column-simple
data
  title 季度特性交付速率对比
  desc 近四个季度研发团队交付的核心业务特性统计
  values
    - label Q1 季度
      value 18
    - label Q2 季度
      value 26
    - label Q3 季度
      value 35
    - label Q4 季度
      value 42`,
  },
};
