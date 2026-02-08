import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App, { AppContent } from "./App";
import * as apiClient from "./api/client";
import * as authContext from "./contexts/AuthContext";
import type { Track } from "./types/track";
import { version } from "../package.json";

vi.mock("./api/client");
vi.mock("./hooks/useViewportGeometries", () => ({
  useViewportGeometries: vi.fn(() => ({
    geometries: [],
    isLoading: false,
    loadingCount: 0,
    error: null,
    onViewportChange: vi.fn(),
    retryFetch: vi.fn(),
  })),
}));
vi.mock("./components/Map", () => ({
  Map: vi.fn(({ onMapReady }) => {
    const mockZoomToBounds = vi.fn();
    if (onMapReady) {
      onMapReady(mockZoomToBounds);
    }
    return <div data-testid="mock-map">Map</div>;
  }),
}));

const mockMaps = [
  {
    id: 1,
    user_id: "1",
    name: "Default Map",

    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

describe("App - Zoom to Track Feature", () => {
  let queryClient: QueryClient;

  afterEach(() => {
    localStorage.clear();
  });

  const mockTrackWithBounds: Track = {
    id: 1,
    user_id: "1",
    map_id: 1,
    hash: "abc123",
    name: "Track with Bounds",
    filename: "track1.gpx",
    creator: null,
    activity_type: "Cycling",
    activity_date: "2025-01-01T10:00:00Z",
    uploaded_at: "2025-01-01T10:05:00Z",
    distance_meters: 5000,
    duration_seconds: 1800,
    avg_speed_ms: 2.78,
    max_speed_ms: 5.0,
    min_speed_ms: 1.0,
    elevation_gain_meters: 100,
    elevation_loss_meters: 95,
    bounds_min_lat: 35.9,
    bounds_min_lon: -79.1,
    bounds_max_lat: 35.95,
    bounds_max_lon: -79.05,
    visible: true,
    created_at: "2025-01-01T10:05:00Z",
    updated_at: "2025-01-01T10:05:00Z",
  };

  const mockTrackWithNullBounds: Track = {
    ...mockTrackWithBounds,
    id: 2,
    name: "Track without Bounds",
    bounds_min_lat: null,
    bounds_min_lon: null,
    bounds_max_lat: null,
    bounds_max_lon: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(apiClient.listMaps).mockResolvedValue(mockMaps);
    vi.mocked(apiClient.listTracks).mockResolvedValue([
      mockTrackWithBounds,
      mockTrackWithNullBounds,
    ]);

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "1", email: "test@example.com" },
      accessToken: "mock-token",
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("renders the app with track list", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Track with Bounds")).toBeInTheDocument();
    });
  });

  it("handles tracks with null bounds gracefully", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Track without Bounds")).toBeInTheDocument();
    });
  });
});

describe("App - Logout Functionality", () => {
  let queryClient: QueryClient;
  let mockLogout: ReturnType<typeof vi.fn>;

  afterEach(() => {
    localStorage.clear();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockLogout = vi.fn();

    vi.mocked(apiClient.listMaps).mockResolvedValue(mockMaps);
    vi.mocked(apiClient.listTracks).mockResolvedValue([]);

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "1", email: "test@example.com" },
      accessToken: "mock-token",
      login: vi.fn(),
      logout: mockLogout,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("clears query cache and geometry cache when logout button is clicked", async () => {
    const { geometryCache } = await import("./utils/geometryCache");
    const user = userEvent.setup();
    const clearSpy = vi.spyOn(queryClient, "clear");
    const clearCacheSpy = vi.spyOn(geometryCache, "clearCache");

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Logout"));

    expect(clearSpy).toHaveBeenCalledOnce();
    expect(clearCacheSpy).toHaveBeenCalledOnce();
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("does not display tracks when not authenticated", () => {
    const mockTrack1: Track = {
      id: 1,
      user_id: "1",
      map_id: 1,
      hash: "hash1",
      name: "Test Track 1",
      filename: "track1.gpx",
      creator: null,
      activity_type: "Walking",
      activity_date: "2025-01-01T10:00:00Z",
      uploaded_at: "2025-01-01T10:05:00Z",
      distance_meters: 1000,
      duration_seconds: 600,
      avg_speed_ms: 1.67,
      max_speed_ms: 2.0,
      min_speed_ms: 1.0,
      elevation_gain_meters: 10,
      elevation_loss_meters: 5,
      bounds_min_lat: 35.9,
      bounds_min_lon: -79.1,
      bounds_max_lat: 35.91,
      bounds_max_lon: -79.09,
      visible: true,
      created_at: "2025-01-01T10:05:00Z",
      updated_at: "2025-01-01T10:05:00Z",
    };

    const mockTrack2: Track = {
      ...mockTrack1,
      id: 2,
      hash: "hash2",
      name: "Test Track 2",
    };

    queryClient.setQueryData(["tracks", 1], [mockTrack1, mockTrack2]);

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: null,
      accessToken: null,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    expect(screen.getByText("0 Tracks")).toBeInTheDocument();
    expect(screen.queryByText("Test Track 1")).not.toBeInTheDocument();
  });
});

describe("App - Version Display", () => {
  let queryClient: QueryClient;

  afterEach(() => {
    localStorage.clear();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(apiClient.listMaps).mockResolvedValue(mockMaps);
    vi.mocked(apiClient.listTracks).mockResolvedValue([]);

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "1", email: "test@example.com" },
      accessToken: "mock-token",
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("displays version number from package.json", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    const versionElement = screen.getByText(`v${version}`);
    expect(versionElement).toBeInTheDocument();
  });

  it("version matches the package.json version format", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    const versionElement = screen.getByText(/^v\d+\.\d+\.\d+$/);
    expect(versionElement).toBeInTheDocument();
    expect(versionElement.textContent).toBe(`v${version}`);
  });

  it("version element has correct CSS class", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    const versionElement = screen.getByText(`v${version}`);
    expect(versionElement).toHaveClass("version-display");
  });
});

describe("App - Map Selection Persistence", () => {
  let queryClient: QueryClient;

  const multipleMaps = [
    {
      id: 1,
      user_id: "1",
      name: "Default Map",

      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: 2,
      user_id: "1",
      name: "Second Map",

      created_at: "2025-01-02T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    },
  ];

  afterEach(() => {
    localStorage.clear();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(apiClient.listTracks).mockResolvedValue([]);

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "1", email: "test@example.com" },
      accessToken: "mock-token",
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("restores previously selected map from localStorage", async () => {
    localStorage.setItem("selected_map_id", "2");
    vi.mocked(apiClient.listMaps).mockResolvedValue(multipleMaps);

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("2");
    });
  });

  it("falls back to default map when stored map ID no longer exists", async () => {
    localStorage.setItem("selected_map_id", "999");
    vi.mocked(apiClient.listMaps).mockResolvedValue(multipleMaps);

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("1");
    });
  });

  it("saves selected map ID to localStorage when map changes", async () => {
    vi.mocked(apiClient.listMaps).mockResolvedValue(multipleMaps);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeEnabled();
    });

    await user.selectOptions(screen.getByRole("combobox"), "2");

    expect(localStorage.getItem("selected_map_id")).toBe("2");
  });

  it("clears stored map ID on logout", async () => {
    localStorage.setItem("selected_map_id", "2");
    vi.mocked(apiClient.listMaps).mockResolvedValue(multipleMaps);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Logout"));

    expect(localStorage.getItem("selected_map_id")).toBeNull();
  });
});
