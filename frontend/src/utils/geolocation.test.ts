import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUserLocation } from "./geolocation";

describe("getUserLocation", () => {
  let originalPermissions: typeof navigator.permissions | undefined;
  let originalGeolocation: typeof navigator.geolocation | undefined;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalPermissions = navigator.permissions;
    originalGeolocation = navigator.geolocation;
    originalFetch = global.fetch;
  });

  afterEach(() => {
    if (originalPermissions) {
      Object.defineProperty(navigator, "permissions", {
        value: originalPermissions,
        configurable: true,
      });
    } else {
      delete (navigator as { permissions?: unknown }).permissions;
    }

    if (originalGeolocation) {
      Object.defineProperty(navigator, "geolocation", {
        value: originalGeolocation,
        configurable: true,
      });
    }

    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  function mockPermissions(state: PermissionState) {
    const mockPermissions = {
      query: vi.fn().mockResolvedValue({ state }),
    };
    Object.defineProperty(navigator, "permissions", {
      value: mockPermissions,
      configurable: true,
    });
    return mockPermissions;
  }

  function mockGeolocationSuccess(coords: {
    latitude: number;
    longitude: number;
  }) {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({ coords });
      }),
    };
    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
    });
    return mockGeolocation;
  }

  function mockGeolocationError() {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) => {
        error(new Error("Position unavailable"));
      }),
    };
    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
    });
    return mockGeolocation;
  }

  function mockGeolocationTimeout() {
    const mockGeolocation = {
      getCurrentPosition: vi.fn(),
    };
    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
    });
    return mockGeolocation;
  }

  function mockIpLocation(coords: { latitude: number; longitude: number }) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => coords,
    });
  }

  function removePermissionsApi() {
    delete (navigator as { permissions?: unknown }).permissions;
  }

  describe("when Permissions API is not supported", () => {
    it("falls back to IP location", async () => {
      removePermissionsApi();
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      const result = await getUserLocation();

      expect(result).toEqual({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });
      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });
  });

  describe("when permission is granted", () => {
    it("uses browser geolocation on success", async () => {
      const permissions = mockPermissions("granted");
      const geolocation = mockGeolocationSuccess({
        latitude: 42.7325,
        longitude: -84.4801,
      });

      const result = await getUserLocation();

      expect(result).toEqual({
        latitude: 42.7325,
        longitude: -84.4801,
        source: "browser",
      });
      expect(permissions.query).toHaveBeenCalledWith({
        name: "geolocation",
      });
      expect(geolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it("falls back to IP when browser geolocation times out", async () => {
      mockPermissions("granted");
      mockGeolocationTimeout();
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      const result = await getUserLocation({ timeout: 100 });

      expect(result).toEqual({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });
      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });

    it("falls back to IP when browser geolocation errors", async () => {
      mockPermissions("granted");
      mockGeolocationError();
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      const result = await getUserLocation();

      expect(result).toEqual({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });
      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });
  });

  describe("when permission is denied", () => {
    it("uses IP location", async () => {
      mockPermissions("denied");
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      const result = await getUserLocation();

      expect(result).toEqual({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });
      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });
  });

  describe("when permission is prompt", () => {
    it("uses IP location without prompting", async () => {
      mockPermissions("prompt");
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      const result = await getUserLocation();

      expect(result).toEqual({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });
      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });
  });

  describe("when permission query throws", () => {
    it("falls back to IP location", async () => {
      const mockPermissions = {
        query: vi.fn().mockRejectedValue(new Error("Permission query failed")),
      };
      Object.defineProperty(navigator, "permissions", {
        value: mockPermissions,
        configurable: true,
      });
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      const result = await getUserLocation();

      expect(result).toEqual({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });
      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });
  });

  describe("IP location fallback", () => {
    beforeEach(() => {
      removePermissionsApi();
    });

    it("returns null when IP location fetch fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const result = await getUserLocation();

      expect(result).toBeNull();
    });

    it("returns null when IP location fetch throws", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await getUserLocation();

      expect(result).toBeNull();
    });

    it("returns null when IP location response is invalid JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const result = await getUserLocation();

      expect(result).toBeNull();
    });

    it("returns null when IP location response has invalid coordinates", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ latitude: "invalid", longitude: -79.0558 }),
      });

      const result = await getUserLocation();

      expect(result).toBeNull();
    });

    it("returns null when IP location response has out-of-range latitude", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ latitude: 95, longitude: -79.0558 }),
      });

      const result = await getUserLocation();

      expect(result).toBeNull();
    });

    it("returns null when IP location response has out-of-range longitude", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ latitude: 35.9132, longitude: 200 }),
      });

      const result = await getUserLocation();

      expect(result).toBeNull();
    });
  });

  describe("options", () => {
    it("uses custom timeout for browser geolocation", async () => {
      mockPermissions("granted");
      const geolocation = mockGeolocationTimeout();
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      await getUserLocation({ timeout: 50 });

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(geolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: false,
        }),
      );
    });

    it("uses custom API endpoint for IP location", async () => {
      removePermissionsApi();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ latitude: 35.9132, longitude: -79.0558 }),
      });

      await getUserLocation({ apiEndpoint: "custom/endpoint" });

      expect(global.fetch).toHaveBeenCalledWith("custom/endpoint");
    });

    it("uses default values when no options provided", async () => {
      removePermissionsApi();
      mockIpLocation({ latitude: 35.9132, longitude: -79.0558 });

      await getUserLocation();

      expect(global.fetch).toHaveBeenCalledWith("api/v1/location");
    });
  });
});
