import { prefersChineseContent } from "./bilingual-content-locale";
import { INFOGRAPHIC_SAMPLES_JA } from "./infographic-samples.ja";
import { INFOGRAPHIC_SAMPLES_ZH_CN } from "./infographic-samples.zh-CN";

export type InfographicSampleCategory =
  | "sequence"
  | "compare"
  | "list"
  | "quadrant"
  | "hierarchy"
  | "relation"
  | "chart";

/** A bundled sample. English is the source; translations live in locale-suffixed sibling files. */
export type InfographicSample = {
  id: string;
  category: InfographicSampleCategory;
  template: string;
  title: string;
  desc: string;
  syntax: string;
};

export const INFOGRAPHIC_SAMPLE_CATEGORIES: Array<{
  id: InfographicSampleCategory;
  key: string;
  label: string;
}> = [
  { id: "sequence", key: "sequenceCategory", label: "Sequence" },
  { id: "compare", key: "comparisonCategory", label: "Comparison" },
  { id: "list", key: "listCategory", label: "List" },
  { id: "quadrant", key: "quadrantCategory", label: "Quadrant" },
  { id: "hierarchy", key: "hierarchyCategory", label: "Hierarchy" },
  { id: "relation", key: "relationCategory", label: "Relation" },
  { id: "chart", key: "chartCategory", label: "Chart" },
];

export const INFOGRAPHIC_SAMPLES: InfographicSample[] = [
  // 1. sequence
  {
    id: "sequence-steps",
    category: "sequence",
    template: "sequence-steps-simple",
    title: "Product Development Lifecycle",
    desc: "Standard agile workflow from discovery to deployment",
    syntax: `infographic sequence-steps-simple
data
  title Product Development Lifecycle
  desc Key stages from discovery to production launch
  sequences
    - label Discovery & Specs
      desc Gather user feedback and define key requirements
    - label UI & Prototype
      desc Design user flows and high-fidelity mockups
    - label Agile Sprint
      desc Full-stack engineering and feature implementation
    - label Quality Assurance
      desc Automated tests, regression audits, and performance checks
    - label Production Release
      desc Phased rollout and real-time observability`,
  },
  {
    id: "sequence-timeline",
    category: "sequence",
    template: "sequence-timeline-done-list",
    title: "Company Milestones Timeline",
    desc: "Key turning points from inception to scale",
    syntax: `infographic sequence-timeline-done-list
data
  title Company Milestones Timeline
  desc Key turning points from inception to scale
  sequences
    - label 2022 Founding
      desc Core team assembled and seed round completed
    - label 2023 Product 1.0
      desc Surpassed first 10,000 active users
    - label 2024 Monetization
      desc Enterprise collaboration launched with break-even revenue
    - label 2025 Global Expansion
      desc Multi-region compliance and localized deployments`,
  },
  {
    id: "sequence-roadmap",
    category: "sequence",
    template: "sequence-roadmap-vertical-simple",
    title: "Architecture Evolution Roadmap",
    desc: "Infrastructure modernization and cloud-native journey",
    syntax: `infographic sequence-roadmap-vertical-simple
data
  title Architecture Evolution Roadmap
  desc Infrastructure modernization and cloud-native journey
  sequences
    - label Phase 1: Modular Monolith
      desc Decouple core domain models and define clean contracts
    - label Phase 2: Containerization
      desc Adopt Kubernetes for declarative deployments and scaling
    - label Phase 3: Service Mesh
      desc Introduce Istio for traffic control and fine-grained telemetry
    - label Phase 4: AIOps Automation
      desc Autonomous anomaly detection and self-healing alerts`,
  },

  // 2. compare
  {
    id: "compare-vs",
    category: "compare",
    template: "compare-binary-horizontal-compact-card-vs",
    title: "Cloud-Native vs Traditional Hosting",
    desc: "Architectural agility and infrastructure cost trade-offs",
    syntax: `infographic compare-binary-horizontal-compact-card-vs
data
  title Cloud-Native vs Traditional Hosting
  desc Architectural agility and infrastructure cost trade-offs
  compares
    - label Traditional Dedicated Server
      desc Fixed on-premise hardware and manual maintenance
      children
        - label Scalability
          desc Provisioning new hardware takes weeks or months
        - label Resource Utilization
          desc Peak-provisioned servers sit idle most of the day
        - label Operational Overhead
          desc Manual patching and slower disaster recovery
    - label Cloud-Native Platform
      desc Containerized orchestration with on-demand autoscaling
      children
        - label Scalability
          desc Sub-second auto-scaling handles traffic spikes seamlessly
        - label Resource Utilization
          desc Dynamic multi-tenant scheduling cuts infrastructure cost 40%
        - label Operational Overhead
          desc Automated CI/CD pipelines and self-healing nodes`,
  },
  {
    id: "compare-swot",
    category: "compare",
    template: "compare-swot",
    title: "Strategic SWOT Analysis",
    desc: "Internal strengths/weaknesses and external market opportunities/threats",
    syntax: `infographic compare-swot
data
  title Strategic SWOT Analysis
  desc Internal strengths/weaknesses and external market environment
  compares
    - label Strengths
      children
        - label Proprietary Tech
          desc Industry-leading offline-first sync algorithms
        - label Rapid Execution
          desc Flat engineering team with bi-weekly stable releases
    - label Weaknesses
      children
        - label Brand Awareness
          desc Early stage market presence still expanding
        - label Mobile Parity
          desc Advanced cross-platform interactions still maturing
    - label Opportunities
      children
        - label Remote Collaboration
          desc Global demand for lightweight self-hosted knowledge bases
        - label AI Agent Ecosystem
          desc Model Context Protocol unlocks novel assistant workflows
    - label Threats
      children
        - label Incumbent Bundling
          desc Big-tech suites offering free bundled alternatives
        - label Compliance Complexity
          desc Stricter multi-region data residency and audits`,
  },
  {
    id: "compare-arrow",
    category: "compare",
    template: "compare-binary-horizontal-simple-arrow",
    title: "Engineering Workflow Evolution",
    desc: "Transition from manual operations to modern automated workflows",
    syntax: `infographic compare-binary-horizontal-simple-arrow
data
  title Engineering Workflow Evolution
  desc Transition from manual tasks to fully automated pipelines
  compares
    - label Legacy: Manual & Fragmented
      desc Ad-hoc scripts and tribal knowledge
      children
        - label Release Cadence
          desc Monthly batch releases with accumulated risk
        - label Quality Gate
          desc Manual QA passes with high escape rates
    - label Modern: Continuous & Automated
      desc Git push triggers end-to-end verification
      children
        - label Release Cadence
          desc Trunk-based development deployable anytime
        - label Quality Gate
          desc 90% test coverage with automated branch protection`,
  },

  // 3. list
  {
    id: "list-grid",
    category: "list",
    template: "list-grid-simple",
    title: "Team Collaboration Principles",
    desc: "Fostering a transparent, autonomous, and predictable culture",
    syntax: `infographic list-grid-simple
data
  title Team Collaboration Principles
  desc Fostering a transparent, autonomous, and predictable culture
  lists
    - label Async First
      desc Document decisions clearly to minimize disruptive meetings
    - label Docs as Code
      desc Core architecture and standards reviewed in Markdown
    - label Small Iterations
      desc Merge short-lived branches frequently to derisk integration
    - label Automated Verification
      desc Strict unit and integration gates catch regressions early
    - label Value Focused
      desc Prioritize user outcome and polish over bureaucracy`,
  },
  {
    id: "list-pyramid",
    category: "list",
    template: "list-pyramid-compact-card",
    title: "DIKW Knowledge Hierarchy",
    desc: "Cognitive progression from raw facts to actionable wisdom",
    syntax: `infographic list-pyramid-compact-card
data
  title DIKW Knowledge Hierarchy
  desc Cognitive progression from raw facts to actionable wisdom
  lists
    - label Wisdom
      desc Foresight, strategic clarity, and principled judgment
    - label Knowledge
      desc Contextual understanding, mental models, and expertise
    - label Information
      desc Structured, organized, and relational data points
    - label Data
      desc Objective facts, signals, and raw observations`,
  },

  // 4. quadrant
  {
    id: "quadrant-matrix",
    category: "quadrant",
    template: "compare-quadrant-quarter-simple-card",
    title: "Eisenhower Priority Matrix",
    desc: "Allocate focus and bandwidth by importance and urgency",
    syntax: `infographic compare-quadrant-quarter-simple-card
data
  title Eisenhower Priority Matrix
  desc Allocate focus and bandwidth by importance and urgency
  compares
    - label Q1: Urgent & Important
      desc Production crises, hard deadlines, and pressing issues
    - label Q2: Not Urgent but Important
      desc Strategic planning, refactoring, learning, and self-care
    - label Q3: Urgent but Not Important
      desc Unplanned interruptions, trivial requests, and busywork
    - label Q4: Not Urgent & Not Important
      desc Distractions, mindless browsing, and low-value tasks`,
  },

  // 5. hierarchy
  {
    id: "hierarchy-mindmap",
    category: "hierarchy",
    template: "hierarchy-mindmap-branch-gradient-lined-palette",
    title: "Modern Web Architecture",
    desc: "Core technical components of modern web applications",
    syntax: `infographic hierarchy-mindmap-branch-gradient-lined-palette
data
  title Modern Web Architecture
  desc Core technical components of modern web applications
  root
    label Full-Stack Stack
    children
      - label Frontend Layer
        desc React & Vite reactive interfaces
      - label Backend Services
        desc Hono on edge serverless runtime
      - label Storage Layer
        desc D1 SQLite & R2 object storage
      - label AI Synergy
        desc Model Context Protocol tools`,
  },

  // 6. relation
  {
    id: "relation-network",
    category: "relation",
    template: "relation-network-simple-circle-node",
    title: "Distributed Microservice Mesh",
    desc: "Invocations and data pipelines between core services",
    syntax: `infographic relation-network-simple-circle-node
data
  title Distributed Microservice Mesh
  desc Invocations and data pipelines between core services
  nodes
    - id gateway
      label API Gateway
      desc Ingress routing and TLS termination
    - id auth
      label Auth Service
      desc Token validation and RBAC enforcement
    - id note
      label Note Core
      desc Content revision engine and SQLite storage
    - id sync
      label Sync Engine
      desc Offline cursors and conflict resolution
  relations
    - from gateway
      to auth
    - from gateway
      to note
    - from note
      to sync`,
  },

  // 7. chart
  {
    id: "chart-donut",
    category: "chart",
    template: "chart-pie-donut-plain-text",
    title: "User Acquisition Breakdown",
    desc: "Share of new active users across primary channels",
    syntax: `infographic chart-pie-donut-plain-text
data
  title User Acquisition Breakdown
  desc Share of new active users across primary channels
  values
    - label Open Source Word-of-Mouth
      value 45
    - label Organic Search
      value 25
    - label Tech Blogs & Social
      value 18
    - label Developer Events
      value 12`,
  },
  {
    id: "chart-column",
    category: "chart",
    template: "chart-column-simple",
    title: "Quarterly Feature Delivery",
    desc: "Number of major customer-facing capabilities shipped",
    syntax: `infographic chart-column-simple
data
  title Quarterly Feature Delivery
  desc Number of major customer-facing capabilities shipped
  values
    - label Q1
      value 18
    - label Q2
      value 26
    - label Q3
      value 35
    - label Q4
      value 42`,
  },
];

export type InfographicSampleTranslation = {
  title?: string;
  desc?: string;
  syntax?: string;
};

const isLocale = (lang: string | undefined, prefix: string) => Boolean(lang && lang.toLowerCase().startsWith(prefix));

export function getSampleSyntax(sample: InfographicSample, lang?: string): string {
  return prefersChineseContent(lang) ? INFOGRAPHIC_SAMPLES_ZH_CN[sample.id]?.syntax ?? sample.syntax : sample.syntax;
}

export function getSampleTitle(sample: InfographicSample, lang?: string): string {
  if (isLocale(lang, "zh")) return INFOGRAPHIC_SAMPLES_ZH_CN[sample.id]?.title ?? sample.title;
  if (isLocale(lang, "ja")) return INFOGRAPHIC_SAMPLES_JA[sample.id]?.title ?? sample.title;
  return sample.title;
}

export function getSampleDesc(sample: InfographicSample, lang?: string): string {
  if (isLocale(lang, "zh")) return INFOGRAPHIC_SAMPLES_ZH_CN[sample.id]?.desc ?? sample.desc;
  if (isLocale(lang, "ja")) return INFOGRAPHIC_SAMPLES_JA[sample.id]?.desc ?? sample.desc;
  return sample.desc;
}
