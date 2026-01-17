export interface GeolocationResult {
  latitude: number;
  longitude: number;
  source: "browser" | "ip";
}

export interface GeolocationOptions {
  timeout?: number;
  apiEndpoint?: string;
}

export async function getUserLocation(
  options?: GeolocationOptions,
): Promise<GeolocationResult | null> {
  const timeout = options?.timeout ?? 5000;
  const apiEndpoint = options?.apiEndpoint ?? "api/v1/location";

  console.log("[Geolocation] Starting location lookup...");

  if (!("permissions" in navigator)) {
    console.log(
      "[Geolocation] Permissions API not supported, using IP location",
    );
    return await getIpLocation(apiEndpoint);
  }

  try {
    const permissionStatus = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });

    console.log(`[Geolocation] Permission status: ${permissionStatus.state}`);

    if (permissionStatus.state === "granted") {
      console.log(
        `[Geolocation] Attempting browser geolocation (${timeout}ms timeout)...`,
      );
      const browserLocation = await getBrowserLocation(timeout);
      if (browserLocation) {
        return browserLocation;
      }
      console.log(
        "[Geolocation] Browser geolocation failed or timed out, falling back to IP",
      );
    } else {
      console.log(
        `[Geolocation] Permission not granted (${permissionStatus.state}), using IP location`,
      );
    }
  } catch {
    console.log(
      "[Geolocation] Permissions API query failed, falling back to IP",
    );
  }

  return await getIpLocation(apiEndpoint);
}

async function getBrowserLocation(
  timeout: number,
): Promise<GeolocationResult | null> {
  if (!("geolocation" in navigator)) {
    console.log("[Geolocation] Geolocation API not available");
    return null;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.log("[Geolocation] Browser geolocation timed out");
      resolve(null);
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const result = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "browser" as const,
        };
        console.log(
          `[Geolocation] ✓ Browser location obtained: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
        );
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.log(
          `[Geolocation] Browser geolocation error: ${error.message}`,
        );
        resolve(null);
      },
      {
        enableHighAccuracy: false,
      },
    );
  });
}

async function getIpLocation(
  endpoint: string,
): Promise<GeolocationResult | null> {
  try {
    console.log(`[Geolocation] Fetching IP-based location from ${endpoint}...`);
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.log(
        `[Geolocation] IP location API failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    if (
      typeof data.latitude !== "number" ||
      typeof data.longitude !== "number" ||
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      console.log("[Geolocation] IP location response has invalid coordinates");
      return null;
    }

    const result = {
      latitude: data.latitude,
      longitude: data.longitude,
      source: "ip" as const,
    };
    console.log(
      `[Geolocation] ✓ IP location obtained: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
    );
    return result;
  } catch (error) {
    console.log(`[Geolocation] IP location fetch error: ${error}`);
    return null;
  }
}
