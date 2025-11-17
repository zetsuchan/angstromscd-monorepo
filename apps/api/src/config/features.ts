/**
 * Feature Flags for Modernization Migration (env-updates branch)
 *
 * Controls progressive rollout of:
 * - Effect.ts for error handling and dependency injection
 * - Vercel AI SDK for chat streaming
 * - Convex DB for real-time features
 */

export interface FeatureFlags {
  /**
   * Enable Effect.ts for new routes and services
   * - Typed error handling
   * - Service layers and dependency injection
   * - Resource management (NATS subscriptions, DB connections)
   */
  USE_EFFECT_TS: boolean;

  /**
   * Enable Vercel AI SDK for chat streaming
   * - streamText for chat responses
   * - Provider registry for multi-model support
   * - Works alongside BAML for structured extraction
   */
  USE_VERCEL_AI_SDK: boolean;

  /**
   * Enable Convex for real-time features (NON-PHI data only)
   * - Collaborative notes
   * - Chat messages (de-identified)
   * - Workspace presence
   * - VOE alerts/notifications
   *
   * ⚠️ CRITICAL: Do NOT migrate patient data (PHI) to Convex
   * Supabase remains source of truth for medical records
   */
  USE_CONVEX_FOR_REALTIME: boolean;

  /**
   * Enable dual-write mode for Convex migration
   * Writes to both Supabase and Convex for data consistency validation
   * - Verify data consistency
   * - Monitor performance
   * - Validate before full cutover
   */
  DUAL_WRITE_MODE: boolean;

  /**
   * Enable Effect.ts for specific routes
   * Allows granular rollout per endpoint
   */
  EFFECT_ROUTES: {
    CONVERSATIONS: boolean;
    STREAM: boolean;
    LITERATURE: boolean;
    CHAT: boolean;
  };

  /**
   * Enable Vercel AI SDK for specific AI operations
   * Allows granular testing of AI SDK features
   */
  AI_SDK_FEATURES: {
    STREAMING_CHAT: boolean;
    TOOL_CALLING: boolean;
    MULTI_MODAL: boolean;
  };

  /**
   * Enable Convex for specific features
   * Progressive rollout of real-time capabilities
   */
  CONVEX_FEATURES: {
    COLLABORATIVE_NOTES: boolean;
    CHAT_MESSAGES: boolean;
    WORKSPACE_PRESENCE: boolean;
    VOE_ALERTS: boolean;
  };

  /**
   * Development/debugging flags
   */
  DEBUG_EFFECT_TRACES: boolean;
  DEBUG_AI_PROMPTS: boolean;
  DEBUG_CONVEX_SYNC: boolean;
}

/**
 * Load feature flags from environment variables
 * Defaults to false for all features (safe rollout)
 */
export const FEATURES: FeatureFlags = {
  // Effect.ts
  USE_EFFECT_TS: process.env.USE_EFFECT === "true",

  // Vercel AI SDK
  USE_VERCEL_AI_SDK: process.env.USE_VERCEL_AI === "true",

  // Convex
  USE_CONVEX_FOR_REALTIME: process.env.USE_CONVEX_REALTIME === "true",
  DUAL_WRITE_MODE: process.env.DUAL_WRITE === "true",

  // Granular route flags
  EFFECT_ROUTES: {
    CONVERSATIONS: process.env.EFFECT_CONVERSATIONS === "true",
    STREAM: process.env.EFFECT_STREAM === "true",
    LITERATURE: process.env.EFFECT_LITERATURE === "true",
    CHAT: process.env.EFFECT_CHAT === "true",
  },

  // AI SDK feature flags
  AI_SDK_FEATURES: {
    STREAMING_CHAT: process.env.AI_SDK_STREAMING === "true",
    TOOL_CALLING: process.env.AI_SDK_TOOLS === "true",
    MULTI_MODAL: process.env.AI_SDK_MULTIMODAL === "true",
  },

  // Convex feature flags
  CONVEX_FEATURES: {
    COLLABORATIVE_NOTES: process.env.CONVEX_NOTES === "true",
    CHAT_MESSAGES: process.env.CONVEX_CHAT === "true",
    WORKSPACE_PRESENCE: process.env.CONVEX_PRESENCE === "true",
    VOE_ALERTS: process.env.CONVEX_ALERTS === "true",
  },

  // Debug flags
  DEBUG_EFFECT_TRACES: process.env.DEBUG_EFFECT === "true",
  DEBUG_AI_PROMPTS: process.env.DEBUG_AI === "true",
  DEBUG_CONVEX_SYNC: process.env.DEBUG_CONVEX === "true",
};

/**
 * Type-safe feature flag checker
 * Use this in routes to conditionally enable new implementations
 *
 * Example:
 * ```typescript
 * if (isFeatureEnabled('USE_EFFECT_TS')) {
 *   return await runEffectRoute(...)
 * } else {
 *   return await runLegacyRoute(...)
 * }
 * ```
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURES[feature] === true;
}

/**
 * Check if a specific route should use Effect.ts
 */
export function useEffectForRoute(route: keyof FeatureFlags["EFFECT_ROUTES"]): boolean {
  return FEATURES.USE_EFFECT_TS && FEATURES.EFFECT_ROUTES[route];
}

/**
 * Check if a specific AI SDK feature is enabled
 */
export function useAISDKFeature(feature: keyof FeatureFlags["AI_SDK_FEATURES"]): boolean {
  return FEATURES.USE_VERCEL_AI_SDK && FEATURES.AI_SDK_FEATURES[feature];
}

/**
 * Check if a specific Convex feature is enabled
 */
export function useConvexFeature(feature: keyof FeatureFlags["CONVEX_FEATURES"]): boolean {
  return FEATURES.USE_CONVEX_FOR_REALTIME && FEATURES.CONVEX_FEATURES[feature];
}

/**
 * Get all enabled features (for debugging/monitoring)
 */
export function getEnabledFeatures(): string[] {
  const enabled: string[] = [];

  // Top-level features
  if (FEATURES.USE_EFFECT_TS) enabled.push("Effect.ts");
  if (FEATURES.USE_VERCEL_AI_SDK) enabled.push("Vercel AI SDK");
  if (FEATURES.USE_CONVEX_FOR_REALTIME) enabled.push("Convex Realtime");
  if (FEATURES.DUAL_WRITE_MODE) enabled.push("Dual Write Mode");

  // Route-specific
  Object.entries(FEATURES.EFFECT_ROUTES).forEach(([route, enabled_flag]) => {
    if (enabled_flag) enabled.push(`Effect: ${route}`);
  });

  // AI SDK features
  Object.entries(FEATURES.AI_SDK_FEATURES).forEach(([feature, enabled_flag]) => {
    if (enabled_flag) enabled.push(`AI SDK: ${feature}`);
  });

  // Convex features
  Object.entries(FEATURES.CONVEX_FEATURES).forEach(([feature, enabled_flag]) => {
    if (enabled_flag) enabled.push(`Convex: ${feature}`);
  });

  return enabled;
}

/**
 * Log enabled features on server startup
 */
export function logFeatureFlags(): void {
  const enabled = getEnabledFeatures();

  console.log("\n🚀 Feature Flags (Modernization Migration):");
  console.log("============================================");

  if (enabled.length === 0) {
    console.log("  ⚠️  All features disabled (using legacy implementations)");
  } else {
    console.log(`  ✅ ${enabled.length} feature(s) enabled:`);
    enabled.forEach((feature) => console.log(`     - ${feature}`));
  }

  console.log("============================================\n");
}
