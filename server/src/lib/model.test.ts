import { describe, expect, it } from "vitest";
import {
  AUTO_MODEL_CONFIG,
  DEFAULT_MODEL,
  DISABLED_MODELS,
  getAvailableModels,
  getDefaultModel,
  isModelDisabled,
  MODEL_REGISTRY,
} from "./model.js";

describe("model registry and disabled models", () => {
  it("marks gemma4:31b, nemotron-3-super:cloud, and gpt-oss:20b as disabled", () => {
    expect(DISABLED_MODELS.has("gemma4:31b")).toBe(true);
    expect(DISABLED_MODELS.has("nemotron-3-super:cloud")).toBe(true);
    expect(DISABLED_MODELS.has("gpt-oss:20b")).toBe(true);

    expect(isModelDisabled("gemma4:31b")).toBe(true);
    expect(isModelDisabled("nemotron-3-super:cloud")).toBe(true);
    expect(isModelDisabled("gpt-oss:20b")).toBe(true);
  });

  it("does not mark active models as disabled", () => {
    expect(isModelDisabled("gemini-3.1-flash-lite")).toBe(false);
    expect(isModelDisabled("qwen/qwen3.8-27b")).toBe(false);
    expect(isModelDisabled("auto")).toBe(false);
    expect(isModelDisabled(null)).toBe(false);
    expect(isModelDisabled(undefined)).toBe(false);
  });

  it("registers gemini-3.1-flash-lite and removes gemini-2.5-flash from active registry", () => {
    expect(MODEL_REGISTRY["gemini-2.5-flash"]).toBeUndefined();

    const flashLite = MODEL_REGISTRY["gemini-3.1-flash-lite"];
    expect(flashLite).toBeDefined();
    expect(flashLite?.id).toBe("gemini-3.1-flash-lite");
    expect(flashLite?.modelName).toBe("gemini-3.1-flash-lite");
    expect(flashLite?.displayName).toBe("Gemini 3.1 Flash-Lite");
    expect(flashLite?.provider).toBe("google");
    expect(flashLite?.capabilities.vision).toBe(true);
    expect(flashLite?.capabilities.audio).toBe(true);
  });

  it("DEFAULT_MODEL is not one of the disabled models", () => {
    expect(isModelDisabled(DEFAULT_MODEL)).toBe(false);
    expect(DISABLED_MODELS.has(DEFAULT_MODEL)).toBe(false);
  });

  it("getDefaultModel() returns an active model configuration", () => {
    const defaultModel = getDefaultModel();
    expect(defaultModel).toBe(AUTO_MODEL_CONFIG.id);
    expect(isModelDisabled(defaultModel)).toBe(false);
  });

  it("getAvailableModels() does not return gemma, nemotron, or gpt-oss", () => {
    const available = getAvailableModels();
    expect(available.every((m) => m && typeof m.id === "string")).toBe(true);

    const availableIds = available.map((m) => m.id);

    expect(availableIds).not.toContain("gemma4:31b");
    expect(availableIds).not.toContain("nemotron-3-super:cloud");
    expect(availableIds).not.toContain("gpt-oss:20b");

    for (const model of available) {
      expect(isModelDisabled(model.id)).toBe(false);
    }
  });

  it("retains registry metadata for display purposes if past messages reference them", () => {
    expect(MODEL_REGISTRY["gemma4:31b"]?.displayName).toBe("Gemma 4 31B");
    expect(MODEL_REGISTRY["nemotron-3-super:cloud"]?.displayName).toBe("Nemotron 3 Super");
    expect(MODEL_REGISTRY["gpt-oss:20b"]?.displayName).toBe("GPT-OSS 20B");
  });
});
