import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMapView } from "./useMapView";
import { mapViewStorage } from "../utils/mapViewStorage";
import * as geolocation from "../utils/geolocation";
import { config } from "../config";

vi.mock("../utils/geolocation");

describe("useMapView", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization priority", () => {
    it("uses saved view when available (highest priority)", async () => {
      const savedView = {
        center: [-84.4801, 42.7325] as [number, number],
        zoom: 15,
      };
      mapViewStorage.setMapView(savedView);

      const { result } = renderHook(() => useMapView());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.initialView).toEqual(savedView);
      expect(geolocation.getUserLocation).not.toHaveBeenCalled();
    });

    it("uses geolocation when no saved view exists", async () => {
      vi.mocked(geolocation.getUserLocation).mockResolvedValue({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "browser",
      });

      const { result } = renderHook(() => useMapView());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.initialView).toEqual({
        center: [-79.0558, 35.9132],
        zoom: config.mapZoom,
      });
    });

    it("uses IP location when browser geolocation returns IP source", async () => {
      vi.mocked(geolocation.getUserLocation).mockResolvedValue({
        latitude: 35.9132,
        longitude: -79.0558,
        source: "ip",
      });

      const { result } = renderHook(() => useMapView());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.initialView).toEqual({
        center: [-79.0558, 35.9132],
        zoom: config.mapZoom,
      });
    });

    it("uses config default when geolocation fails", async () => {
      vi.mocked(geolocation.getUserLocation).mockResolvedValue(null);

      const { result } = renderHook(() => useMapView());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.initialView).toEqual({
        center: config.mapCenter,
        zoom: config.mapZoom,
      });
    });
  });

  describe("saveMapView", () => {
    it("debounces save calls", async () => {
      vi.useFakeTimers();
      vi.mocked(geolocation.getUserLocation).mockResolvedValue(null);

      const { result } = renderHook(() => useMapView());

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.saveMapView([-84.5, 42.8], 14);
      });

      expect(mapViewStorage.getMapView()).toBeNull();

      act(() => {
        result.current.saveMapView([-84.6, 42.9], 15);
      });

      expect(mapViewStorage.getMapView()).toBeNull();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      const saved = mapViewStorage.getMapView();
      expect(saved).toEqual({
        center: [-84.6, 42.9],
        zoom: 15,
      });
    });

    it("saves view after debounce delay", async () => {
      vi.useFakeTimers();
      vi.mocked(geolocation.getUserLocation).mockResolvedValue(null);

      const { result } = renderHook(() => useMapView());

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      act(() => {
        result.current.saveMapView([-79.0558, 35.9132], 16);
      });

      expect(mapViewStorage.getMapView()).toBeNull();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mapViewStorage.getMapView()).toEqual({
        center: [-79.0558, 35.9132],
        zoom: 16,
      });
    });
  });

  describe("loading state", () => {
    it("starts with isLoading true", () => {
      vi.mocked(geolocation.getUserLocation).mockImplementation(
        () => new Promise(() => {}),
      );

      const { result } = renderHook(() => useMapView());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.initialView).toBeNull();
    });

    it("sets isLoading false after loading saved view", async () => {
      mapViewStorage.setMapView({ center: [-84, 42], zoom: 13 });

      const { result } = renderHook(() => useMapView());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("sets isLoading false after geolocation completes", async () => {
      vi.mocked(geolocation.getUserLocation).mockResolvedValue({
        latitude: 42,
        longitude: -84,
        source: "browser",
      });

      const { result } = renderHook(() => useMapView());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
