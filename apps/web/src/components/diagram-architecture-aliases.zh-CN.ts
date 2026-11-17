/**
 * Simplified Chinese aliases that map a diagram node label to an architecture icon.
 * Each entry is a regular-expression fragment; the English patterns live in DiagramEditorPane.tsx.
 */
export const ARCHITECTURE_RESOURCE_ALIASES_ZH_CN: Record<string, string[]> = {
  gpu: ["显卡", String.raw`独立\s*gpu`, String.raw`gpu\s*核心`, "核显"],
  cpu: [String.raw`cpu\s*核心`, "中央处理器", "处理器"],
  memory: ["内存", "统一内存", "显存"],
  cache: ["缓存"],
  messageQueue: ["消息队列"],
  relationalDatabase: ["关系型数据库", "数据库"],
  vectorDatabase: ["向量"],
  apiGateway: ["网关", String.raw`api\s*网关`],
  loadBalancer: ["负载均衡"],
  container: ["容器"],
  largeLanguageModel: ["大模型", "语言模型"],
  aiAgent: ["智能体"],
  searchEngine: ["搜索"],
  serverless: ["函数"],
  monitoring: ["监控"],
  logging: ["日志"],
  tracing: ["链路追踪"],
  objectStorage: ["对象存储"],
  webApp: ["前端"],
  mobileApp: ["移动端"],
  service: ["服务", "后端"],
};
