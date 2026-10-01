import type {PluginOptions} from 'sanity'

export interface OrbitLearningStudioOptions {
  /** Explicit public course origin; never the student's personal MCP endpoint. */
  courseOrigin?: string
  /** Mount the page's real WebMCP registry only while an Orbit learning tool is open. */
  webmcp?: boolean
}
export declare function orbitLearningStudio(options?: OrbitLearningStudioOptions): PluginOptions
