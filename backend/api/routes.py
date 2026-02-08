from fastapi import APIRouter, HTTPException, Request
from .models import LocationResponse

router = APIRouter()


@router.get("/location", response_model=LocationResponse)
async def get_client_location(request: Request):
    from ..main import geoip_service
    import logging

    logger = logging.getLogger(__name__)

    if not geoip_service:
        raise HTTPException(status_code=503, detail="GeoIP service not available")

    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    forwarded_for = request.headers.get("X-Forwarded-For")

    client_ip: str | None
    if cf_connecting_ip:
        client_ip = cf_connecting_ip.strip()
        logger.info(
            f"CF-Connecting-IP header: {cf_connecting_ip}, using client IP: {client_ip}"
        )
    elif forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        logger.info(
            f"X-Forwarded-For header: {forwarded_for}, using client IP: {client_ip}"
        )
    else:
        client_ip = request.client.host if request.client else None
        logger.info(f"No proxy headers, using direct IP: {client_ip}")

    if not client_ip or client_ip in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=400, detail="Could not determine client IP")

    location = geoip_service.lookup_ip(client_ip)

    if not location:
        logger.warning(f"No location found for IP: {client_ip}")
        raise HTTPException(status_code=404, detail="Location not found for IP address")

    logger.info(
        f"IP {client_ip} resolved to: {location.get('city', 'Unknown')}, "
        f"{location.get('country', 'Unknown')} "
        f"({location['latitude']}, {location['longitude']})"
    )

    return LocationResponse(
        latitude=float(location["latitude"]),  # type: ignore[arg-type]
        longitude=float(location["longitude"]),  # type: ignore[arg-type]
    )
